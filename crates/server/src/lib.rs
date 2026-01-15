// Chrome Remote DevTools Server Library / Chrome Remote DevTools 서버 라이브러리
// This library provides the server functionality that can be used both as a standalone server
// and integrated into Tauri applications / 이 라이브러리는 독립 실행형 서버와 Tauri 애플리케이션에 통합 가능한 서버 기능을 제공합니다

mod config;
mod http_routes;
mod logging;
mod react_native;
mod reactotron_server;
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

use crate::logging::Logger;
use crate::socket_server::SocketServer;
use std::io::{self, Write};
use std::sync::Arc;
use tokio::sync::RwLock;

/// Server task handle type / 서버 태스크 핸들 타입
type ServerTaskHandle = tokio::task::JoinHandle<Result<(), ServerError>>;

/// Server handle for managing server lifecycle / 서버 생명주기 관리를 위한 서버 핸들
pub struct ServerHandle {
    server: Arc<RwLock<Option<ServerTaskHandle>>>,
    socket_server: Arc<RwLock<Option<Arc<RwLock<SocketServer>>>>>, // Shared SocketServer instance wrapped in RwLock / RwLock으로 감싼 공유 SocketServer 인스턴스
}

impl ServerHandle {
    /// Create a new server handle / 새로운 서버 핸들 생성
    pub fn new() -> Self {
        Self {
            server: Arc::new(RwLock::new(None)),
            socket_server: Arc::new(RwLock::new(None)),
        }
    }

    /// Get or create shared SocketServer instance / 공유 SocketServer 인스턴스 가져오기 또는 생성
    pub async fn get_or_create_socket_server(
        &self,
        logger: Arc<Logger>,
        enable_reactotron: bool,
    ) -> Arc<RwLock<SocketServer>> {
        let mut socket_server_opt = self.socket_server.write().await;
        if let Some(server) = socket_server_opt.as_ref() {
            // Always update Reactotron server state based on enable_reactotron / enable_reactotron에 따라 항상 Reactotron 서버 상태 업데이트
            let mut server_guard = server.write().await;
            if enable_reactotron {
                server_guard.enable_reactotron_server();
            } else {
                server_guard.disable_reactotron_server();
            }
            drop(server_guard);
            // Return existing instance / 기존 인스턴스 반환
            server.clone()
        } else {
            // Create new instance / 새 인스턴스 생성
            let server = Arc::new(RwLock::new(SocketServer::new(logger, enable_reactotron)));
            *socket_server_opt = Some(server.clone());
            server
        }
    }

    /// Start server in background / 백그라운드에서 서버 시작
    /// If server is already running, it will be stopped and restarted / 서버가 이미 실행 중이면 중지하고 재시작합니다
    pub async fn start(&self, config: ServerConfig) -> Result<(), ServerError> {
        let mut server = self.server.write().await;

        // Stop existing server if running / 실행 중인 서버가 있으면 중지
        if let Some(handle) = server.take() {
            eprintln!("[server] 🛑 Stopping existing server before restart...");
            let _ = io::stderr().flush();
            handle.abort();
            // Wait a bit for the server to fully stop / 서버가 완전히 중지될 때까지 잠시 대기
            tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
        }

        // Get or create shared SocketServer / 공유 SocketServer 가져오기 또는 생성
        let logger = Arc::new(
            Logger::new(
                config.log_enabled,
                config.log_methods.clone(),
                config.log_file.clone(),
            )
            .map_err(ServerError::Io)?,
        );
        let socket_server_rwlock = self.get_or_create_socket_server(logger.clone(), config.enable_reactotron_server).await;

        let config_clone = config.clone();
        let socket_server_clone = socket_server_rwlock.clone();
        eprintln!("[server] 🚀 Starting server on {}:{} (Reactotron: {})",
                  config.host, config.port, config.enable_reactotron_server);
        let _ = io::stderr().flush();
        let handle = tokio::spawn(async move {
            // Get Arc<SocketServer> from RwLock for the server / 서버를 위해 RwLock에서 Arc<SocketServer> 가져오기
            let socket_server = socket_server_clone.read().await;
            // We need to clone the Arc, but we can't do that from a read guard / read guard에서 Arc를 클론할 수 없음
            // So we'll pass the RwLock and extract the SocketServer inside / 따라서 RwLock을 전달하고 내부에서 SocketServer 추출
            drop(socket_server);
            crate::server::run_server_with_socket_server(config_clone, socket_server_clone).await
        });

        *server = Some(handle);
        // Wait a bit for the server to start / 서버가 시작될 때까지 잠시 대기
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        Ok(())
    }

    /// Stop server / 서버 중지
    pub async fn stop(&self) -> Result<(), ServerError> {
        let mut server = self.server.write().await;
        if let Some(handle) = server.take() {
            eprintln!("[server] 🛑 Stopping server...");
            let _ = io::stderr().flush();
            handle.abort();
            // Wait a bit for the server to fully stop / 서버가 완전히 중지될 때까지 잠시 대기
            tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
            eprintln!("[server] ✅ Server stopped");
            let _ = io::stderr().flush();
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
