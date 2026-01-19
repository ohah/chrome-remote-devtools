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
    /// Enable Reactotron server / Reactotron 서버 활성화
    pub enable_reactotron_server: bool,
    /// Client.js resource path (for Tauri builds) / Client.js 리소스 경로 (Tauri 빌드용)
    /// This is the resolved path to the bundled client.js file / 번들된 client.js 파일의 해결된 경로
    pub client_js_resource_path: Option<String>,
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
            enable_reactotron_server: false,
            client_js_resource_path: None,
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
            enable_reactotron_server: std::env::var("ENABLE_REACTOTRON_SERVER")
                .map(|v| v == "true")
                .unwrap_or(false),
            client_js_resource_path: None, // Resource path is set by Tauri app, not from env / 리소스 경로는 Tauri 앱에서 설정되며 환경 변수에서 가져오지 않음
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    /// Test default configuration / 기본 설정 테스트
    fn test_default_config() {
        let config = ServerConfig::default();
        assert_eq!(config.port, 8080);
        assert_eq!(config.host, "0.0.0.0");
        assert!(!config.use_ssl);
        assert!(config.ssl_cert_path.is_none());
        assert!(config.ssl_key_path.is_none());
        assert!(!config.log_enabled);
        assert!(config.log_methods.is_none());
        assert!(config.log_file.is_none());
    }

    #[test]
    /// Test configuration serialization / 설정 직렬화 테스트
    fn test_config_serialization() {
        let config = ServerConfig::default();
        let json = serde_json::to_string(&config).unwrap();
        assert!(json.contains("8080"));
        assert!(json.contains("0.0.0.0"));
    }

    #[test]
    /// Test configuration deserialization / 설정 역직렬화 테스트
    fn test_config_deserialization() {
        let json = r#"{"port":9000,"host":"127.0.0.1","use_ssl":true,"ssl_cert_path":"cert.pem","ssl_key_path":"key.pem","log_enabled":true,"log_methods":"test","log_file":"log.txt","dev_mode":true,"enable_reactotron_server":false}"#;
        let config: ServerConfig = serde_json::from_str(json).unwrap();
        assert_eq!(config.port, 9000);
        assert_eq!(config.host, "127.0.0.1");
        assert!(config.use_ssl);
        assert_eq!(config.ssl_cert_path, Some("cert.pem".to_string()));
        assert_eq!(config.ssl_key_path, Some("key.pem".to_string()));
        assert!(config.log_enabled);
        assert_eq!(config.log_methods, Some("test".to_string()));
        assert_eq!(config.log_file, Some("log.txt".to_string()));
        assert!(config.dev_mode);
    }

    #[test]
    /// Test from_env with SSL enabled / SSL이 활성화된 경우 from_env 테스트
    fn test_from_env_with_ssl() {
        // Save original values / 원본 값 저장
        let original_use_ssl = std::env::var("USE_SSL").ok();
        let original_port = std::env::var("PORT").ok();
        let original_cert = std::env::var("SSL_CERT_PATH").ok();
        let original_key = std::env::var("SSL_KEY_PATH").ok();

        // Set test values / 테스트 값 설정
        std::env::set_var("USE_SSL", "true");
        std::env::set_var("PORT", "8443");
        std::env::set_var("SSL_CERT_PATH", "cert.pem");
        std::env::set_var("SSL_KEY_PATH", "key.pem");

        let config = ServerConfig::from_env();
        assert!(config.use_ssl);
        assert_eq!(config.port, 8443);
        assert_eq!(config.ssl_cert_path, Some("cert.pem".to_string()));
        assert_eq!(config.ssl_key_path, Some("key.pem".to_string()));

        // Restore original values / 원본 값 복원
        if let Some(val) = original_use_ssl {
            std::env::set_var("USE_SSL", val);
        } else {
            std::env::remove_var("USE_SSL");
        }
        if let Some(val) = original_port {
            std::env::set_var("PORT", val);
        } else {
            std::env::remove_var("PORT");
        }
        if let Some(val) = original_cert {
            std::env::set_var("SSL_CERT_PATH", val);
        } else {
            std::env::remove_var("SSL_CERT_PATH");
        }
        if let Some(val) = original_key {
            std::env::set_var("SSL_KEY_PATH", val);
        } else {
            std::env::remove_var("SSL_KEY_PATH");
        }
    }
}
