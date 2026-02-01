// Reactotron WebSocket connection handler / Reactotron WebSocket 연결 핸들러
use crate::logging::{LogType, Logger};
use crate::reactotron_server::types::{Command, CommandWithClientId};
use axum::extract::ws::{Message, WebSocket};
use futures_util::{SinkExt, StreamExt};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::mpsc;
use tokio::sync::RwLock;
use uuid::Uuid;

/// Client connection / 클라이언트 연결
#[derive(Debug, Clone)]
pub struct ClientConnection {
    pub id: u32,
    pub address: String,
    pub client_id: String,
    pub sender: mpsc::UnboundedSender<Message>,
}

/// Client connections storage / 클라이언트 연결 저장소
pub type ClientConnections = Arc<RwLock<HashMap<String, ClientConnection>>>;

/// Subscriptions storage / 구독 저장소
pub type Subscriptions = Arc<RwLock<Vec<String>>>;

/// Handle Reactotron WebSocket connection / Reactotron WebSocket 연결 처리
pub async fn handle_reactotron_websocket(
    ws: WebSocket,
    address: String,
    connection_id: u32,
    connections: ClientConnections,
    subscriptions: Subscriptions,
    socket_server: Option<Arc<tokio::sync::RwLock<crate::socket_server::SocketServer>>>,
    logger: Arc<Logger>,
) {
    // Always log connection attempt / 연결 시도 항상 로깅
    logger.log(
        LogType::Reactotron,
        &connection_id.to_string(),
        &format!(
            "🔌 Reactotron WebSocket connection accepted from {}",
            address
        ),
        Some(&serde_json::json!({
            "connectionId": connection_id,
            "address": address,
        })),
        None,
    );

    let (mut sender, mut receiver) = ws.split();
    let (tx, mut rx) = mpsc::unbounded_channel::<Message>();

    let mut current_client_id: Option<String> = None;
    let mut message_id_counter: u32 = 0;
    let socket_server_clone = socket_server.clone();

    // Clone for cleanup / 정리를 위해 클론
    let connections_clone = connections.clone();
    let logger_clone = logger.clone();
    let socket_server_for_cleanup = socket_server.clone();

    // Spawn task to send messages to client / 클라이언트로 메시지 전송 태스크 생성
    let mut send_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if sender.send(msg).await.is_err() {
                break;
            }
        }
    });

    // Handle incoming messages / 들어오는 메시지 처리
    let mut recv_task = tokio::spawn(async move {
        while let Some(msg_result) = receiver.next().await {
            match msg_result {
                Ok(msg) => {
                    if handle_incoming_message(
                        msg,
                        connection_id,
                        &mut message_id_counter,
                        &mut current_client_id,
                        &address,
                        tx.clone(),
                        connections.clone(),
                        subscriptions.clone(),
                        socket_server_clone.clone(),
                        logger.clone(),
                    )
                    .await
                    .is_err()
                    {
                        break;
                    }
                }
                Err(e) => {
                    logger.log(
                        LogType::Server,
                        "reactotron",
                        &format!("[{}] WebSocket read error: {}", connection_id, e),
                        None,
                        None,
                    );
                    break;
                }
            }
        }
        // Return current_client_id for cleanup / 정리를 위해 current_client_id 반환
        current_client_id
    });

    // Wait for either task to complete / 두 태스크 중 하나가 완료될 때까지 대기
    let final_client_id = tokio::select! {
        _ = &mut send_task => {
            recv_task.abort();
            None
        }
        result = &mut recv_task => {
            send_task.abort();
            result.ok().flatten()
        }
    };

    // Cleanup / 정리
    if let Some(client_id) = final_client_id {
        let mut conns = connections_clone.write().await;
        if conns.remove(&client_id).is_some() {
            logger_clone.log(
                LogType::Reactotron,
                &connection_id.to_string(),
                &format!("❌ Client {} disconnected", client_id),
                Some(&serde_json::json!({
                    "connectionId": connection_id,
                    "clientId": client_id,
                })),
                None,
            );

            // Unregister Reactotron client from Remote DevTools / Reactotron 클라이언트를 Remote DevTools에서 등록 해제
            if let Some(server) = socket_server_for_cleanup.as_ref() {
                // Unregister from Remote DevTools / Remote DevTools에서 등록 해제
                crate::reactotron_server::bridge::unregister_reactotron_client(
                    &client_id,
                    server.clone(),
                    logger_clone.clone(),
                )
                .await;

                // Also remove from React Native Inspector Manager / React Native Inspector Manager에서도 제거
                let server_guard = server.read().await;
                let rn_manager = server_guard.react_native_inspector_manager.clone();
                drop(server_guard);

                // Find and remove React Native Inspector connection with this client_id / 이 client_id를 가진 React Native Inspector 연결 찾아서 제거
                let connections = rn_manager.get_all_connections().await;
                for conn in connections {
                    if conn.client_id.as_ref() == Some(&client_id) {
                        rn_manager.remove_connection(&conn.id, None).await;
                        logger_clone.log(
                            LogType::Reactotron,
                            &client_id,
                            &format!("Removed React Native Inspector connection {} for Reactotron client", conn.id),
                            None,
                            None,
                        );
                        break;
                    }
                }
            }
        }
    }
}

/// Process incoming message / 들어오는 메시지 처리
#[allow(clippy::too_many_arguments)]
async fn handle_incoming_message(
    msg: Message,
    connection_id: u32,
    message_id: &mut u32,
    current_client_id: &mut Option<String>,
    address: &str,
    sender: mpsc::UnboundedSender<Message>,
    connections: ClientConnections,
    subscriptions: Subscriptions,
    socket_server: Option<Arc<tokio::sync::RwLock<crate::socket_server::SocketServer>>>,
    logger: Arc<Logger>,
) -> Result<(), ()> {
    match msg {
        Message::Text(text) => {
            let mut cmd: Command = match serde_json::from_str(&text) {
                Ok(cmd) => cmd,
                Err(e) => {
                    logger.log(
                        LogType::Server,
                        "reactotron",
                        &format!(
                            "[{}] Failed to parse command: {}. Raw: {}",
                            connection_id, e, text
                        ),
                        None,
                        None,
                    );
                    return Ok(()); // Don't close connection for a single bad command / 단일 잘못된 명령으로 연결을 닫지 않음
                }
            };

            *message_id += 1;
            cmd.message_id = Some(*message_id);
            cmd.connection_id = Some(connection_id);

            // Log received command / 받은 명령 로깅
            logger.log(
                LogType::Reactotron,
                &connection_id.to_string(),
                &format!(
                    "📨 Received command: type={}, clientId={:?}",
                    cmd.r#type, cmd.client_id
                ),
                Some(&serde_json::json!({
                    "type": cmd.r#type,
                    "payload": cmd.payload,
                    "clientId": cmd.client_id,
                })),
                Some(&cmd.r#type),
            );

            // client.intro is a special case that establishes the connection / client.intro는 연결을 설정하는 특수한 경우
            if cmd.r#type == "client.intro" {
                let mut client_id = cmd
                    .payload
                    .get("clientId")
                    .and_then(|v| v.as_str())
                    .map(String::from);

                if client_id.is_none() || client_id.as_deref() == Some("~~~ null ~~~") {
                    client_id = Some(Uuid::new_v4().to_string());
                    let response = serde_json::json!({
                        "type": "setClientId",
                        "payload": client_id.as_ref().unwrap()
                    });
                    let _ = sender.send(Message::Text(response.to_string()));
                    logger.log(
                        LogType::Server,
                        "reactotron",
                        &format!(
                            "[{}] Generated new client ID: {}",
                            connection_id,
                            client_id.as_ref().unwrap()
                        ),
                        None,
                        None,
                    );
                }

                let final_client_id = client_id.unwrap();
                *current_client_id = Some(final_client_id.clone());
                cmd.client_id = Some(final_client_id.clone());

                let connection = ClientConnection {
                    id: connection_id,
                    address: address.to_string(),
                    client_id: final_client_id.clone(),
                    sender: sender.clone(),
                };

                let mut conns = connections.write().await;
                if let Some(_old_conn) = conns.insert(final_client_id.clone(), connection) {
                    logger.log(
                        LogType::Server,
                        "reactotron",
                        &format!(
                            "[{}] Client {} reconnected, closing old connection",
                            connection_id, final_client_id
                        ),
                        None,
                        None,
                    );
                }

                logger.log(
                    LogType::Reactotron,
                    &connection_id.to_string(),
                    &format!(
                        "✅ Client {} connected successfully (address: {})",
                        final_client_id, address
                    ),
                    Some(&serde_json::json!({
                        "connectionId": connection_id,
                        "clientId": final_client_id,
                        "address": address,
                    })),
                    None,
                );

                // Register Reactotron client as Remote DevTools client / Reactotron 클라이언트를 Remote DevTools 클라이언트로 등록
                if let Some(server) = socket_server.as_ref() {
                    // Extract React Native Inspector params from payload / payload에서 React Native Inspector params 추출
                    let device_name = cmd
                        .payload
                        .get("name")
                        .and_then(|v| v.as_str())
                        .map(String::from);

                    let app_name = cmd
                        .payload
                        .get("app")
                        .and_then(|v| v.as_str())
                        .map(String::from)
                        .or_else(|| {
                            cmd.payload
                                .get("appName")
                                .and_then(|v| v.as_str())
                                .map(String::from)
                        });

                    let device_id = cmd
                        .payload
                        .get("device")
                        .and_then(|v| v.as_str())
                        .map(String::from)
                        .or_else(|| {
                            cmd.payload
                                .get("deviceId")
                                .and_then(|v| v.as_str())
                                .map(String::from)
                        })
                        .or_else(|| Some(final_client_id.clone())); // Fallback to client_id if no device ID / device ID가 없으면 client_id 사용

                    // Register as React Native Inspector connection / React Native Inspector 연결로 등록
                    let server_guard = server.read().await;
                    let rn_manager = server_guard.react_native_inspector_manager.clone();
                    drop(server_guard);

                    // Create a String sender wrapper for React Native Inspector / React Native Inspector를 위한 String sender 래퍼 생성
                    // Reactotron uses Message type, but React Native Inspector uses String / Reactotron은 Message 타입을 사용하지만 React Native Inspector는 String을 사용
                    let (tx_string, mut rx_string) =
                        tokio::sync::mpsc::unbounded_channel::<String>();
                    let sender_for_rn_wrapper = sender.clone();
                    tokio::spawn(async move {
                        while let Some(msg_str) = rx_string.recv().await {
                            // Convert String to Message::Text and send via Reactotron sender / String을 Message::Text로 변환하여 Reactotron sender로 전송
                            if let Err(e) = sender_for_rn_wrapper.send(Message::Text(msg_str)) {
                                eprintln!(
                                    "[reactotron] Failed to forward message to Reactotron: {}",
                                    e
                                );
                                break;
                            }
                        }
                    });

                    // Create React Native Inspector connection info / React Native Inspector 연결 정보 생성
                    let connection_info = crate::react_native::ConnectionInfo {
                        id: String::new(), // Will be set by create_connection / create_connection에서 설정됨
                        device_name: device_name.clone(),
                        app_name: app_name.clone(),
                        device_id: device_id.clone(),
                        client_id: None,
                    };

                    // Create React Native Inspector connection / React Native Inspector 연결 생성
                    let (inspector_id, _tx_id) = rn_manager
                        .create_connection(connection_info, tx_string)
                        .await;

                    // Auto-associate with self as clientId (so DevTools can connect) / 자동으로 자신을 clientId로 연결 (DevTools가 연결할 수 있도록)
                    rn_manager
                        .associate_with_client(&inspector_id, &final_client_id)
                        .await;

                    logger.log(
                        LogType::Reactotron,
                        &connection_id.to_string(),
                        &format!(
                            "✅ Registered Reactotron client {} as React Native Inspector connection (inspector_id: {})",
                            final_client_id, inspector_id
                        ),
                        Some(&serde_json::json!({
                            "clientId": final_client_id,
                            "inspectorId": inspector_id,
                            "deviceName": device_name,
                            "appName": app_name,
                            "deviceId": device_id,
                        })),
                        None,
                    );

                    // Also register as Remote DevTools client / Remote DevTools 클라이언트로도 등록
                    if let Some(_tx) = crate::reactotron_server::bridge::register_reactotron_client(
                        final_client_id.clone(),
                        &cmd.payload,
                        server.clone(),
                        logger.clone(),
                    )
                    .await
                    {
                        // Store the sender for later use / 나중에 사용하기 위해 sender 저장
                        // Note: The sender is already stored in the Client struct in SocketServer
                        // 주의: sender는 이미 SocketServer의 Client 구조체에 저장됨
                        logger.log(
                            LogType::Reactotron,
                            &connection_id.to_string(),
                            &format!(
                                "Registered Reactotron client {} in Remote DevTools",
                                final_client_id
                            ),
                            None,
                            None,
                        );
                    }
                }
            }

            if let Some(client_id) = current_client_id {
                cmd.client_id = Some(client_id.clone());

                // Convert Reactotron message to CDP format and send to DevTools / Reactotron 메시지를 CDP 형식으로 변환하여 DevTools로 전송
                if let Some(socket_server) = socket_server.as_ref() {
                    // Special handling for api.response - it returns multiple CDP events / api.response는 여러 CDP 이벤트를 반환하므로 특별 처리
                    if cmd.r#type == "api.response" {
                        if let Some(messages) =
                            crate::reactotron_server::cdp_bridge::convert_network_response_to_cdp(
                                &cmd,
                                logger.clone(),
                            )
                        {
                            logger.log(
                                LogType::Reactotron,
                                client_id,
                                &format!("✅ CDP conversion successful for api.response ({} events)", messages.len()),
                                Some(&serde_json::json!({
                                    "originalType": cmd.r#type,
                                    "eventCount": messages.len(),
                                    "events": messages.iter().map(|m| m.get("method").and_then(|m| m.as_str())).collect::<Vec<_>>(),
                                })),
                                Some("cdp_conversion_success"),
                            );

                            let server_guard = socket_server.read().await;
                            for cdp_message in messages {
                                server_guard
                                    .send_cdp_message_to_devtools(
                                        client_id,
                                        &cdp_message,
                                        logger.clone(),
                                    )
                                    .await;
                            }
                        } else {
                            logger.log(
                                LogType::Reactotron,
                                client_id,
                                "⚠️ CDP conversion returned None for api.response (conversion failed)",
                                Some(&serde_json::json!({
                                    "type": cmd.r#type,
                                    "payload": cmd.payload,
                                })),
                                Some("cdp_conversion_failed"),
                            );
                        }
                    } else {
                        // For other commands, use the existing conversion / 다른 명령의 경우 기존 변환 사용
                        let cdp_result =
                            crate::reactotron_server::cdp_bridge::convert_reactotron_to_cdp(
                                &cmd,
                                logger.clone(),
                            );
                        if let Some(cdp_message) = cdp_result {
                            logger.log(
                                LogType::Reactotron,
                                client_id,
                                &format!("✅ CDP conversion successful for type: {}", cmd.r#type),
                                Some(&serde_json::json!({
                                    "originalType": cmd.r#type,
                                    "cdpMethod": cdp_message.get("method").and_then(|m| m.as_str()),
                                    "cdpMessage": cdp_message,
                                })),
                                Some("cdp_conversion_success"),
                            );

                            // Send CDP message to DevTools connected to this client / 이 클라이언트에 연결된 DevTools로 CDP 메시지 전송
                            let server_guard = socket_server.read().await;
                            server_guard
                                .send_cdp_message_to_devtools(
                                    client_id,
                                    &cdp_message,
                                    logger.clone(),
                                )
                                .await;
                        } else {
                            logger.log(
                                LogType::Reactotron,
                                client_id,
                                &format!("⚠️ CDP conversion returned None for type: {} (not supported or conversion failed)", cmd.r#type),
                                Some(&serde_json::json!({
                                    "type": cmd.r#type,
                                    "payload": cmd.payload,
                                })),
                                Some("cdp_conversion_failed"),
                            );
                        }
                    }
                }
            }

            // Handle other command types / 다른 명령 타입 처리
            if cmd.r#type == "state.values.subscribe" {
                if let Some(paths) = cmd.payload.get("paths").and_then(|p| p.as_array()) {
                    let mut subs = subscriptions.write().await;
                    for path in paths {
                        if let Some(path_str) = path.as_str() {
                            if !subs.contains(&path_str.to_string()) {
                                subs.push(path_str.to_string());
                            }
                        }
                    }
                    logger.log(
                        LogType::Server,
                        "reactotron",
                        &format!("[{}] Client subscribed to state paths", connection_id),
                        None,
                        None,
                    );
                }
            }
        }
        Message::Close(_) => {
            logger.log(
                LogType::Server,
                "reactotron",
                &format!("[{}] Received close frame", connection_id),
                None,
                None,
            );
            return Err(()); // Signal to close the connection / 연결 종료 신호
        }
        Message::Ping(_) => {
            // Tungstenite handles pong automatically / Tungstenite가 자동으로 pong 처리
            let _ = sender.send(Message::Pong(vec![]));
        }
        Message::Pong(_) => {
            // Pong received, connection is alive / Pong 수신, 연결 활성
        }
        Message::Binary(_) => {
            logger.log(
                LogType::Server,
                "reactotron",
                &format!("[{}] Received unexpected binary message", connection_id),
                None,
                None,
            );
        }
    }
    Ok(())
}

/// Send command to client / 클라이언트에 명령 전송
#[allow(dead_code)]
pub async fn send_command(
    command: CommandWithClientId,
    connections: ClientConnections,
    logger: Arc<Logger>,
) {
    let conns = connections.read().await;

    let target_client_id = command.client_id.clone();
    let command_json = serde_json::json!({
        "type": command.r#type,
        "payload": command.payload
    });
    let message = Message::Text(command_json.to_string());

    if target_client_id.is_empty() {
        // Broadcast to all clients / 모든 클라이언트에 브로드캐스트
        for conn in conns.values() {
            if let Err(e) = conn.sender.send(message.clone()) {
                logger.log(
                    LogType::Server,
                    "reactotron",
                    &format!("Failed to send message to client {}: {}", conn.client_id, e),
                    None,
                    None,
                );
            }
        }
    } else if let Some(conn) = conns.get(&target_client_id) {
        // Send to a specific client / 특정 클라이언트에 전송
        if let Err(e) = conn.sender.send(message) {
            logger.log(
                LogType::Server,
                "reactotron",
                &format!("Failed to send message to client {}: {}", conn.client_id, e),
                None,
                None,
            );
        }
    }
}
