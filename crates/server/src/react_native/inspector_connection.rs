// React Native Inspector connection management / React Native Inspector 연결 관리
use crate::logging::{LogType, Logger};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
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
    /// Current handler tx id; only the handler with this id should remove the connection on close
    /// / 현재 핸들러 tx id; 이 id를 가진 핸들러만 close 시 연결을 제거해야 함
    pub current_tx_id: Arc<RwLock<Option<u64>>>,
}

/// React Native Inspector connection manager / React Native Inspector 연결 관리자
pub struct ReactNativeInspectorConnectionManager {
    connections: Arc<RwLock<HashMap<String, Arc<ReactNativeInspectorConnection>>>>,
    /// deviceId -> last used inspector id (for reconnection reuse) / 재연결 시 동일 clientId 재사용
    device_id_to_id: Arc<RwLock<HashMap<String, String>>>,
    next_tx_id: AtomicU64,
    logger: Arc<Logger>,
}

impl ReactNativeInspectorConnectionManager {
    /// Create new connection manager / 새로운 연결 관리자 생성
    pub fn new(logger: Arc<Logger>) -> Self {
        Self {
            connections: Arc::new(RwLock::new(HashMap::new())),
            device_id_to_id: Arc::new(RwLock::new(HashMap::new())),
            next_tx_id: AtomicU64::new(0),
            logger,
        }
    }

    /// Create a new React Native Inspector connection / 새로운 React Native Inspector 연결 생성
    /// When deviceId is provided and was used before, reuses the same connection id so DevTools
    /// does not need to refresh on app reconnection.
    /// deviceId가 있고 이전에 사용된 경우 동일 연결 id를 재사용하여 앱 재연결 시 DevTools 새로고침을 방지함.
    ///
    /// Returns (inspector_id, tx_id). tx_id is used when removing so only the current handler removes.
    /// (inspector_id, tx_id) 반환. 제거 시 현재 핸들러만 제거하도록 tx_id 사용.
    pub async fn create_connection(
        &self,
        connection_info: ConnectionInfo,
        sender: tokio::sync::mpsc::UnboundedSender<String>,
    ) -> (String, u64) {
        let tx_id = self.next_tx_id.fetch_add(1, Ordering::Relaxed);

        let device_id = connection_info.device_id.clone();
        let existing_id = if let Some(ref did) = device_id {
            let map = self.device_id_to_id.read().await;
            map.get(did).cloned()
        } else {
            None
        };

        if let Some(ref id) = existing_id {
            let connections = self.connections.write().await;
            if let Some(existing_conn) = connections.get(id) {
                // Reuse: update sender and current_tx_id so only this handler removes on close
                // / 재사용: sender와 current_tx_id 업데이트하여 이 핸들러만 close 시 제거
                let mut sender_guard = existing_conn.sender.write().await;
                *sender_guard = sender;
                drop(sender_guard);
                let mut tx_id_guard = existing_conn.current_tx_id.write().await;
                *tx_id_guard = Some(tx_id);
                drop(tx_id_guard);
                drop(connections);

                self.logger.log(
                    LogType::RnInspector,
                    id,
                    "reconnected (reusing clientId)",
                    Some(&serde_json::json!({ "deviceId": device_id })),
                    None,
                );
                return (id.clone(), tx_id);
            }
            // Connection was removed but device_id_to_id still has the id; insert new with same id
            // / 연결은 제거됐지만 device_id_to_id에 id 유지; 동일 id로 새 연결 삽입
            drop(connections);
        }

        // Create new connection / 새 연결 생성
        let id = existing_id.unwrap_or_else(|| {
            let timestamp_millis = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_else(|_| std::time::Duration::from_millis(0))
                .as_millis();
            format!(
                "rn-inspector-{}-{}",
                timestamp_millis,
                Uuid::new_v4().simple()
            )
        });

        if let Some(ref did) = device_id {
            let mut map = self.device_id_to_id.write().await;
            map.insert(did.clone(), id.clone());
        }

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
            current_tx_id: Arc::new(RwLock::new(Some(tx_id))),
        });

        {
            let mut connections = self.connections.write().await;
            connections.insert(id.clone(), connection);
        }

        (id, tx_id)
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

    /// Remove connection. When tx_id is Some, only remove if connection.current_tx_id matches
    /// (so the replaced handler does not remove the connection).
    /// 연결 제거. tx_id가 Some이면 connection.current_tx_id가 일치할 때만 제거 (교체된 핸들러가 제거하지 않도록).
    pub async fn remove_connection(&self, id: &str, tx_id: Option<u64>) {
        let conn = {
            let connections = self.connections.read().await;
            connections.get(id).cloned()
        };
        let should_remove = match conn.as_ref() {
            Some(c) => match tx_id {
                Some(tid) => {
                    let guard = c.current_tx_id.read().await;
                    *guard == Some(tid)
                }
                None => true,
            },
            None => false,
        };
        if should_remove {
            let mut connections = self.connections.write().await;
            if connections.remove(id).is_some() {
                self.logger
                    .log(LogType::RnInspector, id, "disconnected", None, None);
            }
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;
    use tokio::sync::mpsc;

    fn test_manager() -> ReactNativeInspectorConnectionManager {
        let logger = Arc::new(crate::logging::Logger::new(false, None, None).unwrap());
        ReactNativeInspectorConnectionManager::new(logger)
    }

    fn connection_info(device_id: Option<&str>) -> ConnectionInfo {
        ConnectionInfo {
            id: String::new(),
            device_name: Some("Test Device".to_string()),
            app_name: Some("Test App".to_string()),
            device_id: device_id.map(String::from),
            client_id: None,
        }
    }

    fn dummy_sender() -> mpsc::UnboundedSender<String> {
        let (tx, _rx) = mpsc::unbounded_channel();
        tx
    }

    #[tokio::test]
    async fn create_connection_with_device_id_reuses_same_id_on_second_call() {
        // First connection with device_id gets new id / device_id로 첫 연결은 새 id
        let manager = test_manager();
        let info = connection_info(Some("device-1"));
        let (id1, tx_id1) = manager
            .create_connection(info.clone(), dummy_sender())
            .await;
        assert!(id1.starts_with("rn-inspector-"));
        assert!(manager.get_connection(&id1).await.is_some());

        // Second connection with same device_id reuses id / 같은 device_id로 두 번째 연결은 id 재사용
        let (id2, tx_id2) = manager.create_connection(info, dummy_sender()).await;
        assert_eq!(id1, id2);
        assert_ne!(tx_id1, tx_id2);
        assert!(manager.get_connection(&id1).await.is_some());
    }

    #[tokio::test]
    async fn create_connection_without_device_id_always_creates_new_id() {
        let manager = test_manager();
        let info = ConnectionInfo {
            id: String::new(),
            device_name: None,
            app_name: None,
            device_id: None,
            client_id: None,
        };
        let (id1, _) = manager
            .create_connection(info.clone(), dummy_sender())
            .await;
        let (id2, _) = manager.create_connection(info, dummy_sender()).await;
        assert_ne!(id1, id2);
    }

    #[tokio::test]
    async fn remove_connection_with_matching_tx_id_removes_connection() {
        let manager = test_manager();
        let info = connection_info(Some("device-remove"));
        let (id, tx_id) = manager.create_connection(info, dummy_sender()).await;
        assert!(manager.get_connection(&id).await.is_some());

        manager.remove_connection(&id, Some(tx_id)).await;
        assert!(manager.get_connection(&id).await.is_none());
    }

    #[tokio::test]
    async fn remove_connection_with_non_matching_tx_id_does_not_remove() {
        let manager = test_manager();
        let info = connection_info(Some("device-no-remove"));
        let (id, _tx_id) = manager.create_connection(info, dummy_sender()).await;
        assert!(manager.get_connection(&id).await.is_some());

        // Wrong tx_id: connection should remain / 잘못된 tx_id면 연결 유지
        manager.remove_connection(&id, Some(999_u64)).await;
        assert!(manager.get_connection(&id).await.is_some());
    }

    #[tokio::test]
    async fn remove_connection_with_none_always_removes() {
        let manager = test_manager();
        let info = connection_info(Some("device-none"));
        let (id, _) = manager.create_connection(info, dummy_sender()).await;
        assert!(manager.get_connection(&id).await.is_some());

        manager.remove_connection(&id, None).await;
        assert!(manager.get_connection(&id).await.is_none());
    }

    #[tokio::test]
    async fn after_remove_reconnect_with_same_device_id_reuses_id() {
        // Connect, then remove; device_id_to_id keeps the id / 연결 후 제거해도 device_id_to_id에 id 유지
        let manager = test_manager();
        let device_id = "device-reconnect";
        let info = connection_info(Some(device_id));
        let (id1, tx_id) = manager
            .create_connection(info.clone(), dummy_sender())
            .await;
        manager.remove_connection(&id1, Some(tx_id)).await;
        assert!(manager.get_connection(&id1).await.is_none());

        // Reconnect with same device_id reuses the same id / 같은 device_id로 재연결 시 동일 id 재사용
        let (id2, _) = manager.create_connection(info, dummy_sender()).await;
        assert_eq!(id1, id2);
        assert!(manager.get_connection(&id2).await.is_some());
    }
}
