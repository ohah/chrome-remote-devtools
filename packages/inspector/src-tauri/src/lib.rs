// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use chrome_remote_devtools_server::{ServerConfig, ServerHandle, ShutdownStatus};
use std::io::{self, Write};
use std::sync::{Arc, OnceLock};
use tauri::Manager;
use tokio::sync::RwLock;

// Global server handle / 전역 서버 핸들
static SERVER_HANDLE: OnceLock<Arc<RwLock<ServerHandle>>> = OnceLock::new();

// Global Reactotron server enabled state / 전역 Reactotron 서버 활성화 상태
static REACTOTRON_ENABLED: OnceLock<Arc<RwLock<bool>>> = OnceLock::new();

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
        enable_reactotron_server: false,  // Default to false / 기본값은 false
        client_js_resource_path: None, // Not available in command context / 명령 컨텍스트에서는 사용 불가
    };

    server.start(config).await.map_err(|e| e.to_string())?;
    Ok(())
}

/// Stop the WebSocket server / WebSocket 서버 중지
/// Returns shutdown status / 종료 상태 반환
#[tauri::command]
async fn stop_server() -> Result<String, String> {
    if let Some(handle) = SERVER_HANDLE.get() {
        let server = handle.write().await;
        let status = server.stop().await.map_err(|e| e.to_string())?;
        Ok(format!("{:?}", status))
    } else {
        Ok(format!("{:?}", ShutdownStatus::NotRunning))
    }
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

/// Start Reactotron server / Reactotron 서버 시작
/// This will restart the main server with Reactotron enabled / 메인 서버를 Reactotron 활성화 상태로 재시작합니다
/// Returns shutdown status / 종료 상태 반환
#[tauri::command]
async fn start_reactotron_server(port: u16, host: String) -> Result<String, String> {
    eprintln!(
        "[reactotron] 🔄 Starting Reactotron server (port: {}, host: {})",
        port, host
    );
    let _ = io::stderr().flush();

    // Stop existing server completely before starting new one / 새 서버 시작 전에 기존 서버 완전히 중지
    let shutdown_status = if let Some(handle) = SERVER_HANDLE.get() {
        eprintln!("[reactotron] 🛑 Stopping existing server completely...");
        let _ = io::stderr().flush();
        let server = handle.write().await;
        let status = server.stop().await.map_err(|e| {
            eprintln!("[reactotron] ❌ Failed to stop server: {}", e);
            let _ = io::stderr().flush();
            e.to_string()
        })?;
        eprintln!("[reactotron] ✅ Server stopped (status: {:?})", status);
        let _ = io::stderr().flush();
        format!("{:?}", status)
    } else {
        format!("{:?}", ShutdownStatus::NotRunning)
    };

    // Set Reactotron enabled / Reactotron 활성화 설정
    let reactotron_enabled = REACTOTRON_ENABLED.get_or_init(|| Arc::new(RwLock::new(false)));
    *reactotron_enabled.write().await = true;
    eprintln!("[reactotron] ✅ Reactotron enabled flag set to true");
    let _ = io::stderr().flush();

    // Start server with Reactotron enabled / Reactotron 활성화 상태로 서버 시작
    let handle = SERVER_HANDLE.get_or_init(|| Arc::new(RwLock::new(ServerHandle::new())));
    let server = handle.write().await;
    let config = ServerConfig {
        port,
        host: host.clone(),
        use_ssl: false,
        ssl_cert_path: None,
        ssl_key_path: None,
        log_enabled: true,
        log_methods: None,
        log_file: None,
        dev_mode: cfg!(debug_assertions),
        enable_reactotron_server: true,
        client_js_resource_path: None, // Not available in command context / 명령 컨텍스트에서는 사용 불가
    };

    eprintln!("[reactotron] 🚀 Starting server with Reactotron enabled...");
    let _ = io::stderr().flush();
    server.start(config).await.map_err(|e| {
        eprintln!("[reactotron] ❌ Failed to start server: {}", e);
        let _ = io::stderr().flush();
        e.to_string()
    })?;
    eprintln!(
        "[reactotron] ✅ Server started successfully with Reactotron enabled on ws://{}:{}",
        host, port
    );
    let _ = io::stderr().flush();
    Ok(shutdown_status)
}

/// Stop Reactotron server / Reactotron 서버 중지
/// This will restart the main server with Reactotron disabled on port 8080 / 메인 서버를 Reactotron 비활성화 상태로 8080 포트에서 재시작합니다
/// Returns shutdown status / 종료 상태 반환
#[tauri::command]
async fn stop_reactotron_server(port: u16, host: String) -> Result<String, String> {
    eprintln!(
        "[reactotron] 🔄 Stopping Reactotron server (current port: {}, host: {})",
        port, host
    );
    let _ = io::stderr().flush();

    // Stop existing server completely before starting new one / 새 서버 시작 전에 기존 서버 완전히 중지
    let shutdown_status = if let Some(handle) = SERVER_HANDLE.get() {
        eprintln!("[reactotron] 🛑 Stopping existing server completely...");
        let _ = io::stderr().flush();
        let server = handle.write().await;
        let status = server.stop().await.map_err(|e| {
            eprintln!("[reactotron] ❌ Failed to stop server: {}", e);
            let _ = io::stderr().flush();
            e.to_string()
        })?;
        eprintln!("[reactotron] ✅ Server stopped (status: {:?})", status);
        let _ = io::stderr().flush();
        format!("{:?}", status)
    } else {
        format!("{:?}", ShutdownStatus::NotRunning)
    };

    // Set Reactotron disabled / Reactotron 비활성화 설정
    let reactotron_enabled = REACTOTRON_ENABLED.get_or_init(|| Arc::new(RwLock::new(false)));
    *reactotron_enabled.write().await = false;
    eprintln!("[reactotron] ✅ Reactotron enabled flag set to false");
    let _ = io::stderr().flush();

    // Start server with Reactotron disabled on port 8080 / Reactotron 비활성화 상태로 8080 포트에서 서버 시작
    let handle = SERVER_HANDLE.get_or_init(|| Arc::new(RwLock::new(ServerHandle::new())));
    let server = handle.write().await;
    let config = ServerConfig {
        port: 8080, // Always use port 8080 when stopping Reactotron / Reactotron 중지 시 항상 8080 포트 사용
        host: host.clone(),
        use_ssl: false,
        ssl_cert_path: None,
        ssl_key_path: None,
        log_enabled: true,
        log_methods: None,
        log_file: None,
        dev_mode: cfg!(debug_assertions),
        enable_reactotron_server: false,
        client_js_resource_path: None, // Not available in command context / 명령 컨텍스트에서는 사용 불가
    };

    eprintln!("[reactotron] 🚀 Starting server with Reactotron disabled on port 8080...");
    let _ = io::stderr().flush();
    server.start(config).await.map_err(|e| {
        eprintln!("[reactotron] ❌ Failed to start server: {}", e);
        let _ = io::stderr().flush();
        e.to_string()
    })?;
    eprintln!(
        "[reactotron] ✅ Server started successfully with Reactotron disabled on ws://{}:8080",
        host
    );
    let _ = io::stderr().flush();
    Ok(shutdown_status)
}

/// Check if Reactotron server is running / Reactotron 서버가 실행 중인지 확인
#[tauri::command]
async fn is_reactotron_server_running() -> bool {
    if let Some(reactotron_enabled) = REACTOTRON_ENABLED.get() {
        *reactotron_enabled.read().await
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

    // Initialize Reactotron enabled state / Reactotron 활성화 상태 초기화
    let reactotron_enabled = Arc::new(RwLock::new(false));
    REACTOTRON_ENABLED.set(reactotron_enabled).ok();

    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init());

    #[cfg(debug_assertions)]
    {
        builder = builder.plugin(tauri_plugin_mcp_bridge::init());
    }

    builder
        .invoke_handler(tauri::generate_handler![
            greet,
            start_server,
            stop_server,
            is_server_running,
            start_reactotron_server,
            stop_reactotron_server,
            is_reactotron_server_running
        ])
        .setup(move |app| {
            // Resolve client.js resource path / client.js 리소스 경로 해결
            let client_js_path = app
                .path()
                .resolve("index.iife.js", tauri::path::BaseDirectory::Resource)
                .ok()
                .map(|p| p.to_string_lossy().to_string());

            // Log resource path resolution for debugging / 디버깅을 위한 리소스 경로 해결 로깅
            if let Some(ref path) = client_js_path {
                eprintln!("[tauri] ✅ Resolved client.js resource path: {}", path);
                let _ = io::stderr().flush();
            } else {
                eprintln!(
                    "[tauri] ⚠️ Failed to resolve client.js resource path, will use fallback"
                );
                let _ = io::stderr().flush();
            }

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
                    enable_reactotron_server: false, // Start without Reactotron by default / 기본적으로 Reactotron 없이 시작
                    client_js_resource_path: client_js_path, // Pass resolved resource path / 해결된 리소스 경로 전달
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
