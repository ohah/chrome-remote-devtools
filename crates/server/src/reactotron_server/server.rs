// Reactotron server management / Reactotron 서버 관리
use crate::logging::Logger;
use crate::reactotron_server::handler::{ClientConnections, Subscriptions};
use std::sync::Arc;
use tokio::sync::RwLock;

/// Reactotron server state / Reactotron 서버 상태
pub struct ReactotronServer {
    pub connections: ClientConnections,
    pub subscriptions: Subscriptions,
    pub logger: Arc<Logger>,
    pub connection_id_counter: Arc<RwLock<u32>>,
}

impl ReactotronServer {
    /// Create new Reactotron server / 새로운 Reactotron 서버 생성
    pub fn new(logger: Arc<Logger>) -> Self {
        Self {
            connections: Arc::new(RwLock::new(std::collections::HashMap::new())),
            subscriptions: Arc::new(RwLock::new(Vec::new())),
            logger,
            connection_id_counter: Arc::new(RwLock::new(0)),
        }
    }

    /// Get next connection ID / 다음 연결 ID 가져오기
    pub async fn next_connection_id(&self) -> u32 {
        let mut counter = self.connection_id_counter.write().await;
        *counter += 1;
        *counter
    }

    /// Get all client IDs / 모든 클라이언트 ID 가져오기
    pub async fn get_all_client_ids(&self) -> Vec<String> {
        let connections = self.connections.read().await;
        connections.keys().cloned().collect()
    }

    /// Get connection count / 연결 수 가져오기
    pub async fn get_connection_count(&self) -> usize {
        let connections = self.connections.read().await;
        connections.len()
    }
}
