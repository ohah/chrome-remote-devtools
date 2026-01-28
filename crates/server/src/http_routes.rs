// HTTP routing implementation / HTTP 라우팅 구현
use crate::socket_server::SocketServer;
use axum::extract::ws::WebSocketUpgrade;
use axum::extract::{Path, Query, State};
use axum::http::{header, StatusCode};
use axum::response::{IntoResponse, Json, Response};
use axum::routing::{get, post};
use axum::Router;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::fs;
use tokio::sync::RwLock;

/// Create HTTP router / HTTP 라우터 생성
pub fn create_router(
    dev_mode: bool,
    client_js_resource_path: Option<String>,
) -> Router<Arc<RwLock<SocketServer>>> {
    let mut router = Router::new()
        .route("/json", get(get_all_clients))
        .route("/json/clients", get(get_all_clients_detailed))
        .route("/json/inspectors", get(get_all_inspectors))
        .route("/json/client/:id", get(get_client))
        .route("/inspector/device", get(handle_inspector_device_http))
        .route("/open-debugger", post(handle_open_debugger))
        .route("/remote/debug/*path", get(handle_websocket_upgrade))
        .route("/", get(handle_root_websocket_upgrade));

    // Add /client.js route if dev_mode is enabled or resource path is provided / dev_mode가 활성화되었거나 리소스 경로가 제공되면 /client.js 라우트 추가
    // In production (Tauri), resource path is provided / 프로덕션(Tauri)에서는 리소스 경로가 제공됨
    // In development, dev_mode enables the endpoint / 개발 환경에서는 dev_mode가 엔드포인트를 활성화함
    if dev_mode || client_js_resource_path.is_some() {
        let resource_path = client_js_resource_path.clone();
        router = router.route(
            "/client.js",
            get(move |State(server): State<Arc<RwLock<SocketServer>>>| {
                let path = resource_path.clone();
                async move { serve_client_script(server, path).await }
            }),
        );
    }

    router
}

/// Get all clients / 모든 클라이언트 가져오기
async fn get_all_clients(
    State(server): State<Arc<RwLock<SocketServer>>>,
) -> Result<Json<Value>, StatusCode> {
    let server = server.read().await;
    let clients = server.get_all_clients().await;
    Ok(Json(json!({ "targets": clients })))
}

/// Get all clients with details / 상세 정보와 함께 모든 클라이언트 가져오기
async fn get_all_clients_detailed(
    State(server): State<Arc<RwLock<SocketServer>>>,
) -> Result<Json<Value>, StatusCode> {
    let server = server.read().await;
    let all_clients_info = server.get_all_clients().await;

    // Log all clients for debugging / 디버깅을 위해 모든 클라이언트 로깅
    server.logger.log(
        crate::logging::LogType::Server,
        "http-routes",
        &format!(
            "📋 get_all_clients_detailed: Found {} total clients",
            all_clients_info.len()
        ),
        Some(&serde_json::json!({
            "total": all_clients_info.len(),
            "clients": all_clients_info.iter().map(|c| serde_json::json!({
                "id": c.id,
                "url": c.url,
                "title": c.title,
            })).collect::<Vec<_>>(),
        })),
        Some("get_all_clients_detailed"),
    );

    // Get React Native Inspector connections first (includes Reactotron clients registered as RN) / 먼저 React Native Inspector 연결 가져오기 (RN으로 등록된 Reactotron 클라이언트 포함)
    let rn_inspectors = server
        .react_native_inspector_manager
        .get_all_connections()
        .await;

    // Create a set of React Native Inspector client IDs to avoid duplicates / 중복을 피하기 위해 React Native Inspector 클라이언트 ID 집합 생성
    let rn_client_ids: std::collections::HashSet<String> = rn_inspectors
        .iter()
        .filter_map(|inspector| inspector.client_id.clone())
        .collect();

    // Separate clients by type / 타입별로 클라이언트 분리
    let mut regular_clients: Vec<Value> = Vec::new();

    for client in all_clients_info {
        // Skip Reactotron clients that are registered as React Native Inspector / React Native Inspector로 등록된 Reactotron 클라이언트는 건너뛰기
        // They will be included in rn_inspector_clients below / 아래의 rn_inspector_clients에 포함됨
        if let Some(url) = &client.url {
            if url.starts_with("reactotron://") {
                // Check if this Reactotron client is registered as React Native Inspector / 이 Reactotron 클라이언트가 React Native Inspector로 등록되었는지 확인
                if rn_client_ids.contains(&client.id) {
                    continue; // Skip, will be included in rn_inspector_clients / 건너뛰기, rn_inspector_clients에 포함됨
                }
            }
        }

        // Regular web client / 일반 웹 클라이언트
        regular_clients.push(json!({
            "id": client.id,
            "type": "web",
            "url": client.url,
            "title": client.title,
            "favicon": client.favicon,
            "ua": client.ua,
            "time": client.time,
        }));
    }

    // Debug log: Log all RN inspector connections for debugging / 디버깅을 위해 모든 RN Inspector 연결 로깅
    server.logger.log(
        crate::logging::LogType::Server,
        "http-routes",
        &format!("🔍 Debug: Found {} RN inspectors", rn_inspectors.len()),
        Some(&serde_json::json!({
            "inspectors": rn_inspectors.iter().map(|i| serde_json::json!({
                "id": i.id,
                "deviceName": i.device_name,
                "appName": i.app_name,
                "deviceId": i.device_id,
                "clientId": i.client_id,
            })).collect::<Vec<_>>(),
        })),
        Some("debug_rn_inspectors"),
    );

    // Convert React Native Inspector connections to client format / React Native Inspector 연결을 클라이언트 형식으로 변환
    // Use client_id if available (for Reactotron clients), otherwise use inspector.id / client_id가 있으면 사용 (Reactotron 클라이언트용), 없으면 inspector.id 사용
    let mut rn_inspector_clients: Vec<Value> = Vec::new();
    for inspector in rn_inspectors {
        // Clone client_id to avoid reference issues with json! macro / json! 매크로의 참조 문제를 피하기 위해 client_id 클론
        let client_id = inspector
            .client_id
            .clone()
            .unwrap_or_else(|| inspector.id.clone());

        // Check if this is actually a Reactotron client by checking the client URL / 클라이언트 URL을 확인하여 실제 Reactotron 클라이언트인지 확인
        let is_reactotron = if let Some(client_id_str) = &inspector.client_id {
            if let Some(client) = server.get_client(client_id_str).await {
                // Check if client URL starts with reactotron:// / 클라이언트 URL이 reactotron://로 시작하는지 확인
                client
                    .url
                    .as_ref()
                    .map(|url| url.starts_with("reactotron://"))
                    .unwrap_or(false)
            } else {
                false
            }
        } else {
            false
        };

        // Get title from client if available / 클라이언트에서 title 가져오기 (가능한 경우)
        let title = if let Some(client_id_str) = &inspector.client_id {
            if let Some(client) = server.get_client(client_id_str).await {
                client.title
            } else {
                None
            }
        } else {
            None
        };

        rn_inspector_clients.push(json!({
            "id": client_id,
            "type": if is_reactotron { "reactotron" } else { "react-native" },
            "deviceName": inspector.device_name,
            "appName": inspector.app_name,
            "deviceId": inspector.device_id,
            "title": title,
        }));
    }

    server.logger.log(
        crate::logging::LogType::Server,
        "http-routes",
        &format!(
            "📊 Client breakdown: {} regular, {} React Native (including Reactotron)",
            regular_clients.len(),
            rn_inspector_clients.len()
        ),
        None,
        Some("client_breakdown"),
    );

    let all_clients: Vec<Value> = [regular_clients, rn_inspector_clients].concat();

    Ok(Json(json!({ "clients": all_clients })))
}

/// Get all inspectors / 모든 Inspector 가져오기
async fn get_all_inspectors(
    State(server): State<Arc<RwLock<SocketServer>>>,
) -> Result<Json<Value>, StatusCode> {
    let server = server.read().await;
    let inspectors = server.get_all_inspectors().await;
    Ok(Json(json!({ "inspectors": inspectors })))
}

/// Get specific client / 특정 클라이언트 가져오기
async fn get_client(
    State(server): State<Arc<RwLock<SocketServer>>>,
    Path(id): Path<String>,
) -> Result<Json<Value>, StatusCode> {
    let server = server.read().await;
    // Try regular client first / 일반 클라이언트 먼저 시도
    if let Some(client) = server.get_client(&id).await {
        return Ok(Json(json!({ "client": client })));
    }

    // Try React Native Inspector connection / React Native Inspector 연결 시도
    if let Some(inspector) = server
        .react_native_inspector_manager
        .get_connection(&id)
        .await
    {
        let inspector_client = json!({
            "id": inspector.id,
            "type": "react-native",
            "deviceName": inspector.device_name,
            "appName": inspector.app_name,
            "deviceId": inspector.device_id,
        });
        return Ok(Json(json!({ "client": inspector_client })));
    }

    Err(StatusCode::NOT_FOUND)
}

/// Serve client script / 클라이언트 스크립트 서빙
/// Uses resource path in production (Tauri), falls back to file system in development / 프로덕션에서는 리소스 경로 사용 (Tauri), 개발 환경에서는 파일 시스템으로 폴백
async fn serve_client_script(
    server: Arc<RwLock<SocketServer>>,
    client_js_resource_path: Option<String>,
) -> Result<Response, StatusCode> {
    let logger = {
        let server_guard = server.read().await;
        server_guard.logger.clone()
    };

    logger.log(
        crate::logging::LogType::Server,
        "http-routes",
        "📥 /client.js requested",
        None,
        None,
    );

    // Try resource path first (for Tauri production builds) / 먼저 리소스 경로 시도 (Tauri 프로덕션 빌드용)
    if let Some(resource_path) = &client_js_resource_path {
        logger.log(
            crate::logging::LogType::Server,
            "http-routes",
            &format!("🔍 Trying resource path: {}", resource_path),
            None,
            None,
        );
        if let Ok(content) = fs::read_to_string(resource_path).await {
            logger.log(
                crate::logging::LogType::Server,
                "http-routes",
                "✅ Loaded from resource path",
                None,
                None,
            );
            return Ok((
                StatusCode::OK,
                [(header::CONTENT_TYPE, "application/javascript")],
                content,
            )
                .into_response());
        } else {
            logger.log(
                crate::logging::LogType::Server,
                "http-routes",
                "⚠️ Resource path failed, trying fallback",
                None,
                None,
            );
        }
    } else {
        logger.log(
            crate::logging::LogType::Server,
            "http-routes",
            "ℹ️ No resource path, using file system fallback",
            None,
            None,
        );
    }

    // Fallback: try to read from file system (for development) / 폴백: 파일 시스템에서 읽기 시도 (개발용)
    // Server runs from project root in bun dev / bun dev에서 서버는 프로젝트 루트에서 실행됨
    // For Tauri, find project root from executable location / Tauri의 경우 실행 파일 위치에서 프로젝트 루트 찾기
    let current_dir = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));

    // Try to find project root by looking for Cargo.toml or package.json / Cargo.toml 또는 package.json을 찾아 프로젝트 루트 찾기
    // Start from current dir, then try executable's parent directories / 현재 디렉토리에서 시작, 그 다음 실행 파일의 부모 디렉토리 시도
    let mut search_paths = vec![current_dir.clone()];

    // Also try from executable location (for Tauri) / 실행 파일 위치에서도 시도 (Tauri용)
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            search_paths.push(exe_dir.to_path_buf());
            // Also try parent directories of executable / 실행 파일의 부모 디렉토리도 시도
            let mut exe_parent = exe_dir.to_path_buf();
            for _ in 0..5 {
                if let Some(parent) = exe_parent.parent() {
                    exe_parent = parent.to_path_buf();
                    search_paths.push(exe_parent.clone());
                } else {
                    break;
                }
            }
        }
    }

    // Find project root by looking for Cargo.toml (preferred) or package.json with packages/client / Cargo.toml(우선) 또는 packages/client가 있는 package.json을 찾아 프로젝트 루트 찾기
    // Cargo.toml is at the root, while package.json exists in subdirectories too / Cargo.toml은 루트에만 있고, package.json은 하위 디렉토리에도 존재함
    let mut project_root: Option<PathBuf> = None;
    for search_path in &search_paths {
        let mut current = search_path.clone();
        for _ in 0..10 {
            // Prefer Cargo.toml with packages/client directory (root has both) / packages/client 디렉토리가 있는 Cargo.toml 우선 (루트에 둘 다 있음)
            let has_cargo_toml = current.join("Cargo.toml").exists();
            let has_packages_client = current.join("packages/client").exists();
            if has_cargo_toml && has_packages_client {
                logger.log(
                    crate::logging::LogType::Server,
                    "http-routes",
                    &format!(
                        "🔍 Found Cargo.toml with packages/client at: {}",
                        current.display()
                    ),
                    None,
                    None,
                );
                project_root = Some(current);
                break;
            }
            // Also check for package.json with packages/client directory / packages/client 디렉토리가 있는 package.json도 확인
            let has_package_json = current.join("package.json").exists();
            if has_package_json && has_packages_client {
                logger.log(
                    crate::logging::LogType::Server,
                    "http-routes",
                    &format!(
                        "🔍 Found package.json with packages/client at: {}",
                        current.display()
                    ),
                    None,
                    None,
                );
                project_root = Some(current);
                break;
            }
            if let Some(parent) = current.parent() {
                current = parent.to_path_buf();
            } else {
                break;
            }
        }
        if project_root.is_some() {
            break;
        }
    }

    // Build list of paths to try / 시도할 경로 목록 구성
    // Use project root if found, otherwise return error / 프로젝트 루트를 찾았으면 사용, 없으면 에러 반환
    let dev_paths = if let Some(ref root) = project_root {
        vec![root.join("packages/client/dist/index.iife.js")]
    } else {
        // Project root not found, return error / 프로젝트 루트를 찾지 못함, 에러 반환
        logger.log(
            crate::logging::LogType::Server,
            "http-routes",
            "❌ Project root not found, cannot locate client.js",
            None,
            None,
        );
        return Ok((
            StatusCode::OK,
            [(header::CONTENT_TYPE, "application/javascript")],
            "console.error('Client script not found. Please build: cd packages/client && bun run build');",
        )
            .into_response());
    };

    // Try each path / 각 경로 시도
    logger.log(
        crate::logging::LogType::Server,
        "http-routes",
        &format!("🔍 Current dir: {}", current_dir.display()),
        None,
        None,
    );

    if let Some(ref root) = project_root {
        logger.log(
            crate::logging::LogType::Server,
            "http-routes",
            &format!("🔍 Project root: {} (found: true)", root.display()),
            None,
            None,
        );
    } else {
        logger.log(
            crate::logging::LogType::Server,
            "http-routes",
            "🔍 Project root: not found (found: false)",
            None,
            None,
        );
    }

    for dev_path in &dev_paths {
        let exists = dev_path.exists();
        logger.log(
            crate::logging::LogType::Server,
            "http-routes",
            &format!("🔍 Trying: {} (exists: {})", dev_path.display(), exists),
            None,
            None,
        );
        if let Ok(content) = fs::read_to_string(dev_path).await {
            logger.log(
                crate::logging::LogType::Server,
                "http-routes",
                &format!(
                    "✅ Successfully loaded client.js from: {}",
                    dev_path.display()
                ),
                None,
                None,
            );
            return Ok((
                StatusCode::OK,
                [(header::CONTENT_TYPE, "application/javascript")],
                content,
            )
                .into_response());
        } else if exists {
            logger.log(
                crate::logging::LogType::Server,
                "http-routes",
                &format!("⚠️ File exists but failed to read: {}", dev_path.display()),
                None,
                None,
            );
        }
    }

    logger.log(
        crate::logging::LogType::Server,
        "http-routes",
        "❌ Failed to find client.js in any location",
        None,
        None,
    );

    // Fallback: warning if not built / Fallback: 빌드되지 않은 경우 경고 메시지
    Ok((
        StatusCode::OK,
        [(header::CONTENT_TYPE, "application/javascript")],
        "console.error('Client script not found. Please build: cd packages/client && bun run build');",
    )
        .into_response())
}

/// Handle inspector device HTTP GET request / inspector device HTTP GET 요청 처리
async fn handle_inspector_device_http(
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<Value>, StatusCode> {
    let device_name = params.get("name").cloned();
    let app_name = params.get("app").cloned();
    let device_id = params.get("device").cloned();

    let response = json!({
        "id": device_id.as_ref().unwrap_or(&"unknown".to_string()),
        "name": device_name.as_ref().unwrap_or(&"Unknown Device".to_string()),
        "app": app_name.as_ref().unwrap_or(&"Unknown App".to_string()),
        "device": device_id.as_ref().unwrap_or(&"unknown".to_string()),
    });

    Ok(Json(response))
}

/// Handle open debugger endpoint / open debugger 엔드포인트 처리
async fn handle_open_debugger(
    State(server): State<Arc<RwLock<SocketServer>>>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<Value>, StatusCode> {
    let device_id = params.get("device");

    if let Some(device_id) = device_id {
        let server = server.read().await;
        let connections = server
            .react_native_inspector_manager
            .get_all_connections()
            .await;
        if let Some(connection) = connections
            .iter()
            .find(|conn| conn.device_id.as_ref() == Some(device_id))
        {
            return Ok(Json(json!({
                "success": true,
                "inspectorId": connection.id
            })));
        }
    }

    Err(StatusCode::NOT_FOUND)
}

/// Handle WebSocket upgrade / WebSocket 업그레이드 처리
async fn handle_websocket_upgrade(
    ws: WebSocketUpgrade,
    Path(path): Path<String>,
    Query(params): Query<HashMap<String, String>>,
    State(server): State<Arc<RwLock<SocketServer>>>,
) -> axum::response::Response {
    ws.on_upgrade(move |socket| {
        let server_clone = server.clone();
        async move {
            SocketServer::handle_websocket_upgrade_rwlock(server_clone, socket, path, params).await;
        }
    })
}

/// Handle root path WebSocket upgrade for Reactotron / Reactotron을 위한 루트 경로 WebSocket 업그레이드 처리
async fn handle_root_websocket_upgrade(
    ws: WebSocketUpgrade,
    Query(params): Query<HashMap<String, String>>,
    State(server): State<Arc<RwLock<SocketServer>>>,
) -> axum::response::Response {
    ws.on_upgrade(move |socket| {
        let server_clone = server.clone();
        async move {
            // Pass empty path for root / 루트 경로를 위해 빈 경로 전달
            SocketServer::handle_websocket_upgrade_rwlock(
                server_clone,
                socket,
                String::new(),
                params,
            )
            .await;
        }
    })
}
