// Common test utilities / 공통 테스트 유틸리티
use chrome_remote_devtools_server::{ServerConfig, ServerHandle};
use tokio::time::{sleep, Duration, Instant};

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

    // Wait for server to be ready with retry mechanism / 재시도 메커니즘으로 서버 준비 대기
    let client = reqwest::Client::new();
    let url = format!("http://127.0.0.1:{}/json", port);
    let timeout = Duration::from_secs(5);
    let start = Instant::now();
    let mut retry_interval = Duration::from_millis(50);

    loop {
        match client
            .get(&url)
            .timeout(Duration::from_millis(100))
            .send()
            .await
        {
            Ok(resp) if resp.status().is_success() => {
                // Server is ready / 서버가 준비됨
                break;
            }
            _ => {
                if start.elapsed() >= timeout {
                    panic!("Server did not become ready within timeout / 서버가 타임아웃 내에 준비되지 않음");
                }
                sleep(retry_interval).await;
                // Exponential backoff with max interval / 최대 간격으로 지수 백오프
                retry_interval = (retry_interval * 2).min(Duration::from_millis(200));
            }
        }
    }

    handle
}

/// Stop test server / 테스트 서버 중지
pub async fn stop_test_server(handle: ServerHandle) {
    handle.stop().await.unwrap();
    // Wait a bit for cleanup / 정리 대기
    sleep(Duration::from_millis(100)).await;
}
