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
use tokio::sync::{oneshot, RwLock};

/// Server task handle type / 서버 태스크 핸들 타입
type ServerTaskHandle = tokio::task::JoinHandle<Result<(), ServerError>>;

/// Shutdown status / 종료 상태
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ShutdownStatus {
    /// Graceful shutdown completed successfully / graceful shutdown 성공적으로 완료
    Graceful,
    /// Shutdown completed but with issues / 종료되었지만 문제 있음
    WithIssues,
    /// Shutdown timeout / 종료 timeout
    Timeout,
    /// No server was running / 실행 중인 서버 없음
    NotRunning,
}

/// Server handle for managing server lifecycle / 서버 생명주기 관리를 위한 서버 핸들
pub struct ServerHandle {
    server: Arc<RwLock<Option<ServerTaskHandle>>>,
    socket_server: Arc<RwLock<Option<Arc<RwLock<SocketServer>>>>>, // Shared SocketServer instance wrapped in RwLock / RwLock으로 감싼 공유 SocketServer 인스턴스
    shutdown_tx: Arc<RwLock<Option<oneshot::Sender<()>>>>, // Shutdown signal sender / 종료 신호 송신자
}

impl ServerHandle {
    /// Create a new server handle / 새로운 서버 핸들 생성
    pub fn new() -> Self {
        Self {
            server: Arc::new(RwLock::new(None)),
            socket_server: Arc::new(RwLock::new(None)),
            shutdown_tx: Arc::new(RwLock::new(None)),
        }
    }

    /// Get or create shared SocketServer instance / 공유 SocketServer 인스턴스 가져오기 또는 생성
    /// If force_new is true, creates a completely new instance instead of reusing existing one / force_new가 true이면 기존 인스턴스를 재사용하지 않고 완전히 새 인스턴스 생성
    pub async fn get_or_create_socket_server(
        &self,
        logger: Arc<Logger>,
        enable_reactotron: bool,
        force_new: bool,
    ) -> Arc<RwLock<SocketServer>> {
        let mut socket_server_opt = self.socket_server.write().await;
        if force_new {
            // Create completely new instance / 완전히 새 인스턴스 생성
            eprintln!("[server] 🔄 Creating new SocketServer instance (force_new=true)");
            let _ = io::stderr().flush();
            let server = Arc::new(RwLock::new(SocketServer::new(logger, enable_reactotron)));
            *socket_server_opt = Some(server.clone());
            server
        } else if let Some(server) = socket_server_opt.as_ref() {
            // Update Reactotron server state based on enable_reactotron / enable_reactotron에 따라 Reactotron 서버 상태 업데이트
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

        // Check if server was running before stopping / 중지하기 전에 서버가 실행 중이었는지 확인
        let was_running = server.is_some();

        // Stop existing server if running / 실행 중인 서버가 있으면 중지
        if was_running {
            eprintln!("[server] 🛑 Stopping existing server before restart...");
            let _ = io::stderr().flush();

            // Completely reset internal state / 내부 상태 완전히 초기화
            drop(server); // Release lock before calling reset / reset 호출 전에 lock 해제
            let shutdown_status = self.reset().await;

            // Reacquire lock / lock 다시 획득
            server = self.server.write().await;

            // Log shutdown status / 종료 상태 로깅
            match shutdown_status {
                ShutdownStatus::Graceful => {
                    eprintln!("[server] ✅ Server stopped gracefully");
                }
                ShutdownStatus::WithIssues => {
                    eprintln!("[server] ⚠️ Server stopped but with issues");
                }
                ShutdownStatus::Timeout => {
                    eprintln!("[server] ⚠️ Server shutdown timeout");
                }
                ShutdownStatus::NotRunning => {
                    eprintln!("[server] ℹ️ No server was running");
                }
            }
            let _ = io::stderr().flush();
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
        // Get or create SocketServer instance / SocketServer 인스턴스 가져오기 또는 생성
        // If server was running, create completely new instance / 서버가 실행 중이었으면 완전히 새 인스턴스 생성
        let socket_server_rwlock = self
            .get_or_create_socket_server(
                logger.clone(),
                config.enable_reactotron_server,
                was_running,
            )
            .await;

        // Create shutdown channel / 종료 채널 생성
        let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();
        let mut shutdown_tx_guard = self.shutdown_tx.write().await;
        *shutdown_tx_guard = Some(shutdown_tx);
        drop(shutdown_tx_guard);

        let config_clone = config.clone();
        let socket_server_clone = socket_server_rwlock.clone();
        eprintln!(
            "[server] 🚀 Starting server on {}:{} (Reactotron: {})",
            config.host, config.port, config.enable_reactotron_server
        );
        let _ = io::stderr().flush();
        let handle = tokio::spawn(async move {
            // Get Arc<SocketServer> from RwLock for the server / 서버를 위해 RwLock에서 Arc<SocketServer> 가져오기
            let socket_server = socket_server_clone.read().await;
            // We need to clone the Arc, but we can't do that from a read guard / read guard에서 Arc를 클론할 수 없음
            // So we'll pass the RwLock and extract the SocketServer inside / 따라서 RwLock을 전달하고 내부에서 SocketServer 추출
            drop(socket_server);
            crate::server::run_server_with_socket_server(
                config_clone,
                socket_server_clone,
                shutdown_rx,
            )
            .await
        });

        *server = Some(handle);
        // Wait a bit for the server to start / 서버가 시작될 때까지 잠시 대기
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        Ok(())
    }

    /// Stop server / 서버 중지
    /// Completely stops the server and waits for resources to be released / 서버를 완전히 중지하고 리소스가 해제될 때까지 대기
    /// Returns shutdown status / 종료 상태 반환
    pub async fn stop(&self) -> Result<ShutdownStatus, ServerError> {
        eprintln!("[server] 🛑 Stopping server...");
        let _ = io::stderr().flush();

        // Completely reset internal state / 내부 상태 완전히 초기화
        let status = self.reset().await;

        eprintln!("[server] ✅ Server stopped (status: {:?})", status);
        let _ = io::stderr().flush();

        Ok(status)
    }

    /// Check if server is running / 서버가 실행 중인지 확인
    pub async fn is_running(&self) -> bool {
        let server = self.server.read().await;
        server.is_some()
    }

    /// Reset all internal state completely / 모든 내부 상태를 완전히 초기화
    /// This ensures a clean slate for the next server start / 다음 서버 시작을 위한 깨끗한 상태 보장
    /// Returns shutdown status / 종료 상태 반환
    pub async fn reset(&self) -> ShutdownStatus {
        eprintln!("[server] 🔄 Resetting ServerHandle internal state...");
        let _ = io::stderr().flush();

        // Stop server if running / 실행 중인 서버가 있으면 중지
        if let Some(handle) = self.server.write().await.take() {
            // Send shutdown signal first / 먼저 종료 신호 전송
            {
                let mut shutdown_tx_guard = self.shutdown_tx.write().await;
                if let Some(shutdown_tx) = shutdown_tx_guard.take() {
                    let _ = shutdown_tx.send(());
                }
            }

            // Wait for graceful shutdown with timeout / timeout을 두고 graceful shutdown 대기
            // Note: 5 seconds timeout is chosen as a balance between allowing enough time
            // for active connections to close gracefully and not blocking shutdown too long.
            // For production systems with many connections, consider making this configurable.
            // 참고: 5초 timeout은 활성 연결이 graceful하게 닫힐 수 있는 충분한 시간을 제공하면서
            // 종료를 너무 오래 블로킹하지 않는 균형점으로 선택되었습니다.
            // 많은 연결이 있는 프로덕션 시스템의 경우, 이를 설정 가능하게 만드는 것을 고려하세요.
            let shutdown_timeout = tokio::time::Duration::from_secs(5);
            let shutdown_status = tokio::time::timeout(shutdown_timeout, async {
                // Wait for task to finish / 태스크가 완료될 때까지 대기
                match handle.await {
                    Ok(Ok(())) => {
                        // Server completed gracefully / 서버가 graceful하게 완료됨
                        eprintln!("[server] ✅ Server completed graceful shutdown");
                        let _ = io::stderr().flush();
                        ShutdownStatus::Graceful
                    }
                    Ok(Err(e)) => {
                        // Server returned an error / 서버가 에러 반환
                        eprintln!("[server] ⚠️ Server shutdown with error: {}", e);
                        let _ = io::stderr().flush();
                        ShutdownStatus::WithIssues
                    }
                    Err(join_err) => {
                        // Task was aborted or panicked / 태스크가 abort되었거나 패닉 발생
                        eprintln!("[server] ⚠️ Server task error: {:?}", join_err);
                        let _ = io::stderr().flush();
                        ShutdownStatus::WithIssues
                    }
                }
            })
            .await;

            let status = match shutdown_status {
                Ok(ShutdownStatus::Graceful) => {
                    eprintln!("[server] ✅ Graceful shutdown completed successfully");
                    let _ = io::stderr().flush();
                    ShutdownStatus::Graceful
                }
                Ok(other) => {
                    eprintln!("[server] ⚠️ Server shutdown completed but with issues");
                    let _ = io::stderr().flush();
                    other
                }
                Err(_) => {
                    // Timeout - graceful shutdown didn't complete in time / timeout - graceful shutdown이 시간 내에 완료되지 않음
                    eprintln!("[server] ⚠️ Graceful shutdown timeout, server may not have closed properly");
                    let _ = io::stderr().flush();
                    ShutdownStatus::Timeout
                }
            };

            // Clear SocketServer connections and drop instance / SocketServer 연결 초기화 및 인스턴스 드롭
            {
                let socket_server_opt = self.socket_server.read().await;
                if let Some(existing_server) = socket_server_opt.as_ref() {
                    let server_guard = existing_server.write().await;
                    server_guard.clear_all_connections().await;
                    drop(server_guard);
                }
            }

            // Completely drop SocketServer instance / SocketServer 인스턴스 완전히 드롭
            {
                let mut socket_server_opt = self.socket_server.write().await;
                *socket_server_opt = None;
            }

            // Clear shutdown channel / 종료 채널 초기화
            {
                let mut shutdown_tx_guard = self.shutdown_tx.write().await;
                *shutdown_tx_guard = None;
            }

            eprintln!("[server] ✅ ServerHandle internal state completely reset");
            let _ = io::stderr().flush();
            return status;
        }

        // No server was running / 실행 중인 서버 없음
        ShutdownStatus::NotRunning
    }
}

impl Default for ServerHandle {
    fn default() -> Self {
        Self::new()
    }
}
