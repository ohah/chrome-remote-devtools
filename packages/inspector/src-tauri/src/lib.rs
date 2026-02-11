// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use chrome_remote_devtools_server::{ServerConfig, ServerHandle, ShutdownStatus};
use std::sync::{Arc, OnceLock};
use tauri::Manager;
use tokio::sync::RwLock;

/// Response for Metro proxy request (no Origin header so Metro security middleware allows) /
/// Metro 프록시 응답 (Origin 미전송으로 Metro 보안 미들웨어 통과)
#[derive(serde::Serialize)]
struct MetroProxyResponse {
    status: u16,
    body: String,
}

// Global server handle / 전역 서버 핸들
static SERVER_HANDLE: OnceLock<Arc<RwLock<ServerHandle>>> = OnceLock::new();

/// Resolve client.js resource path from app / 앱에서 client.js 리소스 경로 해결
fn resolve_client_js_path(app: &tauri::AppHandle) -> Option<String> {
    app.path()
        .resolve("index.iife.js", tauri::path::BaseDirectory::Resource)
        .ok()
        .map(|p| p.to_string_lossy().to_string())
}

/// Start the WebSocket server (port/host follow Inspector Server URL setting) /
/// WebSocket 서버 시작 (포트/호스트는 인스펙터 Server URL 설정을 따름)
#[tauri::command]
async fn start_server(app: tauri::AppHandle, port: u16, host: String) -> Result<(), String> {
    let handle = SERVER_HANDLE.get_or_init(|| Arc::new(RwLock::new(ServerHandle::new())));
    let client_js_resource_path = resolve_client_js_path(&app);

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
        client_js_resource_path,
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

/// Result of adb reverse command for frontend / 프론트엔드용 adb reverse 명령 결과
#[derive(serde::Serialize)]
struct AdbReverseResult {
    /// Whether the command succeeded / 명령 성공 여부
    success: bool,
    /// Message (success text or error description) / 메시지 (성공 문구 또는 에러 설명)
    message: String,
}

/// Run `adb reverse tcp:{port} tcp:{port}` so Android device/emulator can reach the devtools server on host. Port follows Inspector Server URL setting /
/// Android 기기/에뮬레이터가 호스트의 devtools 서버에 접근하도록 adb reverse 실행. 포트는 인스펙터 Server URL 설정 따름
/// Returns structured result for UI (success + message) / UI용 구조화 결과(success + message) 반환
#[tauri::command]
fn adb_reverse_port(port: u16) -> Result<AdbReverseResult, String> {
    let tcp_port = format!("tcp:{}", port);
    let output = std::process::Command::new("adb")
        .args(["reverse", tcp_port.as_str(), tcp_port.as_str()])
        .output()
        .map_err(|e| {
            let msg = e.to_string();
            if msg.contains("No such file") || msg.contains("not found") || msg.contains("ENOENT") {
                "adb not found. Install Android SDK platform-tools and add adb to PATH.".to_string()
            } else {
                format!("Failed to run adb: {}", msg)
            }
        })?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    let combined = format!("{}{}", stdout, stderr).trim().to_string();

    if output.status.success() {
        let message = if combined.is_empty() {
            format!("adb reverse tcp:{} tcp:{} succeeded.", port, port)
        } else {
            combined
        };
        Ok(AdbReverseResult {
            success: true,
            message,
        })
    } else {
        let message = if combined.is_empty() {
            "adb reverse failed. Check that an Android device or emulator is connected (adb devices).".to_string()
        } else {
            combined
        };
        Ok(AdbReverseResult {
            success: false,
            message,
        })
    }
}

/// Fetch URL from Rust (no Origin header) so Metro securityHeadersMiddleware allows the request /
/// Rust에서 Origin 헤더 없이 요청해 Metro securityHeadersMiddleware 통과
#[tauri::command]
async fn fetch_metro_proxy(url: String) -> Result<MetroProxyResponse, String> {
    let client = reqwest::Client::new();
    let resp = client.get(&url).send().await.map_err(|e| e.to_string())?;
    let status = resp.status().as_u16();
    let body = resp.text().await.map_err(|e| e.to_string())?;
    Ok(MetroProxyResponse { status, body })
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Server is started by frontend via start_server(port, host) so it follows Inspector Server URL /
    // 서버는 인스펙터 Server URL에 맞춰 프론트엔드에서 start_server(port, host)로 시작됨

    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_http::init());

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
            adb_reverse_port,
            fetch_metro_proxy
        ])
        .setup(|_app| {
            // Server is started by frontend via start_server(port, host) using Inspector Server URL setting /
            // 서버는 인스펙터 Server URL 설정에 따라 프론트엔드에서 start_server(port, host)로 시작됨
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

    // fetch_metro_proxy returns Err when connection fails (no server on port) /
    // fetch_metro_proxy는 연결 실패 시(해당 포트에 서버 없음) Err 반환
    #[tokio::test]
    async fn test_fetch_metro_proxy_connection_refused_returns_err() {
        let result = fetch_metro_proxy("http://127.0.0.1:59999/".to_string()).await;
        assert!(result.is_err());
    }

    // fetch_metro_proxy returns Ok with status and body for a reachable URL (requires network) /
    // fetch_metro_proxy는 접근 가능한 URL에 대해 status와 body를 담은 Ok 반환 (네트워크 필요)
    #[tokio::test]
    #[ignore = "requires network access to http://example.com"]
    async fn test_fetch_metro_proxy_success_returns_ok() {
        let result = fetch_metro_proxy("http://example.com".to_string()).await;
        assert!(result.is_ok());
        let resp = result.unwrap();
        assert_eq!(resp.status, 200);
        assert!(!resp.body.is_empty());
    }
}
