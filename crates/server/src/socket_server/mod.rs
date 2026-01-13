// WebSocket server implementation / WebSocket 서버 구현
mod client_handler;
mod devtools_handler;
mod message;
mod message_processor;
mod react_native_handler;

use crate::logging::{LogType, Logger};
use crate::react_native::ReactNativeInspectorConnectionManager;
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
            handle_react_native_inspector_websocket(
                ws,
                query_params,
                self.devtools.clone(),
                self.react_native_inspector_manager.clone(),
                self.logger.clone(),
            )
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
                handle_client_connection(
                    ws,
                    id,
                    query_params,
                    self.clients.clone(),
                    self.devtools.clone(),
                    self.react_native_inspector_manager.clone(),
                    self.logger.clone(),
                )
                .await;
            }
            "devtools" => {
                let client_id = query_params.get("clientId").cloned();
                handle_devtools_connection(
                    ws,
                    id,
                    client_id,
                    self.clients.clone(),
                    self.devtools.clone(),
                    self.react_native_inspector_manager.clone(),
                    self.logger.clone(),
                )
                .await;
            }
            _ => {}
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
}
