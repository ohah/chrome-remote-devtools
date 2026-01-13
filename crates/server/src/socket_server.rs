// WebSocket server implementation / WebSocket 서버 구현
use crate::logging::{LogType, Logger};
use crate::react_native::{
    ConnectionInfo, ReactNativeInspectorConnectionManager, ReduxStoreInstance,
};
use axum::extract::ws::{Message, WebSocket};
use flate2::read::GzDecoder;
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::Read;
use std::sync::Arc;
use tokio::sync::mpsc;
use tokio::sync::RwLock;

/// CDP message / CDP 메시지
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CDPMessage {
    pub method: Option<String>,
    pub params: Option<serde_json::Value>,
    pub id: Option<u64>,
    pub result: Option<serde_json::Value>,
    pub error: Option<serde_json::Value>,
}

/// Compressed params / 압축된 파라미터
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompressedParams {
    pub compressed: bool,
    pub data: Vec<u8>,
}

/// Client connection / 클라이언트 연결
pub struct Client {
    pub id: String,
    pub url: Option<String>,
    pub title: Option<String>,
    pub favicon: Option<String>,
    pub ua: Option<String>,
    pub time: Option<String>,
    pub sender: mpsc::UnboundedSender<String>,
}

/// DevTools connection / DevTools 연결
pub struct DevTools {
    pub id: String,
    pub client_id: Option<String>,
    pub sender: mpsc::UnboundedSender<String>,
}

/// Socket server / 소켓 서버
pub struct SocketServer {
    clients: Arc<RwLock<HashMap<String, Arc<Client>>>>,
    devtools: Arc<RwLock<HashMap<String, Arc<DevTools>>>>,
    pub react_native_inspector_manager: Arc<ReactNativeInspectorConnectionManager>,
    logger: Arc<Logger>,
}

impl SocketServer {
    /// Create new socket server / 새로운 소켓 서버 생성
    pub fn new(logger: Arc<Logger>) -> Self {
        Self {
            clients: Arc::new(RwLock::new(HashMap::new())),
            devtools: Arc::new(RwLock::new(HashMap::new())),
            react_native_inspector_manager: Arc::new(ReactNativeInspectorConnectionManager::new(
                logger.clone(),
            )),
            logger,
        }
    }

    /// Handle WebSocket upgrade / WebSocket 업그레이드 처리
    pub async fn handle_websocket_upgrade(
        &self,
        ws: WebSocket,
        path: String,
        query_params: HashMap<String, String>,
    ) {
        // Log the received path for debugging / 디버깅을 위해 받은 경로 로깅
        self.logger.log(
            LogType::Server,
            "websocket",
            &format!("WebSocket upgrade request for path: {}", path),
            Some(&serde_json::json!({
                "path": path,
                "queryParams": query_params,
            })),
            None,
        );

        // Handle React Native Inspector / React Native Inspector 처리
        // Note: axum's Path extractor for wildcard routes returns the path without the prefix
        // 주의: axum의 와일드카드 라우트 Path extractor는 접두사 없이 경로를 반환합니다
        // So /remote/debug/*path with path "inspector/device" will give us "inspector/device" (without leading slash)
        // 따라서 /remote/debug/*path에서 path가 "inspector/device"이면 "inspector/device"를 받습니다 (앞의 슬래시 없이)
        // Also handle direct /inspector/device path (with leading slash) / 직접 /inspector/device 경로도 처리 (앞의 슬래시 포함)
        if path == "inspector/device"
            || path.starts_with("inspector/device")
            || path == "/inspector/device"
            || path.starts_with("/inspector/device")
        {
            self.logger.log(
                LogType::RnInspector,
                "websocket",
                "Routing to React Native Inspector handler",
                Some(&serde_json::json!({
                    "originalPath": path,
                    "queryParams": query_params,
                })),
                None,
            );
            self.handle_react_native_inspector_websocket(ws, query_params)
                .await;
            return;
        }

        // Handle standard Chrome Remote DevTools connections / 표준 Chrome Remote DevTools 연결 처리
        // Path should be in format "client/:id" or "devtools/:id" / 경로는 "client/:id" 또는 "devtools/:id" 형식이어야 함
        // Note: path from axum wildcard doesn't include leading slash / axum 와일드카드의 path는 앞의 슬래시를 포함하지 않음
        let path_parts: Vec<&str> = path.split('/').filter(|s| !s.is_empty()).collect();

        if path_parts.len() < 2 {
            self.logger.log(
                LogType::Server,
                "websocket",
                &format!("Invalid path format: {}", path),
                None,
                None,
            );
            return;
        }

        let from = path_parts[0];
        let id = path_parts[1].to_string();

        match from {
            "client" => {
                self.handle_client_connection(ws, id, query_params).await;
            }
            "devtools" => {
                let client_id = query_params.get("clientId").cloned();
                self.handle_devtools_connection(ws, id, client_id).await;
            }
            _ => {}
        }
    }

    /// Handle client WebSocket connection / 클라이언트 WebSocket 연결 처리
    async fn handle_client_connection(
        &self,
        ws: WebSocket,
        id: String,
        query_params: HashMap<String, String>,
    ) {
        self.logger
            .log(LogType::Client, &id, "connected", None, None);

        let (mut sender, mut receiver) = ws.split();
        let (tx, mut rx) = mpsc::unbounded_channel::<String>();

        let client = Arc::new(Client {
            id: id.clone(),
            url: query_params.get("url").cloned(),
            title: query_params.get("title").cloned(),
            favicon: query_params.get("favicon").cloned(),
            ua: query_params.get("ua").cloned(),
            time: query_params.get("time").cloned(),
            sender: tx.clone(),
        });

        {
            let mut clients = self.clients.write().await;
            clients.insert(id.clone(), client.clone());
        }

        // Spawn task to send messages to client / 클라이언트로 메시지 전송 태스크
        let logger_clone = self.logger.clone();
        let client_id_for_send = id.clone();
        tokio::spawn(async move {
            while let Some(msg) = rx.recv().await {
                if let Err(e) = sender.send(Message::Text(msg)).await {
                    logger_clone.log_error(
                        LogType::Client,
                        &client_id_for_send,
                        "failed to send message",
                        Some(&e.to_string()),
                    );
                    break;
                }
            }
        });

        // Handle incoming messages from client / 클라이언트로부터 들어오는 메시지 처리
        let clients_for_msg = self.clients.clone();
        let devtools_for_msg = self.devtools.clone();
        let rn_manager_for_msg = self.react_native_inspector_manager.clone();
        let logger_for_msg = self.logger.clone();
        let client_id_for_msg = id.clone();
        tokio::spawn(async move {
            while let Some(msg) = receiver.next().await {
                match msg {
                    Ok(Message::Text(text)) => {
                        let data = Self::process_client_message(
                            &text,
                            &client_id_for_msg,
                            &logger_for_msg,
                        );

                        // Send to DevTools / DevTools로 전송
                        let devtools = devtools_for_msg.read().await;
                        for devtool in devtools.values() {
                            if devtool.client_id.as_ref() == Some(&client_id_for_msg) {
                                if let Err(e) = devtool.sender.send(data.clone()) {
                                    logger_for_msg.log_error(
                                        LogType::Client,
                                        &client_id_for_msg,
                                        &format!("failed to send to devtools {}", devtool.id),
                                        Some(&e.to_string()),
                                    );
                                }
                            }
                        }
                        drop(devtools);

                        // Send to React Native Inspector / React Native Inspector로 전송
                        let rn_connections = rn_manager_for_msg.get_all_connections().await;
                        for inspector in rn_connections {
                            if inspector.client_id.as_ref() == Some(&client_id_for_msg) {
                                if let Some(connection) =
                                    rn_manager_for_msg.get_connection(&inspector.id).await
                                {
                                    if let Err(e) = connection.sender.send(data.clone()) {
                                        logger_for_msg.log_error(
                                            LogType::Client,
                                            &client_id_for_msg,
                                            &format!(
                                                "failed to send to RN inspector {}",
                                                inspector.id
                                            ),
                                            Some(&e.to_string()),
                                        );
                                    }
                                }
                            }
                        }
                    }
                    Ok(Message::Close(_)) => {
                        logger_for_msg.log(
                            LogType::Client,
                            &client_id_for_msg,
                            "disconnected",
                            None,
                            None,
                        );
                        let mut clients = clients_for_msg.write().await;
                        clients.remove(&client_id_for_msg);

                        // Close associated DevTools / 연결된 DevTools 종료
                        let mut devtools = devtools_for_msg.write().await;
                        let devtools_to_remove: Vec<String> = devtools
                            .iter()
                            .filter(|(_, dt)| dt.client_id.as_ref() == Some(&client_id_for_msg))
                            .map(|(id, _)| id.clone())
                            .collect();
                        for dt_id in devtools_to_remove {
                            devtools.remove(&dt_id);
                        }
                        break;
                    }
                    Err(e) => {
                        logger_for_msg.log_error(
                            LogType::Client,
                            &client_id_for_msg,
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

    /// Handle DevTools WebSocket connection / DevTools WebSocket 연결 처리
    async fn handle_devtools_connection(
        &self,
        ws: WebSocket,
        id: String,
        client_id: Option<String>,
    ) {
        self.logger.log(
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
            let mut devtools = self.devtools.write().await;
            devtools.insert(id.clone(), devtool.clone());
        }

        // If connected to React Native Inspector, send cached Redux stores / React Native Inspector에 연결된 경우 캐시된 Redux stores 전송
        if let Some(client_id) = &client_id {
            let rn_connection = self
                .react_native_inspector_manager
                .get_connection(client_id)
                .await;
            if rn_connection.is_some() {
                // Associate DevTools with React Native Inspector / DevTools를 React Native Inspector와 연결
                self.react_native_inspector_manager
                    .associate_with_client(client_id, client_id)
                    .await;

                // Send cached Redux stores after a delay / 지연 후 캐시된 Redux stores 전송
                let stores = self
                    .react_native_inspector_manager
                    .get_redux_stores(client_id)
                    .await;
                let devtools_id = id.clone();
                let sender_clone = tx.clone();
                let logger_clone = self.logger.clone();
                tokio::spawn(async move {
                    tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
                    for store in stores {
                        let message = serde_json::json!({
                            "method": "Redux.message",
                            "params": {
                                "type": "INIT",
                                "instanceId": store.instance_id,
                                "name": store.name,
                                "payload": store.payload,
                                "timestamp": store.timestamp,
                            }
                        });
                        if let Ok(json_str) = serde_json::to_string(&message) {
                            if let Err(e) = sender_clone.send(json_str) {
                                logger_clone.log_error(
                                    LogType::DevTools,
                                    &devtools_id,
                                    "failed to send cached Redux store",
                                    Some(&e.to_string()),
                                );
                            }
                        }
                    }
                });
            }
        }

        // Spawn task to send messages to DevTools / DevTools로 메시지 전송 태스크
        let logger_clone = self.logger.clone();
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
        let clients_for_msg = self.clients.clone();
        let devtools_for_msg = self.devtools.clone();
        let rn_manager_for_msg = self.react_native_inspector_manager.clone();
        let logger_for_msg = self.logger.clone();
        let devtools_id_for_msg = id.clone();
        tokio::spawn(async move {
            while let Some(msg) = receiver.next().await {
                match msg {
                    Ok(Message::Text(text)) => {
                        // Parse message for logging / 로깅을 위해 메시지 파싱
                        if let Ok(parsed) = serde_json::from_str::<CDPMessage>(&text) {
                            logger_for_msg.log(
                                LogType::DevTools,
                                &devtools_id_for_msg,
                                "received",
                                Some(&serde_json::json!(parsed)),
                                parsed.method.as_deref(),
                            );
                        }

                        // Get current client ID / 현재 클라이언트 ID 가져오기
                        let devtools = devtools_for_msg.read().await;
                        let current_devtool = devtools.get(&devtools_id_for_msg);
                        let client_id = current_devtool.and_then(|dt| dt.client_id.clone());
                        drop(devtools);

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
                                    if let Err(e) = connection.sender.send(text.clone()) {
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

    /// Handle React Native Inspector WebSocket / React Native Inspector WebSocket 처리
    async fn handle_react_native_inspector_websocket(
        &self,
        ws: WebSocket,
        query_params: HashMap<String, String>,
    ) {
        let device_name = query_params.get("name").cloned();
        let app_name = query_params.get("app").cloned();
        let device_id = query_params.get("device").cloned();

        let (mut sender, mut receiver) = ws.split();
        let (tx, mut rx) = mpsc::unbounded_channel::<String>();

        // Create connection info / 연결 정보 생성
        let connection_info = ConnectionInfo {
            id: String::new(), // Will be set by create_connection / create_connection에서 설정됨
            device_name,
            app_name,
            device_id: device_id.clone(),
            client_id: None,
        };

        // Create inspector connection / Inspector 연결 생성
        let inspector_id = self
            .react_native_inspector_manager
            .create_connection(connection_info, tx.clone())
            .await;

        // Auto-associate with self as clientId (so DevTools can connect) / 자동으로 자신을 clientId로 연결 (DevTools가 연결할 수 있도록)
        self.react_native_inspector_manager
            .associate_with_client(&inspector_id, &inspector_id)
            .await;

        self.logger.log(
            LogType::RnInspector,
            &inspector_id,
            "connected",
            Some(&serde_json::json!({
                "deviceName": query_params.get("name"),
                "appName": query_params.get("app"),
                "deviceId": query_params.get("device"),
            })),
            None,
        );

        // Spawn task to send messages to React Native Inspector / React Native Inspector로 메시지 전송 태스크
        let logger_clone = self.logger.clone();
        let inspector_id_for_send = inspector_id.clone();
        tokio::spawn(async move {
            while let Some(msg) = rx.recv().await {
                if let Err(e) = sender.send(Message::Text(msg)).await {
                    logger_clone.log_error(
                        LogType::RnInspector,
                        &inspector_id_for_send,
                        "failed to send message",
                        Some(&e.to_string()),
                    );
                    break;
                }
            }
        });

        // Handle incoming messages from React Native Inspector / React Native Inspector로부터 들어오는 메시지 처리
        let devtools_for_msg = self.devtools.clone();
        let rn_manager_for_msg = self.react_native_inspector_manager.clone();
        let logger_for_msg = self.logger.clone();
        let inspector_id_for_msg = inspector_id.clone();
        tokio::spawn(async move {
            while let Some(msg) = receiver.next().await {
                match msg {
                    Ok(Message::Text(text)) => {
                        // Parse message for logging and Redux handling / 로깅 및 Redux 처리를 위해 메시지 파싱
                        if let Ok(parsed) = serde_json::from_str::<CDPMessage>(&text) {
                            if let Some(method) = &parsed.method {
                                logger_for_msg.log(
                                    LogType::RnInspector,
                                    &inspector_id_for_msg,
                                    "received",
                                    Some(&serde_json::json!(parsed)),
                                    Some(method),
                                );

                                // Cache Redux store information / Redux store 정보 캐시
                                if method == "Redux.message" {
                                    if let Some(params) = &parsed.params {
                                        if let Ok(redux_params) =
                                            serde_json::from_value::<serde_json::Value>(
                                                params.clone(),
                                            )
                                        {
                                            if let Some(redux_type) =
                                                redux_params.get("type").and_then(|v| v.as_str())
                                            {
                                                if redux_type == "INIT" {
                                                    if let Some(instance_id) = redux_params
                                                        .get("instanceId")
                                                        .and_then(|v| v.as_str())
                                                    {
                                                        let store_info = ReduxStoreInstance {
                                                            instance_id: instance_id.to_string(),
                                                            name: redux_params
                                                                .get("name")
                                                                .and_then(|v| v.as_str())
                                                                .unwrap_or("Store")
                                                                .to_string(),
                                                            payload: redux_params
                                                                .get("payload")
                                                                .and_then(|v| v.as_str())
                                                                .unwrap_or("{}")
                                                                .to_string(),
                                                            timestamp: redux_params
                                                                .get("timestamp")
                                                                .and_then(|v| v.as_i64())
                                                                .unwrap_or_else(|| {
                                                                    std::time::SystemTime::now()
                                                                        .duration_since(
                                                                            std::time::UNIX_EPOCH,
                                                                        )
                                                                        .unwrap()
                                                                        .as_millis()
                                                                        as i64
                                                                }),
                                                        };
                                                        rn_manager_for_msg
                                                            .store_redux_instance(
                                                                &inspector_id_for_msg,
                                                                store_info,
                                                            )
                                                            .await;
                                                        logger_for_msg.log(
                                                            LogType::RnInspector,
                                                            &inspector_id_for_msg,
                                                            &format!("📦 Cached Redux store INIT for instance {}", instance_id),
                                                            None,
                                                            None,
                                                        );
                                                    }
                                                } else if redux_type == "ACTION" {
                                                    if let Some(instance_id) = redux_params
                                                        .get("instanceId")
                                                        .and_then(|v| v.as_str())
                                                    {
                                                        let payload = redux_params
                                                            .get("payload")
                                                            .and_then(|v| v.as_str())
                                                            .unwrap_or("{}")
                                                            .to_string();
                                                        let timestamp = redux_params
                                                            .get("timestamp")
                                                            .and_then(|v| v.as_i64())
                                                            .unwrap_or_else(|| {
                                                                std::time::SystemTime::now()
                                                                    .duration_since(
                                                                        std::time::UNIX_EPOCH,
                                                                    )
                                                                    .unwrap()
                                                                    .as_millis()
                                                                    as i64
                                                            });
                                                        rn_manager_for_msg
                                                            .update_redux_state(
                                                                &inspector_id_for_msg,
                                                                instance_id,
                                                                payload,
                                                                timestamp,
                                                            )
                                                            .await;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            } else {
                                logger_for_msg.log(
                                    LogType::RnInspector,
                                    &inspector_id_for_msg,
                                    "received",
                                    Some(&serde_json::json!(parsed)),
                                    None,
                                );
                            }
                        } else {
                            logger_for_msg.log(
                                LogType::RnInspector,
                                &inspector_id_for_msg,
                                "received (raw)",
                                Some(&serde_json::json!({ "data": text })),
                                None,
                            );
                        }

                        // Get connection to find associated client / 연결을 가져와 연결된 클라이언트 찾기
                        let connection = rn_manager_for_msg
                            .get_connection(&inspector_id_for_msg)
                            .await;
                        if let Some(conn) = connection {
                            let client_id_guard = conn.client_id.read().await;
                            let client_id = client_id_guard.clone();
                            drop(client_id_guard);

                            if let Some(client_id) = client_id {
                                // Forward to DevTools (if connected) / DevTools로 전달 (연결된 경우)
                                let devtools = devtools_for_msg.read().await;
                                let mut forwarded = false;
                                for devtool in devtools.values() {
                                    if devtool.client_id.as_ref() == Some(&client_id) {
                                        if let Err(e) = devtool.sender.send(text.clone()) {
                                            logger_for_msg.log_error(
                                                LogType::RnInspector,
                                                &inspector_id_for_msg,
                                                &format!(
                                                    "failed to send to devtools {}",
                                                    devtool.id
                                                ),
                                                Some(&e.to_string()),
                                            );
                                        } else {
                                            forwarded = true;
                                        }
                                    }
                                }
                                drop(devtools);

                                if !forwarded {
                                    logger_for_msg.log(
                                        LogType::RnInspector,
                                        &inspector_id_for_msg,
                                        &format!("no devtools connected to forward message (clientId: {})", client_id),
                                        None,
                                        None,
                                    );
                                }

                                // Also forward to regular client if exists (for backward compatibility) / 일반 클라이언트가 있으면 전달 (하위 호환성)
                                // This is handled by the client message handler / 이것은 클라이언트 메시지 핸들러에서 처리됨
                            }
                        }
                    }
                    Ok(Message::Close(_)) => {
                        logger_for_msg.log(
                            LogType::RnInspector,
                            &inspector_id_for_msg,
                            "disconnected",
                            None,
                            None,
                        );
                        rn_manager_for_msg
                            .remove_connection(&inspector_id_for_msg)
                            .await;
                        break;
                    }
                    Err(e) => {
                        logger_for_msg.log_error(
                            LogType::RnInspector,
                            &inspector_id_for_msg,
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

    /// Process client message (decompress if needed) / 클라이언트 메시지 처리 (필요시 압축 해제)
    fn process_client_message(message: &str, client_id: &str, logger: &Logger) -> String {
        // Try to parse message / 메시지 파싱 시도
        if let Ok(mut parsed) = serde_json::from_str::<CDPMessage>(message) {
            // Check for compressed params / 압축된 파라미터 확인
            if let Some(params) = &parsed.params {
                if let Ok(compressed) = serde_json::from_value::<CompressedParams>(params.clone()) {
                    if compressed.compressed && !compressed.data.is_empty() {
                        // Decompress / 압축 해제
                        let mut decoder = GzDecoder::new(&compressed.data[..]);
                        let mut decompressed = String::new();
                        if decoder.read_to_string(&mut decompressed).is_ok() {
                            if let Ok(decompressed_data) =
                                serde_json::from_str::<serde_json::Value>(&decompressed)
                            {
                                if let Some(method) =
                                    decompressed_data.get("method").and_then(|v| v.as_str())
                                {
                                    parsed.method = Some(method.to_string());
                                }
                                if let Some(new_params) = decompressed_data.get("params") {
                                    parsed.params = Some(new_params.clone());
                                }
                            }
                        } else {
                            logger.log_error(
                                LogType::Client,
                                client_id,
                                "decompression failed",
                                None,
                            );
                        }
                    }
                }
            }

            // Log message / 메시지 로깅
            logger.log(
                LogType::Client,
                client_id,
                "received",
                Some(&serde_json::json!(parsed)),
                parsed.method.as_deref(),
            );

            // Return as JSON string / JSON 문자열로 반환
            serde_json::to_string(&parsed).unwrap_or_else(|_| message.to_string())
        } else {
            // If parsing fails, log raw message / 파싱 실패 시 원본 메시지 로깅
            logger.log(
                LogType::Client,
                client_id,
                "received (raw)",
                Some(&serde_json::json!({ "data": message })),
                None,
            );
            message.to_string()
        }
    }

    /// Get client by ID / ID로 클라이언트 가져오기
    pub async fn get_client(&self, client_id: &str) -> Option<ClientInfo> {
        let clients = self.clients.read().await;
        clients.get(client_id).map(|client| ClientInfo {
            id: client.id.clone(),
            url: client.url.clone(),
            title: client.title.clone(),
            favicon: client.favicon.clone(),
            ua: client.ua.clone(),
            time: client.time.clone(),
        })
    }

    /// Get all clients / 모든 클라이언트 가져오기
    pub async fn get_all_clients(&self) -> Vec<ClientInfo> {
        let clients = self.clients.read().await;
        clients
            .values()
            .map(|client| ClientInfo {
                id: client.id.clone(),
                url: client.url.clone(),
                title: client.title.clone(),
                favicon: client.favicon.clone(),
                ua: client.ua.clone(),
                time: client.time.clone(),
            })
            .collect()
    }

    /// Get inspector by ID / ID로 Inspector 가져오기
    pub async fn get_inspector(&self, inspector_id: &str) -> Option<InspectorInfo> {
        let devtools = self.devtools.read().await;
        devtools.get(inspector_id).map(|devtool| InspectorInfo {
            id: devtool.id.clone(),
            client_id: devtool.client_id.clone(),
        })
    }

    /// Get all inspectors / 모든 Inspector 가져오기
    pub async fn get_all_inspectors(&self) -> Vec<InspectorInfo> {
        let devtools = self.devtools.read().await;
        devtools
            .values()
            .map(|devtool| InspectorInfo {
                id: devtool.id.clone(),
                client_id: devtool.client_id.clone(),
            })
            .collect()
    }
}

/// Client information / 클라이언트 정보
#[derive(Debug, Clone, Serialize)]
pub struct ClientInfo {
    pub id: String,
    pub url: Option<String>,
    pub title: Option<String>,
    pub favicon: Option<String>,
    pub ua: Option<String>,
    pub time: Option<String>,
}

/// Inspector information / Inspector 정보
#[derive(Debug, Clone, Serialize)]
pub struct InspectorInfo {
    pub id: String,
    pub client_id: Option<String>,
}
