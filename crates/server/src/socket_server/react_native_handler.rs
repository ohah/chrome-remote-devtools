// React Native Inspector connection handler / React Native Inspector 연결 핸들러
use super::message::CDPMessage;
use super::DevTools;
use crate::logging::{LogType, Logger};
use crate::react_native::{
    ConnectionInfo, ReactNativeInspectorConnectionManager, ReduxStoreInstance,
};
use axum::extract::ws::{Message, WebSocket};
use futures_util::{SinkExt, StreamExt};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::mpsc;
use tokio::sync::RwLock;

/// Handle React Native Inspector WebSocket / React Native Inspector WebSocket 처리
pub async fn handle_react_native_inspector_websocket(
    ws: WebSocket,
    query_params: HashMap<String, String>,
    devtools: Arc<RwLock<std::collections::HashMap<String, Arc<DevTools>>>>,
    rn_manager: Arc<ReactNativeInspectorConnectionManager>,
    socket_server: Arc<RwLock<super::SocketServer>>,
    logger: Arc<Logger>,
) {
    let device_name = query_params.get("name").cloned();
    let app_name = query_params.get("app").cloned();
    let device_id = query_params.get("device").cloned();

    let (mut sender, mut receiver) = ws.split();
    let (tx, mut rx) = mpsc::unbounded_channel::<String>();

    // Create connection info / 연결 정보 생성
    let connection_info = ConnectionInfo {
        id: String::new(), // Will be set by create_connection / create_connection에서 설정됨
        device_name,
        app_name,
        device_id: device_id.clone(),
        client_id: None,
    };

    // Create inspector connection / Inspector 연결 생성
    let (inspector_id, tx_id) = rn_manager
        .create_connection(connection_info, tx.clone())
        .await;

    // Auto-associate with self as clientId (so DevTools can connect) / 자동으로 자신을 clientId로 연결 (DevTools가 연결할 수 있도록)
    rn_manager
        .associate_with_client(&inspector_id, &inspector_id)
        .await;

    // If a metro proxy DevTools was registered with no RN inspector (waiting), associate it now so
    // Redux/MMKV work without refresh. Also send cached Redux stores so Redux panel shows state.
    // RN inspector 없이 등록된 metro proxy DevTools가 있으면 지금 연동 (새로고침 없이 Redux/MMKV 동작).
    // 캐시된 Redux store도 전송해 Redux 패널에 상태 표시.
    {
        let mut devtools_guard = devtools.write().await;
        if let Some((metro_id, old_entry)) = devtools_guard
            .iter()
            .find(|(k, v)| k.starts_with("metro-proxy-") && v.client_id.is_none())
            .map(|(k, v)| (k.clone(), v.clone()))
        {
            let metro_sender = old_entry.sender.clone();
            devtools_guard.insert(
                metro_id.clone(),
                Arc::new(DevTools {
                    id: old_entry.id.clone(),
                    client_id: Some(inspector_id.clone()),
                    sender: old_entry.sender.clone(),
                }),
            );
            logger.log(
                LogType::RnInspector,
                &inspector_id,
                &format!(
                    "Associated waiting metro proxy DevTools ({}) with this inspector",
                    metro_id
                ),
                None,
                None,
            );
            drop(devtools_guard);

            // Send cached Redux stores to this DevTools (same as normal devtools path) so Redux panel works
            // 캐시된 Redux store를 이 DevTools로 전송 (일반 devtools 경로와 동일) → Redux 패널 동작
            let rn_manager_redux = rn_manager.clone();
            let inspector_id_redux = inspector_id.clone();
            let logger_redux = logger.clone();
            let metro_id_redux = metro_id.clone();
            tokio::spawn(async move {
                tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
                let stores = rn_manager_redux.get_redux_stores(&inspector_id_redux).await;
                for store in &stores {
                    let init_instance_msg = serde_json::json!({
                        "method": "Redux.message",
                        "params": {
                            "type": "INIT_INSTANCE",
                            "instanceId": store.instance_id,
                            "source": "@devtools-page",
                        }
                    });
                    if let Ok(json_str) = serde_json::to_string(&init_instance_msg) {
                        let _ = metro_sender.send(json_str);
                    }
                    let init_msg = serde_json::json!({
                        "method": "Redux.message",
                        "params": {
                            "type": "INIT",
                            "instanceId": store.instance_id,
                            "source": "@devtools-page",
                            "name": store.name,
                            "payload": store.payload,
                            "maxAge": 50,
                            "timestamp": store.timestamp,
                        }
                    });
                    if let Ok(json_str) = serde_json::to_string(&init_msg) {
                        let _ = metro_sender.send(json_str);
                    }
                }
                if !stores.is_empty() {
                    logger_redux.log(
                        LogType::RnInspector,
                        &inspector_id_redux,
                        &format!(
                            "Sent {} cached Redux store(s) to metro proxy DevTools ({})",
                            stores.len(),
                            metro_id_redux
                        ),
                        None,
                        None,
                    );
                }
            });
        }
    }

    logger.log(
        LogType::RnInspector,
        &inspector_id,
        "connected",
        Some(&serde_json::json!({
            "deviceName": query_params.get("name"),
            "appName": query_params.get("app"),
            "deviceId": query_params.get("device"),
        })),
        None,
    );

    // Notify SSE subscribers that client list changed / 클라이언트 목록 변경 시 SSE 구독자에게 알림
    {
        let server_guard = socket_server.read().await;
        server_guard.notify_clients_changed();
    }

    // Spawn task to send messages to React Native Inspector / React Native Inspector로 메시지 전송 태스크
    let logger_clone = logger.clone();
    let inspector_id_for_send = inspector_id.clone();
    tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if let Err(e) = sender.send(Message::Text(msg)).await {
                logger_clone.log_error(
                    LogType::RnInspector,
                    &inspector_id_for_send,
                    "failed to send message",
                    Some(&e.to_string()),
                );
                break;
            }
        }
    });

    // Handle incoming messages from React Native Inspector / React Native Inspector로부터 들어오는 메시지 처리
    let devtools_for_msg = devtools.clone();
    let rn_manager_for_msg = rn_manager.clone();
    let socket_server_for_msg = socket_server.clone();
    let logger_for_msg = logger.clone();
    let inspector_id_for_msg = inspector_id.clone();
    let tx_id_for_msg = tx_id;
    tokio::spawn(async move {
        while let Some(msg) = receiver.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    // Parse message for logging and Redux handling / 로깅 및 Redux 처리를 위해 메시지 파싱
                    if let Ok(parsed) = serde_json::from_str::<CDPMessage>(&text) {
                        if let Some(method) = &parsed.method {
                            logger_for_msg.log(
                                LogType::RnInspector,
                                &inspector_id_for_msg,
                                "received",
                                Some(&serde_json::json!(parsed)),
                                Some(method),
                            );

                            // Cache Redux store information / Redux store 정보 캐시
                            if method == "Redux.message" {
                                if let Some(params) = &parsed.params {
                                    if let Ok(redux_params) =
                                        serde_json::from_value::<serde_json::Value>(params.clone())
                                    {
                                        if let Some(redux_type) =
                                            redux_params.get("type").and_then(|v| v.as_str())
                                        {
                                            if redux_type == "INIT" {
                                                if let Some(instance_id) = redux_params
                                                    .get("instanceId")
                                                    .and_then(|v| v.as_str())
                                                {
                                                    let store_info = ReduxStoreInstance {
                                                        instance_id: instance_id.to_string(),
                                                        name: redux_params
                                                            .get("name")
                                                            .and_then(|v| v.as_str())
                                                            .unwrap_or("Store")
                                                            .to_string(),
                                                        payload: redux_params
                                                            .get("payload")
                                                            .and_then(|v| v.as_str())
                                                            .unwrap_or("{}")
                                                            .to_string(),
                                                        timestamp: redux_params
                                                            .get("timestamp")
                                                            .and_then(|v| v.as_i64())
                                                            .unwrap_or_else(|| {
                                                                std::time::SystemTime::now()
                                                                    .duration_since(
                                                                        std::time::UNIX_EPOCH,
                                                                    )
                                                                    .unwrap()
                                                                    .as_millis()
                                                                    as i64
                                                            }),
                                                    };
                                                    rn_manager_for_msg
                                                        .store_redux_instance(
                                                            &inspector_id_for_msg,
                                                            store_info,
                                                        )
                                                        .await;
                                                    logger_for_msg.log(
                                                        LogType::RnInspector,
                                                        &inspector_id_for_msg,
                                                        &format!("📦 Cached Redux store INIT for instance {}", instance_id),
                                                        None,
                                                        None,
                                                    );
                                                }
                                            } else if redux_type == "ACTION" {
                                                if let Some(instance_id) = redux_params
                                                    .get("instanceId")
                                                    .and_then(|v| v.as_str())
                                                {
                                                    let payload = redux_params
                                                        .get("payload")
                                                        .and_then(|v| v.as_str())
                                                        .unwrap_or("{}")
                                                        .to_string();
                                                    let timestamp = redux_params
                                                        .get("timestamp")
                                                        .and_then(|v| v.as_i64())
                                                        .unwrap_or_else(|| {
                                                            std::time::SystemTime::now()
                                                                .duration_since(
                                                                    std::time::UNIX_EPOCH,
                                                                )
                                                                .unwrap()
                                                                .as_millis()
                                                                as i64
                                                        });
                                                    rn_manager_for_msg
                                                        .update_redux_state(
                                                            &inspector_id_for_msg,
                                                            instance_id,
                                                            payload,
                                                            timestamp,
                                                        )
                                                        .await;
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        } else {
                            logger_for_msg.log(
                                LogType::RnInspector,
                                &inspector_id_for_msg,
                                "received",
                                Some(&serde_json::json!(parsed)),
                                None,
                            );
                        }
                    } else {
                        logger_for_msg.log(
                            LogType::RnInspector,
                            &inspector_id_for_msg,
                            "received (raw)",
                            Some(&serde_json::json!({ "data": text })),
                            None,
                        );
                    }

                    // Get connection to find associated client / 연결을 가져와 연결된 클라이언트 찾기
                    let connection = rn_manager_for_msg
                        .get_connection(&inspector_id_for_msg)
                        .await;
                    if let Some(conn) = connection {
                        let client_id_guard = conn.client_id.read().await;
                        let client_id = client_id_guard.clone();
                        drop(client_id_guard);

                        if let Some(client_id) = client_id {
                            // Forward to DevTools (if connected) / DevTools로 전달 (연결된 경우)
                            let devtools = devtools_for_msg.read().await;
                            let mut forwarded = false;
                            for devtool in devtools.values() {
                                if devtool.client_id.as_ref() == Some(&client_id) {
                                    if let Err(e) = devtool.sender.send(text.clone()) {
                                        logger_for_msg.log_error(
                                            LogType::RnInspector,
                                            &inspector_id_for_msg,
                                            &format!("failed to send to devtools {}", devtool.id),
                                            Some(&e.to_string()),
                                        );
                                    } else {
                                        forwarded = true;
                                    }
                                }
                            }
                            drop(devtools);

                            if !forwarded {
                                logger_for_msg.log(
                                    LogType::RnInspector,
                                    &inspector_id_for_msg,
                                    &format!(
                                        "no devtools connected to forward message (clientId: {})",
                                        client_id
                                    ),
                                    None,
                                    None,
                                );
                            }

                            // Also forward to regular client if exists (for backward compatibility) / 일반 클라이언트가 있으면 전달 (하위 호환성)
                            // This is handled by the client message handler / 이것은 클라이언트 메시지 핸들러에서 처리됨
                        }
                    }
                }
                Ok(Message::Close(_)) => {
                    logger_for_msg.log(
                        LogType::RnInspector,
                        &inspector_id_for_msg,
                        "disconnected",
                        None,
                        None,
                    );
                    rn_manager_for_msg
                        .remove_connection(&inspector_id_for_msg, Some(tx_id_for_msg))
                        .await;
                    let server_guard = socket_server_for_msg.read().await;
                    server_guard.notify_clients_changed();
                    break;
                }
                Err(e) => {
                    logger_for_msg.log_error(
                        LogType::RnInspector,
                        &inspector_id_for_msg,
                        "websocket error",
                        Some(&e.to_string()),
                    );
                    rn_manager_for_msg
                        .remove_connection(&inspector_id_for_msg, Some(tx_id_for_msg))
                        .await;
                    let server_guard = socket_server_for_msg.read().await;
                    server_guard.notify_clients_changed();
                    break;
                }
                _ => {}
            }
        }
        // Stream ended without Close frame / Close 프레임 없이 스트림 종료
        // Note: We pass Some(tx_id_for_msg) so that remove_connection only removes the
        // connection if it still corresponds to this WebSocket stream. If a reconnection
        // occurred and current_tx_id was updated, this call becomes a no-op and does not
        // affect the new connection.
        rn_manager_for_msg
            .remove_connection(&inspector_id_for_msg, Some(tx_id_for_msg))
            .await;
        let server_guard = socket_server_for_msg.read().await;
        server_guard.notify_clients_changed();
    });
}
