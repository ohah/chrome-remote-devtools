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
pub fn create_router(dev_mode: bool) -> Router<Arc<RwLock<SocketServer>>> {
    let mut router = Router::new()
        .route("/json", get(get_all_clients))
        .route("/json/clients", get(get_all_clients_detailed))
        .route("/json/inspectors", get(get_all_inspectors))
        .route("/json/client/:id", get(get_client))
        .route("/inspector/device", get(handle_inspector_device_http))
        .route("/open-debugger", post(handle_open_debugger))
        .route("/remote/debug/*path", get(handle_websocket_upgrade))
        .route("/", get(handle_root_websocket_upgrade));

    // Only add /client.js route in development mode / 개발 모드에서만 /client.js 라우트 추가
    if dev_mode {
        router = router.route("/client.js", get(serve_client_script));
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
        &format!("📋 get_all_clients_detailed: Found {} total clients", all_clients_info.len()),
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

    // Convert React Native Inspector connections to client format / React Native Inspector 연결을 클라이언트 형식으로 변환
    // Use client_id if available (for Reactotron clients), otherwise use inspector.id / client_id가 있으면 사용 (Reactotron 클라이언트용), 없으면 inspector.id 사용
    let rn_inspector_clients: Vec<Value> = rn_inspectors
        .into_iter()
        .map(|inspector| {
            json!({
                "id": inspector.client_id.as_ref().unwrap_or(&inspector.id), // Use client_id if available, otherwise use inspector.id / client_id가 있으면 사용, 없으면 inspector.id 사용
                "type": "react-native",
                "deviceName": inspector.device_name,
                "appName": inspector.app_name,
                "deviceId": inspector.device_id,
            })
        })
        .collect();

    server.logger.log(
        crate::logging::LogType::Server,
        "http-routes",
        &format!("📊 Client breakdown: {} regular, {} React Native (including Reactotron)",
                 regular_clients.len(),
                 rn_inspector_clients.len()),
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
/// Note: This endpoint is only available in development mode / 주의: 이 엔드포인트는 개발 모드에서만 사용 가능
/// In production (Tauri build), the client script is not included / 운영 환경(Tauri 빌드)에서는 클라이언트 스크립트가 포함되지 않음
async fn serve_client_script() -> Result<Response, StatusCode> {
    // Check if running in development mode / 개발 모드에서 실행 중인지 확인
    // In development, try to serve the client script from the source directory / 개발 환경에서는 소스 디렉토리에서 클라이언트 스크립트 서빙 시도
    // In production (Tauri), this file won't be available / 운영 환경(Tauri)에서는 이 파일을 사용할 수 없음

    // Try IIFE format first (for script tags) / 먼저 IIFE 형식 시도 (script 태그용)
    let iife_path = PathBuf::from("packages/client/dist/index.iife.js");
    if let Ok(content) = fs::read_to_string(&iife_path).await {
        return Ok((
            StatusCode::OK,
            [(header::CONTENT_TYPE, "application/javascript")],
            content,
        )
            .into_response());
    }

    // Fallback: try index.js if iife doesn't exist / Fallback: iife가 없으면 index.js 시도
    let js_path = PathBuf::from("packages/client/dist/index.js");
    if let Ok(content) = fs::read_to_string(&js_path).await {
        return Ok((
            StatusCode::OK,
            [(header::CONTENT_TYPE, "application/javascript")],
            content,
        )
            .into_response());
    }

    // Fallback: warning if not built or in production / Fallback: 빌드되지 않았거나 운영 환경인 경우 경고 메시지
    Ok((
        StatusCode::OK,
        [(header::CONTENT_TYPE, "application/javascript")],
        "console.error('Client script not found. This endpoint is only available in development mode. Please build: cd packages/client && bun run build');",
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
            SocketServer::handle_websocket_upgrade_rwlock(server_clone, socket, String::new(), params).await;
        }
    })
}
