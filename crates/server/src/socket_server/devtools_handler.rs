// DevTools connection handler / DevTools 연결 핸들러
use super::message::CDPMessage;
use super::{Client, DevTools};
use crate::logging::{LogType, Logger};
use crate::react_native::ReactNativeInspectorConnectionManager;
use axum::extract::ws::{Message, WebSocket};
use futures_util::{SinkExt, StreamExt};
use std::sync::Arc;
use tokio::sync::mpsc;
use tokio::sync::RwLock;

/// Handle DevTools WebSocket connection / DevTools WebSocket 연결 처리
#[allow(clippy::too_many_arguments)]
pub async fn handle_devtools_connection(
    ws: WebSocket,
    id: String,
    client_id: Option<String>,
    clients: Arc<RwLock<std::collections::HashMap<String, Arc<Client>>>>,
    devtools: Arc<RwLock<std::collections::HashMap<String, Arc<DevTools>>>>,
    rn_manager: Arc<ReactNativeInspectorConnectionManager>,
    socket_server: Arc<RwLock<super::SocketServer>>,
    logger: Arc<Logger>,
) {
    logger.log(
        LogType::DevTools,
        &id,
        &format!(
            "connected{}",
            client_id
                .as_ref()
                .map(|cid| format!(" to client {}", cid))
                .unwrap_or_default()
        ),
        None,
        None,
    );

    let (mut sender, mut receiver) = ws.split();
    let (tx, mut rx) = mpsc::unbounded_channel::<String>();

    let devtool = Arc::new(DevTools {
        id: id.clone(),
        client_id: client_id.clone(),
        sender: tx.clone(),
    });

    {
        let mut devtools = devtools.write().await;
        devtools.insert(id.clone(), devtool.clone());
    }

    // Auto-send Runtime.executionContextCreated for Reactotron clients / Reactotron 클라이언트에 대해 Runtime.executionContextCreated 자동 전송
    // This is needed for DevTools to enable console / 이것은 DevTools가 콘솔을 활성화하는 데 필요합니다
    if let Some(client_id) = &client_id {
        let clients = clients.read().await;
        if let Some(client) = clients.get(client_id) {
            let client_url = client.url.clone();
            let is_reactotron = client_url
                .as_ref()
                .map(|url| url.starts_with("reactotron://"))
                .unwrap_or(false);

            logger.log(
                LogType::DevTools,
                &id,
                &format!(
                    "🔍 DevTools connected to client {}: is_reactotron={}, url={:?}",
                    client_id, is_reactotron, client_url
                ),
                Some(&serde_json::json!({
                    "clientId": client_id,
                    "isReactotron": is_reactotron,
                    "url": client_url,
                })),
                Some("devtools_connected"),
            );

            drop(clients);

            if is_reactotron {
                let tx_clone = tx.clone();
                let devtools_id = id.clone();
                let logger_clone = logger.clone();

                tokio::spawn(async move {
                    // Wait for DevTools to be ready / DevTools가 준비될 때까지 대기
                    tokio::time::sleep(tokio::time::Duration::from_millis(300)).await;

                    // Send Runtime.executionContextCreated event / Runtime.executionContextCreated 이벤트 전송
                    let execution_context_event = serde_json::json!({
                        "method": "Runtime.executionContextCreated",
                        "params": {
                            "context": {
                                "id": 1,
                                "uniqueId": "1",
                                "origin": "reactotron://",
                                "name": "Reactotron",
                                "auxData": {
                                    "isDefault": true
                                }
                            }
                        }
                    });

                    if let Ok(event_str) = serde_json::to_string(&execution_context_event) {
                        if let Err(e) = tx_clone.send(event_str) {
                            logger_clone.log_error(
                                LogType::DevTools,
                                &devtools_id,
                                "failed to send Runtime.executionContextCreated",
                                Some(&e.to_string()),
                            );
                        } else {
                            logger_clone.log(
                                LogType::DevTools,
                                &devtools_id,
                                "✅ Auto-sent Runtime.executionContextCreated for Reactotron client",
                                Some(&execution_context_event),
                                Some("Runtime.executionContextCreated"),
                            );
                        }
                    }
                });
            }
        }
    }

    // Request stored events from client when DevTools connects / DevTools 연결 시 클라이언트에 저장된 이벤트 요청
    if let Some(client_id) = &client_id {
        // Try regular client first / 일반 클라이언트 먼저 시도
        let clients = clients.read().await;
        if let Some(client) = clients.get(client_id) {
            // Request stored events / 저장된 이벤트 요청
            let methods = vec![
                "Storage.replayStoredEvents",
                "SessionReplay.replayStoredEvents",
            ];
            let client_sender = client.sender.clone();
            let devtools_id = id.clone();
            let logger_clone = logger.clone();
            drop(clients);
            for method in methods {
                let message = serde_json::json!({
                    "method": method,
                    "params": {},
                });
                if let Ok(json_str) = serde_json::to_string(&message) {
                    if let Err(e) = client_sender.send(json_str) {
                        logger_clone.log_error(
                            LogType::DevTools,
                            &devtools_id,
                            &format!("failed to request {} from client {}", method, client_id),
                            Some(&e.to_string()),
                        );
                    } else {
                        logger_clone.log(
                            LogType::DevTools,
                            &devtools_id,
                            &format!("requested {} from client {}", method, client_id),
                            None,
                            None,
                        );
                    }
                }
            }
        }
    }

    // If connected to React Native Inspector, send cached Redux stores / React Native Inspector에 연결된 경우 캐시된 Redux stores 전송
    if let Some(client_id) = &client_id {
        let rn_connection = rn_manager.get_connection(client_id).await;
        if rn_connection.is_some() {
            // Associate DevTools with React Native Inspector / DevTools를 React Native Inspector와 연결
            rn_manager.associate_with_client(client_id, client_id).await;

            // Send cached Redux stores after a delay / 지연 후 캐시된 Redux stores 전송
            let stores = rn_manager.get_redux_stores(client_id).await;
            let devtools_id = id.clone();
            let sender_clone = tx.clone();
            let logger_clone = logger.clone();
            tokio::spawn(async move {
                tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
                for store in stores {
                    // Send INIT_INSTANCE message first / 먼저 INIT_INSTANCE 메시지 전송
                    let init_instance_msg = serde_json::json!({
                        "method": "Redux.message",
                        "params": {
                            "type": "INIT_INSTANCE",
                            "instanceId": store.instance_id,
                            "source": "@devtools-page",
                        }
                    });
                    if let Ok(json_str) = serde_json::to_string(&init_instance_msg) {
                        if let Err(e) = sender_clone.send(json_str) {
                            logger_clone.log_error(
                                LogType::DevTools,
                                &devtools_id,
                                "failed to send cached INIT_INSTANCE",
                                Some(&e.to_string()),
                            );
                        } else {
                            logger_clone.log(
                                LogType::DevTools,
                                &devtools_id,
                                &format!(
                                    "📤 Sent cached INIT_INSTANCE for instance {}",
                                    store.instance_id
                                ),
                                None,
                                None,
                            );
                        }
                    }

                    // Send INIT message with current state / 현재 상태와 함께 INIT 메시지 전송
                    let init_msg = serde_json::json!({
                        "method": "Redux.message",
                        "params": {
                            "type": "INIT",
                            "instanceId": store.instance_id,
                            "source": "@devtools-page",
                            "name": store.name,
                            "payload": store.payload,
                            "maxAge": 50,
                            "timestamp": store.timestamp,
                        }
                    });
                    if let Ok(json_str) = serde_json::to_string(&init_msg) {
                        if let Err(e) = sender_clone.send(json_str) {
                            logger_clone.log_error(
                                LogType::DevTools,
                                &devtools_id,
                                "failed to send cached Redux store INIT",
                                Some(&e.to_string()),
                            );
                        } else {
                            logger_clone.log(
                                LogType::DevTools,
                                &devtools_id,
                                &format!(
                                    "📤 Sent cached INIT for instance {} ({})",
                                    store.instance_id, store.name
                                ),
                                None,
                                None,
                            );
                        }
                    }
                }
            });
        }
    }

    // Spawn task to send messages to DevTools / DevTools로 메시지 전송 태스크
    let logger_clone = logger.clone();
    let devtools_id_for_send = id.clone();
    tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if let Err(e) = sender.send(Message::Text(msg)).await {
                logger_clone.log_error(
                    LogType::DevTools,
                    &devtools_id_for_send,
                    "failed to send message",
                    Some(&e.to_string()),
                );
                break;
            }
        }
    });

    // Handle incoming messages from DevTools / DevTools로부터 들어오는 메시지 처리
    let clients_for_msg = clients.clone();
    let devtools_for_msg = devtools.clone();
    let rn_manager_for_msg = rn_manager.clone();
    let logger_for_msg = logger.clone();
    let devtools_id_for_msg = id.clone();
    tokio::spawn(async move {
        while let Some(msg) = receiver.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    // Parse message for logging / 로깅을 위해 메시지 파싱
                    let mut should_forward = true;
                    if let Ok(parsed) = serde_json::from_str::<CDPMessage>(&text) {
                        logger_for_msg.log(
                            LogType::DevTools,
                            &devtools_id_for_msg,
                            "received",
                            Some(&serde_json::json!(parsed)),
                            parsed.method.as_deref(),
                        );

                        // Handle Network.getResponseBody command / Network.getResponseBody 명령 처리
                        if let Some(method) = &parsed.method {
                            if method == "Network.getResponseBody" {
                                if let Some(id) = parsed.id {
                                    // Extract request_id before spawning / spawn 전에 request_id 추출
                                    let request_id_opt = parsed
                                        .params
                                        .as_ref()
                                        .and_then(|p| p.as_object())
                                        .and_then(|params| params.get("requestId"))
                                        .and_then(|r| r.as_str())
                                        .map(|s| s.to_string());

                                    if let Some(request_id) = request_id_opt {
                                        // Check if this is a React Native Inspector client / React Native Inspector 클라이언트인지 확인
                                        let devtools = devtools_for_msg.read().await;
                                        let client_id_opt = devtools
                                            .get(&devtools_id_for_msg)
                                            .and_then(|dt| dt.client_id.clone());
                                        drop(devtools);

                                        // Check if client is React Native Inspector / 클라이언트가 React Native Inspector인지 확인
                                        let is_rn_inspector =
                                            if let Some(client_id) = &client_id_opt {
                                                rn_manager_for_msg
                                                    .get_connection(client_id)
                                                    .await
                                                    .is_some()
                                            } else {
                                                false
                                            };

                                        if is_rn_inspector {
                                            // For React Native Inspector, forward the request / React Native Inspector의 경우 요청 전달
                                            logger_for_msg.log(
                                                LogType::DevTools,
                                                &devtools_id_for_msg,
                                                &format!("🔍 Network.getResponseBody request for RN Inspector, forwarding to native / React Native Inspector용 Network.getResponseBody 요청, 네이티브로 전달: requestId={}", request_id),
                                                None,
                                                Some("Network.getResponseBody"),
                                            );
                                            // Don't set should_forward = false, let it forward to React Native Inspector / should_forward = false를 설정하지 않음, React Native Inspector로 전달되도록 함
                                        } else {
                                            // For regular clients (e.g., Reactotron), handle in Rust server / 일반 클라이언트(예: Reactotron)의 경우 Rust 서버에서 처리
                                            let socket_server_for_body = socket_server.clone();
                                            let devtools_for_body = devtools_for_msg.clone();
                                            let devtools_id_for_body = devtools_id_for_msg.clone();
                                            let logger_for_body = logger_for_msg.clone();

                                            tokio::spawn(async move {
                                                let server = socket_server_for_body.read().await;
                                                let body = server
                                                    .response_bodies
                                                    .read()
                                                    .await
                                                    .get(&request_id)
                                                    .cloned();

                                                let response = serde_json::json!({
                                                    "id": id,
                                                    "result": {
                                                        "body": body.unwrap_or_default(),
                                                        "base64Encoded": false
                                                    }
                                                });

                                                if let Ok(response_str) =
                                                    serde_json::to_string(&response)
                                                {
                                                    let devtools = devtools_for_body.read().await;
                                                    if let Some(devtool) =
                                                        devtools.get(&devtools_id_for_body)
                                                    {
                                                        if let Err(e) = devtool
                                                            .sender
                                                            .send(response_str.clone())
                                                        {
                                                            logger_for_body.log_error(
                                                                LogType::DevTools,
                                                                &devtools_id_for_body,
                                                                "failed to send Network.getResponseBody response",
                                                                Some(&e.to_string()),
                                                            );
                                                        } else {
                                                            logger_for_body.log(
                                                                LogType::DevTools,
                                                                &devtools_id_for_body,
                                                                &format!("✅ Sent Network.getResponseBody response for requestId: {}", request_id),
                                                                Some(&response),
                                                                Some("Network.getResponseBody"),
                                                            );
                                                        }
                                                    }
                                                    drop(devtools);
                                                }
                                            });
                                            should_forward = false;
                                        }
                                    }
                                }
                            }
                        }

                        // Handle enable commands and Page.getResourceTree for Reactotron CDP bridge / Reactotron CDP 브리지를 위한 enable 명령 및 Page.getResourceTree 처리
                        // For Reactotron clients, we need to respond to enable commands since they don't have a real target
                        // Reactotron 클라이언트의 경우 실제 타겟이 없으므로 enable 명령에 응답해야 함
                        if let Some(method) = &parsed.method {
                            // Handle Page.getResourceTree request / Page.getResourceTree 요청 처리
                            if method == "Page.getResourceTree" {
                                // Check if this is a Reactotron client / Reactotron 클라이언트인지 확인
                                let devtools = devtools_for_msg.read().await;
                                let current_devtool = devtools.get(&devtools_id_for_msg);
                                let client_id = current_devtool.and_then(|dt| dt.client_id.clone());
                                drop(devtools);

                                if let Some(client_id) = &client_id {
                                    let clients = clients_for_msg.read().await;
                                    let is_reactotron = clients
                                        .get(client_id)
                                        .and_then(|c| c.url.as_ref())
                                        .map(|url| url.starts_with("reactotron://"))
                                        .unwrap_or(false);
                                    drop(clients);

                                    if is_reactotron {
                                        let devtools_for_response = devtools_for_msg.clone();
                                        let devtools_id_for_response = devtools_id_for_msg.clone();
                                        let logger_for_response = logger_for_msg.clone();

                                        // Create minimal frame tree for Reactotron / Reactotron을 위한 최소한의 프레임 트리 생성
                                        let frame = serde_json::json!({
                                            "id": "1",
                                            "mimeType": "application/javascript",
                                            "securityOrigin": "reactotron://",
                                            "url": "reactotron://"
                                        });

                                        let frame_tree = serde_json::json!({
                                            "frame": frame,
                                            "resources": []
                                        });

                                        let response = serde_json::json!({
                                            "id": parsed.id,
                                            "result": {
                                                "frameTree": frame_tree
                                            }
                                        });

                                        if let Ok(response_str) = serde_json::to_string(&response) {
                                            let devtools = devtools_for_response.read().await;
                                            if let Some(devtool) =
                                                devtools.get(&devtools_id_for_response)
                                            {
                                                if let Err(e) =
                                                    devtool.sender.send(response_str.clone())
                                                {
                                                    logger_for_response.log_error(
                                                        LogType::DevTools,
                                                        &devtools_id_for_response,
                                                        "failed to send Page.getResourceTree response",
                                                        Some(&e.to_string()),
                                                    );
                                                } else {
                                                    logger_for_response.log(
                                                        LogType::DevTools,
                                                        &devtools_id_for_response,
                                                        "✅ Sent Page.getResourceTree response for Reactotron client",
                                                        Some(&response),
                                                        Some("Page.getResourceTree"),
                                                    );
                                                }
                                            }
                                            drop(devtools);
                                        }
                                        should_forward = false;
                                    }
                                }
                            }

                            if method == "Runtime.enable"
                                || method == "Network.enable"
                                || method == "Console.enable"
                                || method == "Page.enable"
                            {
                                // Check if this is a Reactotron client / Reactotron 클라이언트인지 확인
                                let devtools = devtools_for_msg.read().await;
                                let current_devtool = devtools.get(&devtools_id_for_msg);
                                let client_id = current_devtool.and_then(|dt| dt.client_id.clone());
                                drop(devtools);

                                logger_for_msg.log(
                                    LogType::DevTools,
                                    &devtools_id_for_msg,
                                    &format!(
                                        "🔍 Checking enable command {} for client_id: {:?}",
                                        method, client_id
                                    ),
                                    None,
                                    Some("check_enable"),
                                );

                                if let Some(client_id) = &client_id {
                                    let clients = clients_for_msg.read().await;
                                    let is_reactotron = clients
                                        .get(client_id)
                                        .and_then(|c| c.url.as_ref())
                                        .map(|url| url.starts_with("reactotron://"))
                                        .unwrap_or(false);

                                    logger_for_msg.log(
                                        LogType::DevTools,
                                        &devtools_id_for_msg,
                                        &format!("🔍 Client {} is_reactotron: {}", client_id, is_reactotron),
                                        Some(&serde_json::json!({
                                            "clientId": client_id,
                                            "isReactotron": is_reactotron,
                                            "url": clients.get(client_id).and_then(|c| c.url.clone()),
                                        })),
                                        Some("check_reactotron"),
                                    );

                                    drop(clients);

                                    if is_reactotron {
                                        // Handle Page.getResourceTree request / Page.getResourceTree 요청 처리
                                        if method == "Page.getResourceTree" {
                                            let devtools_for_response = devtools_for_msg.clone();
                                            let devtools_id_for_response =
                                                devtools_id_for_msg.clone();
                                            let logger_for_response = logger_for_msg.clone();

                                            // Create minimal frame tree for Reactotron / Reactotron을 위한 최소한의 프레임 트리 생성
                                            let frame = serde_json::json!({
                                                "id": "1",
                                                "mimeType": "application/javascript",
                                                "securityOrigin": "reactotron://",
                                                "url": "reactotron://"
                                            });

                                            let frame_tree = serde_json::json!({
                                                "frame": frame,
                                                "resources": []
                                            });

                                            let response = serde_json::json!({
                                                "id": parsed.id,
                                                "result": {
                                                    "frameTree": frame_tree
                                                }
                                            });

                                            if let Ok(response_str) =
                                                serde_json::to_string(&response)
                                            {
                                                let devtools = devtools_for_response.read().await;
                                                if let Some(devtool) =
                                                    devtools.get(&devtools_id_for_response)
                                                {
                                                    if let Err(e) =
                                                        devtool.sender.send(response_str.clone())
                                                    {
                                                        logger_for_response.log_error(
                                                            LogType::DevTools,
                                                            &devtools_id_for_response,
                                                            "failed to send Page.getResourceTree response",
                                                            Some(&e.to_string()),
                                                        );
                                                    } else {
                                                        logger_for_response.log(
                                                            LogType::DevTools,
                                                            &devtools_id_for_response,
                                                            "✅ Sent Page.getResourceTree response for Reactotron client",
                                                            Some(&response),
                                                            Some("Page.getResourceTree"),
                                                        );
                                                    }
                                                }
                                                drop(devtools);
                                            }
                                            should_forward = false;
                                        } else {
                                            // Send success response for enable command / enable 명령에 대한 성공 응답 전송
                                            let response = serde_json::json!({
                                                "id": parsed.id,
                                                "result": {}
                                            });
                                            let devtools_for_response = devtools_for_msg.clone();
                                            let devtools_id_for_response =
                                                devtools_id_for_msg.clone();
                                            let logger_for_response = logger_for_msg.clone();

                                            if let Ok(response_str) =
                                                serde_json::to_string(&response)
                                            {
                                                let devtools = devtools_for_response.read().await;
                                                if let Some(devtool) =
                                                    devtools.get(&devtools_id_for_response)
                                                {
                                                    if let Err(e) =
                                                        devtool.sender.send(response_str.clone())
                                                    {
                                                        logger_for_response.log_error(
                                                            LogType::DevTools,
                                                            &devtools_id_for_response,
                                                            &format!(
                                                                "failed to send {} response",
                                                                method
                                                            ),
                                                            Some(&e.to_string()),
                                                        );
                                                    } else {
                                                        logger_for_response.log(
                                                            LogType::DevTools,
                                                            &devtools_id_for_response,
                                                            &format!(
                                                                "✅ Sent success response for {}",
                                                                method
                                                            ),
                                                            Some(&response),
                                                            Some(method),
                                                        );
                                                    }
                                                }
                                                drop(devtools);
                                            }

                                            // For Runtime.enable, send executionContextCreated event / Runtime.enable의 경우 executionContextCreated 이벤트 전송
                                            if method == "Runtime.enable" {
                                                let devtools_for_exec = devtools_for_msg.clone();
                                                let devtools_id_for_exec =
                                                    devtools_id_for_msg.clone();
                                                let logger_for_exec = logger_for_msg.clone();

                                                tokio::spawn(async move {
                                                    // Wait a bit for the response to be processed / 응답이 처리될 때까지 잠시 대기
                                                    tokio::time::sleep(
                                                        tokio::time::Duration::from_millis(50),
                                                    )
                                                    .await;

                                                    let execution_context_event = serde_json::json!({
                                                        "method": "Runtime.executionContextCreated",
                                                        "params": {
                                                            "context": {
                                                                "id": 1,
                                                                "uniqueId": "1",
                                                                "origin": "reactotron://",
                                                                "name": "Reactotron",
                                                                "auxData": {
                                                                    "isDefault": true
                                                                }
                                                            }
                                                        }
                                                    });

                                                    if let Ok(event_str) = serde_json::to_string(
                                                        &execution_context_event,
                                                    ) {
                                                        let devtools =
                                                            devtools_for_exec.read().await;
                                                        if let Some(devtool) =
                                                            devtools.get(&devtools_id_for_exec)
                                                        {
                                                            if let Err(e) = devtool
                                                                .sender
                                                                .send(event_str.clone())
                                                            {
                                                                logger_for_exec.log_error(
                                                                LogType::DevTools,
                                                                &devtools_id_for_exec,
                                                                "failed to send Runtime.executionContextCreated",
                                                                Some(&e.to_string()),
                                                            );
                                                            } else {
                                                                logger_for_exec.log(
                                                                LogType::DevTools,
                                                                &devtools_id_for_exec,
                                                                "✅ Sent Runtime.executionContextCreated for Reactotron client",
                                                                Some(&execution_context_event),
                                                                Some("Runtime.executionContextCreated"),
                                                            );
                                                            }
                                                        }
                                                        drop(devtools);
                                                    }
                                                });
                                            }

                                            // Don't forward enable commands to Reactotron clients / Reactotron 클라이언트에게 enable 명령을 전달하지 않음
                                            should_forward = false;
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Get current client ID / 현재 클라이언트 ID 가져오기
                    let devtools = devtools_for_msg.read().await;
                    let current_devtool = devtools.get(&devtools_id_for_msg);
                    let client_id = current_devtool.and_then(|dt| dt.client_id.clone());
                    drop(devtools);

                    if should_forward {
                        if let Some(client_id) = client_id {
                            // Try regular client first / 일반 클라이언트 먼저 시도
                            let clients = clients_for_msg.read().await;
                            if let Some(client) = clients.get(&client_id) {
                                if let Err(e) = client.sender.send(text.clone()) {
                                    logger_for_msg.log_error(
                                        LogType::DevTools,
                                        &devtools_id_for_msg,
                                        &format!("failed to send to client {}", client_id),
                                        Some(&e.to_string()),
                                    );
                                }
                            } else {
                                // Try React Native Inspector / React Native Inspector 시도
                                if let Some(connection) =
                                    rn_manager_for_msg.get_connection(&client_id).await
                                {
                                    let sender = connection.sender.read().await;
                                    if let Err(e) = sender.send(text.clone()) {
                                        logger_for_msg.log_error(
                                            LogType::DevTools,
                                            &devtools_id_for_msg,
                                            &format!(
                                                "failed to send to RN inspector {}",
                                                client_id
                                            ),
                                            Some(&e.to_string()),
                                        );
                                    }
                                }
                            }
                            drop(clients);
                        }
                    }
                }
                Ok(Message::Close(_)) => {
                    logger_for_msg.log(
                        LogType::DevTools,
                        &devtools_id_for_msg,
                        "disconnected",
                        None,
                        None,
                    );
                    let mut devtools = devtools_for_msg.write().await;
                    devtools.remove(&devtools_id_for_msg);
                    break;
                }
                Err(e) => {
                    logger_for_msg.log_error(
                        LogType::DevTools,
                        &devtools_id_for_msg,
                        "websocket error",
                        Some(&e.to_string()),
                    );
                    break;
                }
                _ => {}
            }
        }
    });
}
