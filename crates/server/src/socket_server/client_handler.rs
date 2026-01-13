// Client connection handler / 클라이언트 연결 핸들러
use crate::logging::{LogType, Logger};
use crate::react_native::ReactNativeInspectorConnectionManager;
use axum::extract::ws::{Message, WebSocket};
use futures_util::{SinkExt, StreamExt};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::mpsc;
use tokio::sync::RwLock;
use super::message_processor::process_client_message;
use super::types::{Client, DevTools};

/// Handle client WebSocket connection / 클라이언트 WebSocket 연결 처리
pub async fn handle_client_connection(
    ws: WebSocket,
    id: String,
    query_params: HashMap<String, String>,
    clients: Arc<RwLock<std::collections::HashMap<String, Arc<Client>>>>,
    devtools: Arc<RwLock<std::collections::HashMap<String, Arc<DevTools>>>>,
    rn_manager: Arc<ReactNativeInspectorConnectionManager>,
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
        clients.insert(id.clone(), client.clone());
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
                    let data = process_client_message(
                        &text,
                        &client_id_for_msg,
                        &logger_for_msg,
                    );

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
                                if let Err(e) = connection.sender.send(data.clone()) {
                                    logger_for_msg.log_error(
                                        LogType::Client,
                                        &client_id_for_msg,
                                        &format!(
                                            "failed to send to RN inspector {}",
                                            inspector.id
                                        ),
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
