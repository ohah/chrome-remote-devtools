// WebSocket server implementation / WebSocket 서버 구현
mod client_handler;
mod devtools_handler;
mod message;
mod message_processor;
mod react_native_handler;

use crate::logging::{LogType, Logger};
use crate::react_native::ReactNativeInspectorConnectionManager;
use crate::reactotron_server::ReactotronServer;
use axum::extract::ws::WebSocket;
use serde::Serialize;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::mpsc;
use tokio::sync::RwLock;

/// Client connection / 클라이언트 연결
struct Client {
    id: String,
    url: Option<String>,
    title: Option<String>,
    favicon: Option<String>,
    ua: Option<String>,
    time: Option<String>,
    sender: mpsc::UnboundedSender<String>,
}

/// DevTools connection / DevTools 연결
struct DevTools {
    id: String,
    client_id: Option<String>,
    sender: mpsc::UnboundedSender<String>,
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

use client_handler::handle_client_connection;
use devtools_handler::handle_devtools_connection;
use react_native_handler::handle_react_native_inspector_websocket;

/// Socket server / 소켓 서버
pub struct SocketServer {
    clients: Arc<RwLock<HashMap<String, Arc<Client>>>>,
    devtools: Arc<RwLock<HashMap<String, Arc<DevTools>>>>,
    pub react_native_inspector_manager: Arc<ReactNativeInspectorConnectionManager>,
    pub reactotron_server: Option<Arc<ReactotronServer>>,
    pub logger: Arc<Logger>, // Made public for shared server instances / 공유 서버 인스턴스를 위해 public으로 변경
}

impl SocketServer {
    /// Create new socket server / 새로운 소켓 서버 생성
    pub fn new(logger: Arc<Logger>, enable_reactotron: bool) -> Self {
        if enable_reactotron {
            eprintln!("[reactotron] 🚀 Initializing Reactotron server...");
            logger.log(
                LogType::Server,
                "reactotron",
                "Initializing Reactotron server",
                None,
                None,
            );
        } else {
            eprintln!("[reactotron] ⚠️ Reactotron server is disabled");
        }

        Self {
            clients: Arc::new(RwLock::new(HashMap::new())),
            devtools: Arc::new(RwLock::new(HashMap::new())),
            react_native_inspector_manager: Arc::new(ReactNativeInspectorConnectionManager::new(
                logger.clone(),
            )),
            reactotron_server: if enable_reactotron {
                Some(Arc::new(ReactotronServer::new(logger.clone())))
            } else {
                None
            },
            logger,
        }
    }

    /// Enable Reactotron server if not already enabled / Reactotron 서버가 아직 활성화되지 않았으면 활성화
    pub fn enable_reactotron_server(&mut self) {
        if self.reactotron_server.is_none() {
            eprintln!("[reactotron] 🚀 Enabling Reactotron server...");
            self.logger.log(
                LogType::Server,
                "reactotron",
                "Enabling Reactotron server",
                None,
                None,
            );
            self.reactotron_server = Some(Arc::new(ReactotronServer::new(self.logger.clone())));
        }
    }

    /// Disable Reactotron server / Reactotron 서버 비활성화
    pub fn disable_reactotron_server(&mut self) {
        if self.reactotron_server.is_some() {
            eprintln!("[reactotron] 🛑 Disabling Reactotron server...");
            self.logger.log(
                LogType::Server,
                "reactotron",
                "Disabling Reactotron server",
                None,
                None,
            );
            self.reactotron_server = None;
        }
    }

    /// Handle WebSocket upgrade / WebSocket 업그레이드 처리
    /// Handle WebSocket upgrade (static method for RwLock) / WebSocket 업그레이드 처리 (RwLock용 정적 메서드)
    pub async fn handle_websocket_upgrade_rwlock(
        server: Arc<RwLock<Self>>,
        ws: WebSocket,
        path: String,
        query_params: HashMap<String, String>,
    ) {
        // Log the received path for debugging / 디버깅을 위해 받은 경로 로깅
        {
            let server_guard = server.read().await;
            server_guard.logger.log(
                LogType::Server,
                "websocket",
                &format!("WebSocket upgrade request for path: {}", path),
                Some(&serde_json::json!({
                    "path": path,
                    "queryParams": query_params,
                })),
                None,
            );
        }

        // Handle Reactotron connections on root path / 루트 경로에서 Reactotron 연결 처리
        // Reactotron clients connect to ws://host:port (no path) / Reactotron 클라이언트는 ws://host:port로 연결 (경로 없음)
        {
            let server_guard = server.read().await;
            if (path.is_empty() || path == "/") && server_guard.reactotron_server.is_some() {
                eprintln!("[reactotron] 🔌 WebSocket connection attempt on root path (path: '{}', reactotron_server enabled: true)", path);
                server_guard.logger.log(
                    LogType::Server,
                    "reactotron",
                    &format!(
                        "Reactotron WebSocket connection attempt on root path (path: '{}')",
                        path
                    ),
                    Some(&serde_json::json!({
                        "path": path,
                        "queryParams": query_params,
                    })),
                    None,
                );
                if let Some(reactotron_server) = &server_guard.reactotron_server {
                    let connection_id = reactotron_server.next_connection_id().await;
                    let address = query_params
                        .get("address")
                        .cloned()
                        .unwrap_or_else(|| "unknown".to_string());
                    eprintln!("[reactotron] 🚀 Routing to Reactotron handler (connection_id: {}, address: {})", connection_id, address);
                    server_guard.logger.log(
                        LogType::Server,
                        "reactotron",
                        &format!(
                            "Routing to Reactotron handler (connection_id: {}, address: {})",
                            connection_id, address
                        ),
                        None,
                        None,
                    );
                    crate::reactotron_server::handle_reactotron_websocket(
                        ws,
                        address,
                        connection_id,
                        reactotron_server.connections.clone(),
                        reactotron_server.subscriptions.clone(),
                        Some(server.clone()),
                        server_guard.logger.clone(),
                    )
                    .await;
                    return;
                } else {
                    eprintln!("[reactotron] ⚠️ Reactotron server is None but path matches root");
                    server_guard.logger.log(
                        LogType::Server,
                        "reactotron",
                        "Reactotron server is None but path matches root",
                        None,
                        None,
                    );
                }
            } else if (path.is_empty() || path == "/") && server_guard.reactotron_server.is_none() {
                eprintln!("[reactotron] ⚠️ WebSocket connection on root path but Reactotron server is disabled (path: '{}')", path);
            }
        }

        // Handle React Native Inspector / React Native Inspector 처리
        // Note: axum's Path extractor for wildcard routes returns the path without the prefix
        // 주의: axum의 와일드카드 라우트 Path extractor는 접두사 없이 경로를 반환합니다
        // So /remote/debug/*path with path "inspector/device" will give us "inspector/device" (without leading slash)
        // 따라서 /remote/debug/*path에서 path가 "inspector/device"이면 "inspector/device"를 받습니다 (앞의 슬래시 없이)
        // Also handle direct /inspector/device path (with leading slash) / 직접 /inspector/device 경로도 처리 (앞의 슬래시 포함)
        {
            let server_guard = server.read().await;
            if path == "inspector/device"
                || path.starts_with("inspector/device")
                || path == "/inspector/device"
                || path.starts_with("/inspector/device")
            {
                server_guard.logger.log(
                    LogType::RnInspector,
                    "websocket",
                    "Routing to React Native Inspector handler",
                    Some(&serde_json::json!({
                        "originalPath": path,
                        "queryParams": query_params,
                    })),
                    None,
                );
                handle_react_native_inspector_websocket(
                    ws,
                    query_params,
                    server_guard.devtools.clone(),
                    server_guard.react_native_inspector_manager.clone(),
                    server_guard.logger.clone(),
                )
                .await;
                return;
            }
        }

        // Handle standard Chrome Remote DevTools connections / 표준 Chrome Remote DevTools 연결 처리
        // Path should be in format "client/:id" or "devtools/:id" / 경로는 "client/:id" 또는 "devtools/:id" 형식이어야 함
        // Note: path from axum wildcard doesn't include leading slash / axum 와일드카드의 path는 앞의 슬래시를 포함하지 않음
        let path_parts: Vec<&str> = path.split('/').filter(|s| !s.is_empty()).collect();

        {
            let server_guard = server.read().await;
            if path_parts.len() < 2 {
                server_guard.logger.log(
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
                    handle_client_connection(
                        ws,
                        id,
                        query_params,
                        server_guard.clients.clone(),
                        server_guard.devtools.clone(),
                        server_guard.react_native_inspector_manager.clone(),
                        server_guard.logger.clone(),
                    )
                    .await;
                }
                "devtools" => {
                    let client_id = query_params.get("clientId").cloned();
                    handle_devtools_connection(
                        ws,
                        id,
                        client_id,
                        server_guard.clients.clone(),
                        server_guard.devtools.clone(),
                        server_guard.react_native_inspector_manager.clone(),
                        server_guard.logger.clone(),
                    )
                    .await;
                }
                _ => {}
            }
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

    /// Register Reactotron client as Remote DevTools client / Reactotron 클라이언트를 Remote DevTools 클라이언트로 등록
    /// Returns a channel sender for sending messages to the client / 클라이언트로 메시지를 보내기 위한 채널 sender 반환
    pub async fn register_reactotron_client(
        &self,
        client_id: String,
        url: String,
        title: String,
        ua: String,
        logger: Arc<Logger>,
    ) -> Option<mpsc::UnboundedSender<String>> {
        let (tx, _rx) = mpsc::unbounded_channel::<String>();

        let mut clients = self.clients.write().await;

        // Check if client already exists / 클라이언트가 이미 존재하는지 확인
        if clients.contains_key(&client_id) {
            logger.log(
                LogType::Reactotron,
                &client_id,
                &format!("Client {} already registered, updating", client_id),
                None,
                None,
            );
        }

        // Create client struct / 클라이언트 구조체 생성
        let time_str = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs().to_string())
            .unwrap_or_else(|_| "0".to_string());
        let client = Arc::new(Client {
            id: client_id.clone(),
            url: Some(url),
            title: Some(title),
            favicon: None,
            ua: Some(ua),
            time: Some(time_str),
            sender: tx.clone(),
        });

        clients.insert(client_id, client);
        Some(tx)
    }

    /// Unregister Reactotron client from Remote DevTools / Reactotron 클라이언트를 Remote DevTools에서 등록 해제
    pub async fn unregister_reactotron_client(&self, client_id: &str, logger: Arc<Logger>) {
        let mut clients = self.clients.write().await;
        if clients.remove(client_id).is_some() {
            logger.log(
                LogType::Reactotron,
                client_id,
                "Unregistered Reactotron client from Remote DevTools",
                None,
                None,
            );
        }
    }
}

#[cfg(test)]
/// Create test logger / 테스트용 로거 생성
fn create_test_logger() -> Arc<crate::logging::Logger> {
    Arc::new(crate::logging::Logger::new(false, None, None).unwrap())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    /// Test SocketServer instance creation / SocketServer 인스턴스 생성 테스트
    async fn test_socket_server_creation() {
        let logger = create_test_logger();
        // Should not panic / 패닉이 발생하지 않아야 함
        let _socket_server = SocketServer::new(logger, false);
    }

    #[tokio::test]
    /// Test empty clients list initially / 초기에는 빈 클라이언트 목록 반환 테스트
    async fn test_empty_clients_list_initially() {
        let logger = create_test_logger();
        let socket_server = SocketServer::new(logger, false);
        let clients = socket_server.get_all_clients().await;
        assert_eq!(clients.len(), 0);
    }

    #[tokio::test]
    /// Test empty inspectors list initially / 초기에는 빈 Inspector 목록 반환 테스트
    async fn test_empty_inspectors_list_initially() {
        let logger = create_test_logger();
        let socket_server = SocketServer::new(logger, false);
        let inspectors = socket_server.get_all_inspectors().await;
        assert_eq!(inspectors.len(), 0);
    }

    #[tokio::test]
    /// Test get client by ID when client doesn't exist / 클라이언트가 없을 때 ID로 클라이언트 가져오기 테스트
    async fn test_get_client_by_id_when_not_exists() {
        let logger = create_test_logger();
        let socket_server = SocketServer::new(logger, false);
        let client = socket_server.get_client("test-client-1").await;
        assert!(client.is_none());
    }

    #[tokio::test]
    /// Test get all clients returns array / 모든 클라이언트 반환 테스트
    async fn test_get_all_clients_returns_array() {
        let logger = create_test_logger();
        let socket_server = SocketServer::new(logger, false);
        let clients = socket_server.get_all_clients().await;
        // Should return a vector / 벡터를 반환해야 함
        assert!(clients.is_empty());
    }

    #[tokio::test]
    /// Test get all inspectors returns array / 모든 Inspector 반환 테스트
    async fn test_get_all_inspectors_returns_array() {
        let logger = create_test_logger();
        let socket_server = SocketServer::new(logger, false);
        let inspectors = socket_server.get_all_inspectors().await;
        // Should return a vector / 벡터를 반환해야 함
        assert!(inspectors.is_empty());
    }

    #[tokio::test]
    /// Test get client with empty string / 빈 문자열로 클라이언트 조회 테스트
    async fn test_get_client_with_empty_string() {
        let logger = create_test_logger();
        let socket_server = SocketServer::new(logger, false);
        let client = socket_server.get_client("").await;
        assert!(client.is_none());
    }

    #[tokio::test]
    /// Test get client with special characters / 특수 문자가 포함된 클라이언트 ID 조회 테스트
    async fn test_get_client_with_special_characters() {
        let logger = create_test_logger();
        let socket_server = SocketServer::new(logger, false);
        let client = socket_server.get_client("test/client-id").await;
        assert!(client.is_none());
    }

    #[tokio::test]
    /// Test ClientInfo struct serialization / ClientInfo 구조체 직렬화 테스트
    async fn test_client_info_serialization() {
        let client_info = ClientInfo {
            id: "test-id".to_string(),
            url: Some("https://example.com".to_string()),
            title: Some("Test Page".to_string()),
            favicon: Some("favicon.ico".to_string()),
            ua: Some("Mozilla/5.0".to_string()),
            time: Some("2024-01-01".to_string()),
        };

        // Test serialization / 직렬화 테스트
        let json = serde_json::to_string(&client_info).unwrap();
        assert!(json.contains("test-id"));
        assert!(json.contains("https://example.com"));
    }

    #[tokio::test]
    /// Test InspectorInfo struct serialization / InspectorInfo 구조체 직렬화 테스트
    async fn test_inspector_info_serialization() {
        let inspector_info = InspectorInfo {
            id: "inspector-1".to_string(),
            client_id: Some("client-1".to_string()),
        };

        // Test serialization / 직렬화 테스트
        let json = serde_json::to_string(&inspector_info).unwrap();
        assert!(json.contains("inspector-1"));
        assert!(json.contains("client-1"));
    }

    #[tokio::test]
    /// Test InspectorInfo with None client_id / client_id가 None인 InspectorInfo 테스트
    async fn test_inspector_info_without_client_id() {
        let inspector_info = InspectorInfo {
            id: "inspector-1".to_string(),
            client_id: None,
        };

        // Test serialization / 직렬화 테스트
        let json = serde_json::to_string(&inspector_info).unwrap();
        assert!(json.contains("inspector-1"));
        assert!(!json.contains("client-1"));
    }
}

#[cfg(test)]
mod message_routing_tests {
    use super::*;

    #[tokio::test]
    /// Test get client information / 클라이언트 정보 가져오기 테스트
    async fn test_get_client_information() {
        let logger = create_test_logger();
        let socket_server = SocketServer::new(logger, false);
        let client = socket_server.get_client("test-client").await;
        // Should return None when client doesn't exist / 클라이언트가 없을 때 None 반환
        assert!(client.is_none());
    }
}
