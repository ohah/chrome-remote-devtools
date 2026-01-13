// Configuration management / 설정 관리
use serde::{Deserialize, Serialize};

/// Server configuration / 서버 설정
#[derive(Debug, Clone, Serialize, Deserialize)]
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
    /// Development mode / 개발 모드
    /// When enabled, additional endpoints like /client.js are available / 활성화되면 /client.js 같은 추가 엔드포인트 사용 가능
    pub dev_mode: bool,
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
            // Default to debug mode in debug builds, production mode in release builds / 디버그 빌드에서는 디버그 모드, 릴리스 빌드에서는 프로덕션 모드
            dev_mode: cfg!(debug_assertions),
        }
    }
}

impl ServerConfig {
    /// Create configuration from environment variables / 환경 변수에서 설정 생성
    pub fn from_env() -> Self {
        let use_ssl = std::env::var("USE_SSL")
            .map(|v| v == "true")
            .unwrap_or(false);

        let default_port = if use_ssl { 8443 } else { 8080 };

        Self {
            port: std::env::var("PORT")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(default_port),
            host: std::env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            use_ssl,
            ssl_cert_path: std::env::var("SSL_CERT_PATH").ok(),
            ssl_key_path: std::env::var("SSL_KEY_PATH").ok(),
            log_enabled: std::env::var("LOG_ENABLED")
                .map(|v| v == "true")
                .unwrap_or(false),
            log_methods: std::env::var("LOG_METHODS").ok(),
            log_file: std::env::var("LOG_FILE_PATH").ok(),
            // Check DEV_MODE environment variable, default to debug_assertions / DEV_MODE 환경 변수 확인, 기본값은 debug_assertions
            dev_mode: std::env::var("DEV_MODE")
                .map(|v| v == "true")
                .unwrap_or_else(|_| cfg!(debug_assertions)),
        }
    }
}
