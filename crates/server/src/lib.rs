// Chrome Remote DevTools Server Library / Chrome Remote DevTools 서버 라이브러리
// This library provides the server functionality that can be used both as a standalone server
// and integrated into Tauri applications / 이 라이브러리는 독립 실행형 서버와 Tauri 애플리케이션에 통합 가능한 서버 기능을 제공합니다

mod config;
mod http_routes;
mod logging;
mod react_native;
mod server;
mod socket_server;

pub use config::ServerConfig;
pub use server::run_server;

/// Server error type / 서버 에러 타입
#[derive(Debug, thiserror::Error)]
pub enum ServerError {
    #[error("Server is already running / 서버가 이미 실행 중입니다")]
    AlreadyRunning,
    #[error("IO error / IO 오류: {0}")]
    Io(#[from] std::io::Error),
    #[error("TLS error / TLS 오류: {0}")]
    Tls(String),
    #[error("Certificate error / 인증서 오류: {0}")]
    Certificate(String),
    #[error("Other error / 기타 오류: {0}")]
    Other(String),
}

use std::sync::Arc;
use tokio::sync::RwLock;

/// Server task handle type / 서버 태스크 핸들 타입
type ServerTaskHandle = tokio::task::JoinHandle<Result<(), ServerError>>;

/// Server handle for managing server lifecycle / 서버 생명주기 관리를 위한 서버 핸들
pub struct ServerHandle {
    server: Arc<RwLock<Option<ServerTaskHandle>>>,
}

impl ServerHandle {
    /// Create a new server handle / 새로운 서버 핸들 생성
    pub fn new() -> Self {
        Self {
            server: Arc::new(RwLock::new(None)),
        }
    }

    /// Start server in background / 백그라운드에서 서버 시작
    pub async fn start(&self, config: ServerConfig) -> Result<(), ServerError> {
        let mut server = self.server.write().await;
        if server.is_some() {
            return Err(ServerError::AlreadyRunning);
        }

        let config_clone = config.clone();
        let handle = tokio::spawn(async move { run_server(config_clone).await });

        *server = Some(handle);
        Ok(())
    }

    /// Stop server / 서버 중지
    pub async fn stop(&self) -> Result<(), ServerError> {
        let mut server = self.server.write().await;
        if let Some(handle) = server.take() {
            handle.abort();
        }
        Ok(())
    }

    /// Check if server is running / 서버가 실행 중인지 확인
    pub async fn is_running(&self) -> bool {
        let server = self.server.read().await;
        server.is_some()
    }
}

impl Default for ServerHandle {
    fn default() -> Self {
        Self::new()
    }
}
