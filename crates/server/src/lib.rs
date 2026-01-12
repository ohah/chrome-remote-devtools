// Chrome Remote DevTools Server Library / Chrome Remote DevTools 서버 라이브러리
// This library provides the server functionality that can be used both as a standalone server
// and integrated into Tauri applications / 이 라이브러리는 독립 실행형 서버와 Tauri 애플리케이션에 통합 가능한 서버 기능을 제공합니다

use std::sync::Arc;
use tokio::sync::RwLock;

/// Server configuration / 서버 설정
#[derive(Debug, Clone)]
pub struct ServerConfig {
    /// Server port / 서버 포트
    pub port: u16,
    /// Server host / 서버 호스트
    pub host: String,
    /// Enable SSL/TLS / SSL/TLS 활성화
    pub use_ssl: bool,
    /// SSL certificate path / SSL 인증서 경로
    pub ssl_cert_path: Option<String>,
    /// SSL key path / SSL 키 경로
    pub ssl_key_path: Option<String>,
    /// Enable logging / 로깅 활성화
    pub log_enabled: bool,
    /// Comma-separated list of methods to log / 로깅할 메소드 목록 (쉼표로 구분)
    pub log_methods: Option<String>,
    /// Log file path / 로그 파일 경로
    pub log_file: Option<String>,
}

impl Default for ServerConfig {
    fn default() -> Self {
        Self {
            port: 8080,
            host: "0.0.0.0".to_string(),
            use_ssl: false,
            ssl_cert_path: None,
            ssl_key_path: None,
            log_enabled: false,
            log_methods: None,
            log_file: None,
        }
    }
}

/// Server error type / 서버 에러 타입
#[derive(Debug, thiserror::Error)]
pub enum ServerError {
    #[error("Server is already running / 서버가 이미 실행 중입니다")]
    AlreadyRunning,
    #[error("IO error / IO 오류: {0}")]
    Io(#[from] std::io::Error),
    #[error("Other error / 기타 오류: {0}")]
    Other(String),
}

/// Server handle for managing server lifecycle / 서버 생명주기 관리를 위한 서버 핸들
pub struct ServerHandle {
    server: Arc<RwLock<Option<tokio::task::JoinHandle<Result<(), ServerError>>>>>,
}

impl ServerHandle {
    /// Create a new server handle / 새로운 서버 핸들 생성
    pub fn new() -> Self {
        Self {
            server: Arc::new(RwLock::new(None)),
        }
    }

    /// Start server in background / 백그라운드에서 서버 시작
    pub async fn start(&self, _config: ServerConfig) -> Result<(), ServerError> {
        let mut server = self.server.write().await;
        if server.is_some() {
            return Err(ServerError::AlreadyRunning);
        }

        let handle = tokio::spawn(async move {
            // TODO: Implement server startup logic / 서버 시작 로직 구현
            // run_server(config).await
            Ok(())
        });

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
