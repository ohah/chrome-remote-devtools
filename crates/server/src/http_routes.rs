// HTTP routing implementation / HTTP 라우팅 구현
use crate::socket_server::SocketServer;
use axum::extract::ws::WebSocketUpgrade;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::Json;
use axum::routing::{get, post};
use axum::Router;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::Arc;

/// Create HTTP router / HTTP 라우터 생성
pub fn create_router() -> Router<Arc<SocketServer>> {
    Router::new()
        .route("/json", get(get_all_clients))
        .route("/json/clients", get(get_all_clients_detailed))
        .route("/json/inspectors", get(get_all_inspectors))
        .route("/json/client/:id", get(get_client))
        .route("/client.js", get(serve_client_script))
        .route("/inspector/device", get(handle_inspector_device_http))
        .route("/open-debugger", post(handle_open_debugger))
        .route("/remote/debug/*path", get(handle_websocket_upgrade))
}

/// Get all clients / 모든 클라이언트 가져오기
async fn get_all_clients(
    State(server): State<Arc<SocketServer>>,
) -> Result<Json<Value>, StatusCode> {
    let clients = server.get_all_clients().await;
    Ok(Json(json!({ "targets": clients })))
}

/// Get all clients with details / 상세 정보와 함께 모든 클라이언트 가져오기
async fn get_all_clients_detailed(
    State(server): State<Arc<SocketServer>>,
) -> Result<Json<Value>, StatusCode> {
    let regular_clients: Vec<Value> = server
        .get_all_clients()
        .await
        .into_iter()
        .map(|client| {
            json!({
                "id": client.id,
                "type": "web",
                "url": client.url,
                "title": client.title,
                "favicon": client.favicon,
                "ua": client.ua,
                "time": client.time,
            })
        })
        .collect();

    let rn_inspectors = server
        .react_native_inspector_manager
        .get_all_connections()
        .await;

    let rn_inspector_clients: Vec<Value> = rn_inspectors
        .into_iter()
        .map(|inspector| {
            json!({
                "id": inspector.id,
                "type": "react-native",
                "deviceName": inspector.device_name,
                "appName": inspector.app_name,
                "deviceId": inspector.device_id,
            })
        })
        .collect();

    let all_clients: Vec<Value> = [regular_clients, rn_inspector_clients].concat();

    Ok(Json(json!({ "clients": all_clients })))
}

/// Get all inspectors / 모든 Inspector 가져오기
async fn get_all_inspectors(
    State(server): State<Arc<SocketServer>>,
) -> Result<Json<Value>, StatusCode> {
    let inspectors = server.get_all_inspectors().await;
    Ok(Json(json!({ "inspectors": inspectors })))
}

/// Get specific client / 특정 클라이언트 가져오기
async fn get_client(
    State(server): State<Arc<SocketServer>>,
    Path(id): Path<String>,
) -> Result<Json<Value>, StatusCode> {
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
async fn serve_client_script() -> Result<&'static str, StatusCode> {
    // TODO: Implement client script serving / 클라이언트 스크립트 서빙 구현
    Ok("console.error('Client script not found. Please build: cd packages/client && bun run build');")
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
    State(server): State<Arc<SocketServer>>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<Value>, StatusCode> {
    let device_id = params.get("device");

    if let Some(device_id) = device_id {
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
    State(server): State<Arc<SocketServer>>,
) -> axum::response::Response {
    ws.on_upgrade(move |socket| {
        let server_clone = server.clone();
        async move {
            server_clone
                .handle_websocket_upgrade(socket, path, params)
                .await;
        }
    })
}
