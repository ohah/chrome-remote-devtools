// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use chrome_remote_devtools_server::{ServerConfig, ServerHandle};
use std::sync::{Arc, OnceLock};
use tokio::sync::RwLock;

// Global server handle / 전역 서버 핸들
static SERVER_HANDLE: OnceLock<Arc<RwLock<ServerHandle>>> = OnceLock::new();

/// Start the WebSocket server / WebSocket 서버 시작
#[tauri::command]
async fn start_server(port: u16, host: String) -> Result<(), String> {
    let handle = SERVER_HANDLE.get_or_init(|| Arc::new(RwLock::new(ServerHandle::new())));

    let server = handle.write().await;
    let config = ServerConfig {
        port,
        host,
        use_ssl: false,
        ssl_cert_path: None,
        ssl_key_path: None,
        log_enabled: true,
        log_methods: None,
        log_file: None,
        dev_mode: cfg!(debug_assertions), // Enable dev mode only in debug builds / 디버그 빌드에서만 개발 모드 활성화
    };

    server.start(config).await.map_err(|e| e.to_string())?;
    Ok(())
}

/// Stop the WebSocket server / WebSocket 서버 중지
#[tauri::command]
async fn stop_server() -> Result<(), String> {
    if let Some(handle) = SERVER_HANDLE.get() {
        let server = handle.write().await;
        server.stop().await.map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Check if server is running / 서버가 실행 중인지 확인
#[tauri::command]
async fn is_server_running() -> bool {
    if let Some(handle) = SERVER_HANDLE.get() {
        let server = handle.read().await;
        server.is_running().await
    } else {
        false
    }
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Start server automatically in Tauri mode / Tauri 모드에서 자동으로 서버 시작
    let server_handle = Arc::new(RwLock::new(ServerHandle::new()));
    SERVER_HANDLE.set(server_handle.clone()).ok();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            start_server,
            stop_server,
            is_server_running
        ])
        .setup(move |_app| {
            // Start server after Tauri runtime is ready / Tauri 런타임이 준비된 후 서버 시작
            let server_handle_clone = server_handle.clone();
            tauri::async_runtime::spawn(async move {
                let config = ServerConfig {
                    port: 8080,
                    host: "0.0.0.0".to_string(), // Bind to all interfaces for external access / 외부 접속을 위해 모든 인터페이스에 바인딩
                    use_ssl: false,
                    ssl_cert_path: None,
                    ssl_key_path: None,
                    log_enabled: true,
                    log_methods: None,
                    log_file: None,
                    dev_mode: cfg!(debug_assertions), // Enable dev mode only in debug builds / 디버그 빌드에서만 개발 모드 활성화
                };

                let server = server_handle_clone.write().await;
                if let Err(e) = server.start(config).await {
                    eprintln!("Failed to start server: {}", e);
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    // Test greet function / greet 함수 테스트
    #[test]
    fn test_greet() {
        let result = greet("World");
        assert!(result.contains("Hello"));
        assert!(result.contains("World"));
    }

    // Test greet with empty string / 빈 문자열로 greet 테스트
    #[test]
    fn test_greet_empty() {
        let result = greet("");
        assert!(result.contains("Hello"));
    }
}
