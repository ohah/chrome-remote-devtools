// React Native Inspector connection management / React Native Inspector 연결 관리
use crate::logging::{LogType, Logger};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;

/// Redux store instance information / Redux store 인스턴스 정보
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReduxStoreInstance {
    /// Instance ID / 인스턴스 ID
    pub instance_id: String,
    /// Store name / Store 이름
    pub name: String,
    /// Current state (JSON string) / 현재 상태 (JSON 문자열)
    pub payload: String,
    /// Timestamp / 타임스탬프
    pub timestamp: i64,
}

/// React Native Inspector connection information / React Native Inspector 연결 정보
pub struct ReactNativeInspectorConnection {
    /// Connection ID / 연결 ID
    pub id: String,
    /// Device name / 디바이스 이름
    pub device_name: Option<String>,
    /// App name / 앱 이름
    pub app_name: Option<String>,
    /// Device ID / 디바이스 ID
    pub device_id: Option<String>,
    /// Associated client ID (if connected to a client) / 연결된 클라이언트 ID (클라이언트에 연결된 경우)
    pub client_id: Arc<RwLock<Option<String>>>,
    /// Redux store instances / Redux store 인스턴스
    pub redux_stores: Arc<RwLock<HashMap<String, ReduxStoreInstance>>>,
    /// WebSocket message sender / WebSocket 메시지 전송자 (재연결 시 업데이트 가능하도록 Arc<RwLock<>>로 감쌈)
    pub sender: Arc<RwLock<tokio::sync::mpsc::UnboundedSender<String>>>,
}

/// React Native Inspector connection manager / React Native Inspector 연결 관리자
pub struct ReactNativeInspectorConnectionManager {
    connections: Arc<RwLock<HashMap<String, Arc<ReactNativeInspectorConnection>>>>,
    logger: Arc<Logger>,
}

impl ReactNativeInspectorConnectionManager {
    /// Create new connection manager / 새로운 연결 관리자 생성
    pub fn new(logger: Arc<Logger>) -> Self {
        Self {
            connections: Arc::new(RwLock::new(HashMap::new())),
            logger,
        }
    }

    /// Create a new React Native Inspector connection / 새로운 React Native Inspector 연결 생성
    /// If a connection with the same deviceId and appName exists (even if disconnected), reuse it / 같은 deviceId와 appName을 가진 연결이 있으면 (연결 해제된 경우에도) 재사용
    pub async fn create_connection(
        &self,
        connection_info: ConnectionInfo,
        sender: tokio::sync::mpsc::UnboundedSender<String>,
    ) -> String {
        // Check if there's an existing connection with the same deviceId and appName / 같은 deviceId와 appName을 가진 기존 연결 확인
        let existing_id = {
            let connections = self.connections.read().await;
            connections
                .values()
                .find(|conn| {
                    conn.device_id == connection_info.device_id
                        && conn.app_name == connection_info.app_name
                })
                .map(|conn| conn.id.clone())
        };

        if let Some(existing_id) = existing_id {
            // Reuse existing connection / 기존 연결 재사용
            let connections = self.connections.read().await;
            if let Some(existing_conn) = connections.get(&existing_id) {
                // Update sender to use new WebSocket connection / 새로운 WebSocket 연결을 사용하도록 sender 업데이트
                let mut sender_guard = existing_conn.sender.write().await;
                *sender_guard = sender;
                drop(sender_guard);

                self.logger.log(
                    LogType::RnInspector,
                    &existing_id,
                    "reconnected",
                    Some(&serde_json::json!({
                        "deviceName": connection_info.device_name,
                        "appName": connection_info.app_name,
                        "deviceId": connection_info.device_id,
                    })),
                    None,
                );

                return existing_id;
            }
        }

        // Create new connection / 새 연결 생성
        let id = format!(
            "rn-inspector-{}-{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis(),
            Uuid::new_v4().simple()
        );

        // Log before moving values / 값을 이동하기 전에 로깅
        self.logger.log(
            LogType::RnInspector,
            &id,
            "connected",
            Some(&serde_json::json!({
                "deviceName": connection_info.device_name,
                "appName": connection_info.app_name,
                "deviceId": connection_info.device_id,
            })),
            None,
        );

        let connection = Arc::new(ReactNativeInspectorConnection {
            id: id.clone(),
            device_name: connection_info.device_name,
            app_name: connection_info.app_name,
            device_id: connection_info.device_id,
            client_id: Arc::new(RwLock::new(None)),
            redux_stores: Arc::new(RwLock::new(HashMap::new())),
            sender: Arc::new(RwLock::new(sender)),
        });

        {
            let mut connections = self.connections.write().await;
            connections.insert(id.clone(), connection.clone());
        }

        id
    }

    /// Get connection by ID / ID로 연결 가져오기
    pub async fn get_connection(&self, id: &str) -> Option<Arc<ReactNativeInspectorConnection>> {
        let connections = self.connections.read().await;
        connections.get(id).cloned()
    }

    /// Get all connections / 모든 연결 가져오기
    pub async fn get_all_connections(&self) -> Vec<ConnectionInfo> {
        let connections = self.connections.read().await;
        let mut result = Vec::new();
        for conn in connections.values() {
            let client_id_guard = conn.client_id.read().await;
            result.push(ConnectionInfo {
                id: conn.id.clone(),
                device_name: conn.device_name.clone(),
                app_name: conn.app_name.clone(),
                device_id: conn.device_id.clone(),
                client_id: client_id_guard.clone(),
            });
        }
        result
    }

    /// Remove connection / 연결 제거
    pub async fn remove_connection(&self, id: &str) {
        let mut connections = self.connections.write().await;
        if connections.remove(id).is_some() {
            self.logger
                .log(LogType::RnInspector, id, "disconnected", None, None);
        }
    }

    /// Associate connection with a client / 연결을 클라이언트와 연결
    pub async fn associate_with_client(&self, inspector_id: &str, client_id: &str) -> bool {
        let connections = self.connections.read().await;
        if let Some(connection) = connections.get(inspector_id) {
            let mut conn_client_id = connection.client_id.write().await;
            *conn_client_id = Some(client_id.to_string());
            self.logger.log(
                LogType::RnInspector,
                inspector_id,
                &format!("associated with client {}", client_id),
                None,
                None,
            );
            return true;
        }
        false
    }

    /// Update Redux state / Redux 상태 업데이트
    pub async fn update_redux_state(
        &self,
        inspector_id: &str,
        instance_id: &str,
        payload: String,
        timestamp: i64,
    ) {
        let connections = self.connections.read().await;
        if let Some(connection) = connections.get(inspector_id) {
            let mut stores = connection.redux_stores.write().await;
            if let Some(store) = stores.get_mut(instance_id) {
                store.payload = payload;
                store.timestamp = timestamp;
            }
        }
    }

    /// Store Redux store instance information / Redux store 인스턴스 정보 저장
    pub async fn store_redux_instance(&self, inspector_id: &str, store_info: ReduxStoreInstance) {
        let connections = self.connections.read().await;
        if let Some(connection) = connections.get(inspector_id) {
            let mut stores = connection.redux_stores.write().await;
            stores.insert(store_info.instance_id.clone(), store_info.clone());
            self.logger.log(
                LogType::RnInspector,
                inspector_id,
                &format!(
                    "stored Redux instance {} ({})",
                    store_info.instance_id, store_info.name
                ),
                None,
                None,
            );
        }
    }

    /// Get all Redux store instances for a connection / 연결의 모든 Redux store 인스턴스 가져오기
    pub async fn get_redux_stores(&self, inspector_id: &str) -> Vec<ReduxStoreInstance> {
        let connections = self.connections.read().await;
        if let Some(connection) = connections.get(inspector_id) {
            let stores = connection.redux_stores.read().await;
            stores.values().cloned().collect()
        } else {
            Vec::new()
        }
    }

    /// Clear all connections / 모든 연결 초기화
    pub async fn clear_all_connections(&self) {
        let mut connections = self.connections.write().await;
        let count = connections.len();
        connections.clear();
        self.logger.log(
            LogType::RnInspector,
            "manager",
            &format!("Cleared {} React Native Inspector connections", count),
            None,
            None,
        );
    }
}

/// Connection information / 연결 정보
#[derive(Debug, Clone)]
pub struct ConnectionInfo {
    pub id: String,
    pub device_name: Option<String>,
    pub app_name: Option<String>,
    pub device_id: Option<String>,
    pub client_id: Option<String>,
}
