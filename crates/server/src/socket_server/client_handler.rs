// Client connection handler / 클라이언트 연결 핸들러
use super::message_processor::process_client_message;
use super::{Client, DevTools, SocketServer};
use crate::logging::{LogType, Logger};
use crate::react_native::ReactNativeInspectorConnectionManager;
use axum::extract::ws::{Message, WebSocket};
use futures_util::{SinkExt, StreamExt};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::mpsc;
use tokio::sync::RwLock;

/// Response body information extracted from CDP message / CDP 메시지에서 추출한 응답 본문 정보
struct ResponseBodyInfo<'a> {
    request_id: &'a str,
    body: &'a str,
}

/// Extract response body from Network.responseReceived CDP message / Network.responseReceived CDP 메시지에서 응답 본문 추출
fn extract_response_body<'a>(cdp_message: &'a serde_json::Value) -> Option<ResponseBodyInfo<'a>> {
    // Check if this is a Network.responseReceived event / Network.responseReceived 이벤트인지 확인
    let method = cdp_message.get("method")?.as_str()?;
    if method != "Network.responseReceived" {
        return None;
    }

    // Extract request ID and response body / 요청 ID와 응답 본문 추출
    let params = cdp_message.get("params")?.as_object()?;
    let request_id = params.get("requestId")?.as_str()?;
    let body = params.get("response")?.as_object()?.get("body")?.as_str()?;

    Some(ResponseBodyInfo { request_id, body })
}

/// Handle client WebSocket connection / 클라이언트 WebSocket 연결 처리
pub async fn handle_client_connection(
    ws: WebSocket,
    id: String,
    query_params: HashMap<String, String>,
    clients: Arc<RwLock<std::collections::HashMap<String, Arc<Client>>>>,
    devtools: Arc<RwLock<std::collections::HashMap<String, Arc<DevTools>>>>,
    rn_manager: Arc<ReactNativeInspectorConnectionManager>,
    socket_server: Arc<RwLock<SocketServer>>,
    logger: Arc<Logger>,
) {
    logger.log(LogType::Client, &id, "connected", None, None);

    let (mut sender, mut receiver) = ws.split();
    let (tx, mut rx) = mpsc::unbounded_channel::<String>();

    let client = Arc::new(Client {
        id: id.clone(),
        url: query_params.get("url").cloned(),
        title: query_params.get("title").cloned(),
        favicon: query_params.get("favicon").cloned(),
        ua: query_params.get("ua").cloned(),
        time: query_params.get("time").cloned(),
        sender: tx.clone(),
    });

    {
        let mut clients = clients.write().await;
        let was_empty = clients.is_empty();
        clients.insert(id.clone(), client.clone());
        let count_after = clients.len();
        if was_empty {
            eprintln!(
                "[server] ✅ Client {} added to HashMap (first client, total: {})",
                id, count_after
            );
        } else {
            eprintln!(
                "[server] ✅ Client {} added to HashMap (total: {})",
                id, count_after
            );
        }
    }

    // Request stored events from client when DevTools connect / DevTools 연결 시 클라이언트에 저장된 이벤트 요청
    // This will be handled when DevTools connects / DevTools 연결 시 처리됨

    // Spawn task to send messages to client / 클라이언트로 메시지 전송 태스크
    let logger_clone = logger.clone();
    let client_id_for_send = id.clone();
    tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if let Err(e) = sender.send(Message::Text(msg)).await {
                logger_clone.log_error(
                    LogType::Client,
                    &client_id_for_send,
                    "failed to send message",
                    Some(&e.to_string()),
                );
                break;
            }
        }
    });

    // Handle incoming messages from client / 클라이언트로부터 들어오는 메시지 처리
    let clients_for_msg = clients.clone();
    let devtools_for_msg = devtools.clone();
    let rn_manager_for_msg = rn_manager.clone();
    let logger_for_msg = logger.clone();
    let client_id_for_msg = id.clone();
    tokio::spawn(async move {
        while let Some(msg) = receiver.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    let data = process_client_message(&text, &client_id_for_msg, &logger_for_msg);

                    // Parse CDP message and store response body if it's Network.responseReceived / CDP 메시지 파싱 및 Network.responseReceived인 경우 응답 본문 저장
                    if let Ok(cdp_message) = serde_json::from_str::<serde_json::Value>(&data) {
                        if let Some(info) = extract_response_body(&cdp_message) {
                            // Store response body in server's response_bodies map / 서버의 response_bodies 맵에 응답 본문 저장
                            {
                                let server = socket_server.read().await;
                                let mut response_bodies = server.response_bodies.write().await;
                                response_bodies
                                    .insert(info.request_id.to_string(), info.body.to_string());
                            }

                            logger_for_msg.log(
                                LogType::Client,
                                &client_id_for_msg,
                                &format!(
                                    "💾 Stored response body for requestId: {}",
                                    info.request_id
                                ),
                                Some(&serde_json::json!({
                                    "requestId": info.request_id,
                                    "bodyLength": info.body.len(),
                                })),
                                Some("store_response_body"),
                            );
                        }
                    }

                    // Send to DevTools / DevTools로 전송
                    let devtools = devtools_for_msg.read().await;
                    for devtool in devtools.values() {
                        if devtool.client_id.as_ref() == Some(&client_id_for_msg) {
                            if let Err(e) = devtool.sender.send(data.clone()) {
                                logger_for_msg.log_error(
                                    LogType::Client,
                                    &client_id_for_msg,
                                    &format!("failed to send to devtools {}", devtool.id),
                                    Some(&e.to_string()),
                                );
                            }
                        }
                    }
                    drop(devtools);

                    // Send to React Native Inspector / React Native Inspector로 전송
                    let rn_connections = rn_manager_for_msg.get_all_connections().await;
                    for inspector in rn_connections {
                        if inspector.client_id.as_ref() == Some(&client_id_for_msg) {
                            if let Some(connection) =
                                rn_manager_for_msg.get_connection(&inspector.id).await
                            {
                                let sender = connection.sender.read().await;
                                if let Err(e) = sender.send(data.clone()) {
                                    logger_for_msg.log_error(
                                        LogType::Client,
                                        &client_id_for_msg,
                                        &format!("failed to send to RN inspector {}", inspector.id),
                                        Some(&e.to_string()),
                                    );
                                }
                            }
                        }
                    }
                }
                Ok(Message::Close(_)) => {
                    logger_for_msg.log(
                        LogType::Client,
                        &client_id_for_msg,
                        "disconnected",
                        None,
                        None,
                    );
                    let mut clients = clients_for_msg.write().await;
                    clients.remove(&client_id_for_msg);

                    // Close associated DevTools / 연결된 DevTools 종료
                    let mut devtools = devtools_for_msg.write().await;
                    let devtools_to_remove: Vec<String> = devtools
                        .iter()
                        .filter(|(_, dt)| dt.client_id.as_ref() == Some(&client_id_for_msg))
                        .map(|(id, _)| id.clone())
                        .collect();
                    for dt_id in devtools_to_remove {
                        devtools.remove(&dt_id);
                    }
                    break;
                }
                Err(e) => {
                    logger_for_msg.log_error(
                        LogType::Client,
                        &client_id_for_msg,
                        "websocket error",
                        Some(&e.to_string()),
                    );
                    break;
                }
                _ => {}
            }
        }
    });
}
