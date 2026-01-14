// Common test utilities / 공통 테스트 유틸리티
use chrome_remote_devtools_server::{ServerConfig, ServerHandle};
use tokio::time::{sleep, Duration};

/// Test server configuration / 테스트 서버 설정
pub fn test_config(port: u16) -> ServerConfig {
    ServerConfig {
        port,
        host: "127.0.0.1".to_string(),
        use_ssl: false,
        ssl_cert_path: None,
        ssl_key_path: None,
        log_enabled: false,
        log_methods: None,
        log_file: None,
        dev_mode: true,
    }
}

/// Start test server / 테스트 서버 시작
pub async fn start_test_server(port: u16) -> ServerHandle {
    let config = test_config(port);
    let handle = ServerHandle::new();
    handle.start(config).await.unwrap();

    // Wait for server to be ready / 서버 준비 대기
    sleep(Duration::from_millis(500)).await;

    handle
}

/// Stop test server / 테스트 서버 중지
pub async fn stop_test_server(handle: ServerHandle) {
    handle.stop().await.unwrap();
    // Wait a bit for cleanup / 정리 대기
    sleep(Duration::from_millis(100)).await;
}
