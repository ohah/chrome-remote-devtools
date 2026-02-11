// Metro WebSocket proxy handler / Metro WebSocket 프록시 핸들러
// Proxies WebSocket between DevTools and Metro bundler
// DevTools와 Metro 번들러 사이의 WebSocket을 프록시
// Custom CDP domains (MMKVStorage, AsyncStorageStorage, Redux) are multiplexed to the RN app
// 커스텀 CDP 도메인(MMKVStorage, AsyncStorageStorage, Redux)은 RN 앱으로 멀티플렉싱

use super::is_custom_cdp_domain;
use super::url_rewriting::{derive_metro_origin, rewrite_script_parsed_urls};
use crate::logging::{LogType, Logger};
use crate::react_native::ReactNativeInspectorConnectionManager;
use crate::socket_server::DevTools;
use axum::extract::ws::{Message, WebSocket};
use futures_util::{SinkExt, StreamExt};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::mpsc;
use tokio::sync::RwLock;
use tokio_tungstenite::tungstenite::Message as TungsteniteMessage;

/// CDP id used for inject Runtime.evaluate (reconnect); filter response so we don't forward to DevTools / 주입용 Runtime.evaluate(reconnect) id; 응답은 DevTools로 전달하지 않음
const INJECT_RECONNECT_CDP_ID: i64 = 2147483646;

/// Expression injected via Runtime.evaluate so RN app calls __ChromeRemoteDevToolsReconnect / RN 앱에서 __ChromeRemoteDevToolsReconnect 호출하도록 주입하는 표현식
pub(super) const INJECT_RECONNECT_EXPRESSION: &str =
    "typeof __ChromeRemoteDevToolsReconnect === 'function' && __ChromeRemoteDevToolsReconnect()";

/// Handle Metro WebSocket proxy connection / Metro WebSocket 프록시 연결 처리
/// Connects to Metro's WebSocket and relays messages bidirectionally,
/// rewriting Debugger.scriptParsed URLs to go through our server's resource proxy.
/// Custom CDP domains are multiplexed to the RN app via the inspector connection.
/// Metro WebSocket에 연결하고 메시지를 양방향으로 중계하며,
/// Debugger.scriptParsed URL을 우리 서버의 리소스 프록시를 통하도록 재작성
/// 커스텀 CDP 도메인은 inspector 연결을 통해 RN 앱으로 멀티플렉싱
pub async fn handle_metro_proxy_websocket(
    ws: WebSocket,
    query_params: HashMap<String, String>,
    devtools_map: Arc<RwLock<HashMap<String, Arc<DevTools>>>>,
    rn_manager: Arc<ReactNativeInspectorConnectionManager>,
    logger: Arc<Logger>,
) {
    // Extract required parameters / 필수 파라미터 추출
    let target = match query_params.get("target") {
        Some(t) => t.clone(),
        None => {
            logger.log_error(
                LogType::Server,
                "metro-proxy",
                "Missing 'target' query parameter",
                None,
            );
            return;
        }
    };

    let server_origin = match query_params.get("serverOrigin") {
        Some(o) => o.clone(),
        None => {
            logger.log_error(
                LogType::Server,
                "metro-proxy",
                "Missing 'serverOrigin' query parameter",
                None,
            );
            return;
        }
    };

    // Derive Metro HTTP origin from WebSocket URL / WebSocket URL에서 Metro HTTP origin 도출
    let metro_origin = match derive_metro_origin(&target) {
        Some(o) => o,
        None => {
            logger.log_error(
                LogType::Server,
                "metro-proxy",
                &format!("Failed to parse Metro target URL: {}", target),
                None,
            );
            return;
        }
    };

    logger.log(
        LogType::Server,
        "metro-proxy",
        &format!(
            "Connecting to Metro: target={}, metro_origin={}, server_origin={}",
            target, metro_origin, server_origin
        ),
        None,
        None,
    );

    // Connect to Metro's WebSocket / Metro WebSocket에 연결
    let metro_ws = match tokio_tungstenite::connect_async(&target).await {
        Ok((ws_stream, _)) => ws_stream,
        Err(e) => {
            logger.log_error(
                LogType::Server,
                "metro-proxy",
                &format!("Failed to connect to Metro WebSocket: {}", e),
                Some(&e.to_string()),
            );
            return;
        }
    };

    logger.log(
        LogType::Server,
        "metro-proxy",
        "Connected to Metro WebSocket",
        None,
        None,
    );

    // Split both WebSockets / 양쪽 WebSocket 분리
    let (mut devtools_sink, mut devtools_stream) = ws.split();
    let (mut metro_sink, mut metro_stream) = metro_ws.split();

    // Inject Runtime.evaluate in app to call reconnect so app connects to server (Redux/MMKV then work) /
    // 앱에서 reconnect 호출하도록 Runtime.evaluate 주입 → 앱이 서버에 연결 (Redux/MMKV 동작)
    // Always send on new metro proxy connection (including Inspector refresh: new DevTools iframe = new connection) /
    // 새 metro proxy 연결 시마다 전송 (Inspector 새로고침 포함: 새 DevTools iframe = 새 연결)
    let inject_reconnect = serde_json::json!({
        "id": INJECT_RECONNECT_CDP_ID,
        "method": "Runtime.evaluate",
        "params": {
            "expression": INJECT_RECONNECT_EXPRESSION
        }
    });
    if let Ok(inject_text) = serde_json::to_string(&inject_reconnect) {
        if metro_sink
            .send(TungsteniteMessage::Text(inject_text))
            .await
            .is_err()
        {
            logger.log(
                LogType::Server,
                "metro-proxy",
                "Failed to send inject reconnect to Metro",
                None,
                None,
            );
        }
    }

    // --- Register in devtools map to receive app responses via fan-out ---
    // Always register so that when RN inspector connects later we can associate (no refresh needed)
    // 앱이 나중에 연결돼도 연동되도록 항상 등록 (새로고침 불필요)
    let (app_tx, mut app_rx) = mpsc::unbounded_channel::<String>();
    let metro_devtools_id = format!("metro-proxy-{}", uuid::Uuid::new_v4().simple());

    // Find the first available RN inspector connection (if any)
    // 첫 번째 사용 가능한 RN inspector 연결 찾기 (있으면)
    let (rn_connection_id, rn_client_id) = {
        let connections = rn_manager.get_all_connections().await;
        connections
            .first()
            .map(|c| (Some(c.id.clone()), c.client_id.clone()))
            .unwrap_or((None, None))
    };

    // When existing RN inspector is already connected (e.g. Inspector refresh), send inject again so app
    // reconnects and Redux/AsyncStorage work / 기존 RN이 이미 연결된 경우(Inspector 새로고침) inject를 한 번 더 전송
    if rn_connection_id.is_some() {
        if let Ok(inject_text) = serde_json::to_string(&inject_reconnect) {
            if metro_sink
                .send(TungsteniteMessage::Text(inject_text))
                .await
                .is_err()
            {
                logger.log(
                    LogType::Server,
                    "metro-proxy",
                    "Failed to send second inject reconnect (refresh path) to Metro",
                    None,
                    None,
                );
            }
        }
    }

    let devtool_entry = Arc::new(DevTools {
        id: metro_devtools_id.clone(),
        client_id: rn_client_id.clone(),
        sender: app_tx.clone(),
    });
    {
        let mut devtools = devtools_map.write().await;
        devtools.insert(metro_devtools_id.clone(), devtool_entry);
    }
    if let Some(ref client_id) = rn_client_id {
        logger.log(
            LogType::Server,
            "metro-proxy",
            &format!(
                "Registered metro proxy as DevTools (id={}) for RN inspector client_id={}",
                metro_devtools_id, client_id
            ),
            None,
            None,
        );

        // Request stored events from RN inspector (like enable replay)
        let methods = vec![
            "Storage.replayStoredEvents",
            "SessionReplay.replayStoredEvents",
        ];
        if let Some(ref conn_id) = rn_connection_id {
            if let Some(connection) = rn_manager.get_connection(conn_id).await {
                let sender = connection.sender.read().await;
                for method in methods {
                    let message = serde_json::json!({
                        "method": method,
                        "params": {},
                    });
                    if let Ok(json_str) = serde_json::to_string(&message) {
                        let _ = sender.send(json_str);
                    }
                }
            }
        }

        // Send cached Redux stores to this (new) DevTools so Redux/AsyncStorage panel works after refresh /
        // 새로고침 후에도 Redux/AsyncStorage 패널이 동작하도록 캐시된 Redux store를 이 DevTools로 전송
        if let Some(ref conn_id) = rn_connection_id {
            let metro_sender = app_tx.clone();
            let rn_manager_redux = rn_manager.clone();
            let logger_redux = logger.clone();
            let metro_id_redux = metro_devtools_id.clone();
            let inspector_id_for_redux = conn_id.clone();
            tokio::spawn(async move {
                tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
                let stores = rn_manager_redux
                    .get_redux_stores(&inspector_id_for_redux)
                    .await;
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
                        LogType::Server,
                        "metro-proxy",
                        &format!(
                            "Sent {} cached Redux store(s) to new DevTools ({})",
                            stores.len(),
                            metro_id_redux
                        ),
                        None,
                        None,
                    );
                }
            });
        }
    } else {
        logger.log(
            LogType::Server,
            "metro-proxy",
            "No RN inspector yet; registered as waiting (will associate when app connects)",
            None,
            None,
        );
    }

    // Task: DevTools → Metro / App (multiplex by domain). Look up client_id from devtools map
    // per message so that later-associated RN inspector is used without refresh.
    // DevTools → Metro / App (도메인별 멀티플렉싱). 메시지마다 devtools 맵에서 client_id 조회하여
    // 나중에 연동된 RN inspector도 새로고침 없이 사용
    let logger_d2m = logger.clone();
    let rn_manager_d2m = rn_manager.clone();
    let devtools_map_d2m = devtools_map.clone();
    let metro_devtools_id_d2m = metro_devtools_id.clone();
    let devtools_to_metro = tokio::spawn(async move {
        while let Some(msg) = devtools_stream.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    // Try to parse and check if it's a custom domain
                    // 파싱하여 커스텀 도메인인지 확인
                    // Avoid allocating String: use &str from parsed Value in same scope / String 할당 없이 파싱된 Value의 &str 사용 (Copilot review)
                    let is_custom = serde_json::from_str::<serde_json::Value>(&text)
                        .ok()
                        .and_then(|v| {
                            v.get("method")
                                .and_then(|m| m.as_str())
                                .map(is_custom_cdp_domain)
                        })
                        .unwrap_or(false);

                    if is_custom {
                        // Look up current client_id from devtools map (so later-associated inspector is used)
                        // devtools 맵에서 현재 client_id 조회 (나중에 연동된 inspector 사용)
                        let conn_id = {
                            let devtools = devtools_map_d2m.read().await;
                            devtools
                                .get(&metro_devtools_id_d2m)
                                .and_then(|d| d.client_id.clone())
                        };
                        let sent = if let Some(ref conn_id) = conn_id {
                            if let Some(connection) = rn_manager_d2m.get_connection(conn_id).await {
                                let sender = connection.sender.read().await;
                                match sender.send(text.clone()) {
                                    Ok(()) => true,
                                    Err(e) => {
                                        logger_d2m.log_error(
                                            LogType::Server,
                                            "metro-proxy",
                                            &format!(
                                                "Failed to send custom CDP to RN inspector: {}",
                                                e
                                            ),
                                            None,
                                        );
                                        false
                                    }
                                }
                            } else {
                                false
                            }
                        } else {
                            false
                        };
                        if !sent {
                            logger_d2m.log(
                                LogType::Server,
                                "metro-proxy",
                                "Custom CDP message dropped: no RN inspector connection available",
                                None,
                                None,
                            );
                        }
                    } else {
                        // Forward standard CDP to Metro / 표준 CDP는 Metro로 전달
                        if metro_sink
                            .send(TungsteniteMessage::Text(text))
                            .await
                            .is_err()
                        {
                            break;
                        }
                    }
                }
                Ok(Message::Binary(data)) => {
                    if metro_sink
                        .send(TungsteniteMessage::Binary(data))
                        .await
                        .is_err()
                    {
                        break;
                    }
                }
                Ok(Message::Close(_)) => {
                    let _ = metro_sink.send(TungsteniteMessage::Close(None)).await;
                    break;
                }
                Ok(Message::Ping(data)) => {
                    let _ = metro_sink.send(TungsteniteMessage::Ping(data)).await;
                }
                Ok(Message::Pong(data)) => {
                    let _ = metro_sink.send(TungsteniteMessage::Pong(data)).await;
                }
                Err(e) => {
                    logger_d2m.log_error(
                        LogType::Server,
                        "metro-proxy",
                        "DevTools WebSocket error",
                        Some(&e.to_string()),
                    );
                    break;
                }
            }
        }
    });

    // Task: Metro + App → DevTools (merge both streams) / Metro + App → DevTools (양쪽 스트림 병합)
    // Receives from Metro (with URL rewriting) and from app (via fan-out channel)
    // Metro에서 (URL 재작성) 및 앱에서 (팬아웃 채널을 통해) 수신
    let logger_m2d = logger.clone();
    let metro_origin_clone = metro_origin.clone();
    let server_origin_clone = server_origin.clone();
    let metro_to_devtools = tokio::spawn(async move {
        loop {
            tokio::select! {
                // Messages from Metro bundler / Metro 번들러로부터의 메시지
                msg = metro_stream.next() => {
                    match msg {
                        Some(Ok(TungsteniteMessage::Text(text))) => {
                            // Skip our inject reconnect response so we don't forward to DevTools / 주입한 reconnect 응답은 DevTools로 전달하지 않음
                            if serde_json::from_str::<serde_json::Value>(&text)
                                .ok()
                                .and_then(|v| v.get("id").and_then(|id| id.as_i64()))
                                == Some(INJECT_RECONNECT_CDP_ID)
                            {
                                continue;
                            }
                            let rewritten = rewrite_script_parsed_urls(
                                &text,
                                &metro_origin_clone,
                                &server_origin_clone,
                            );
                            if devtools_sink.send(Message::Text(rewritten)).await.is_err() {
                                break;
                            }
                        }
                        Some(Ok(TungsteniteMessage::Binary(data))) => {
                            if devtools_sink.send(Message::Binary(data)).await.is_err() {
                                break;
                            }
                        }
                        Some(Ok(TungsteniteMessage::Close(_))) => {
                            let _ = devtools_sink.send(Message::Close(None)).await;
                            break;
                        }
                        Some(Ok(TungsteniteMessage::Ping(data))) => {
                            let _ = devtools_sink.send(Message::Ping(data)).await;
                        }
                        Some(Ok(TungsteniteMessage::Pong(data))) => {
                            let _ = devtools_sink.send(Message::Pong(data)).await;
                        }
                        Some(Err(e)) => {
                            logger_m2d.log_error(
                                LogType::Server,
                                "metro-proxy",
                                "Metro WebSocket error",
                                Some(&e.to_string()),
                            );
                            break;
                        }
                        None => break, // Metro stream ended / Metro 스트림 종료
                        _ => {}
                    }
                }
                // Messages from RN app (via devtools fan-out) / RN 앱으로부터의 메시지 (devtools 팬아웃을 통해)
                app_msg = app_rx.recv() => {
                    match app_msg {
                        Some(text) => {
                            if devtools_sink.send(Message::Text(text)).await.is_err() {
                                break;
                            }
                        }
                        None => {
                            // App channel closed; continue with Metro only
                            // 앱 채널 닫힘; Metro만으로 계속
                        }
                    }
                }
            }
        }
    });

    // Wait for either task to finish, then abort the other / 한쪽이 끝나면 다른 쪽 종료
    let mut d2m = devtools_to_metro;
    let mut m2d = metro_to_devtools;
    tokio::select! {
        _ = &mut d2m => {
            m2d.abort();
        }
        _ = &mut m2d => {
            d2m.abort();
        }
    }

    // Cleanup: remove from devtools map / 정리: devtools 맵에서 제거
    {
        let mut devtools = devtools_map.write().await;
        devtools.remove(&metro_devtools_id);
    }

    logger.log(
        LogType::Server,
        "metro-proxy",
        "Metro proxy connection closed",
        None,
        None,
    );
}

#[cfg(test)]
mod tests {
    use super::{INJECT_RECONNECT_CDP_ID, INJECT_RECONNECT_EXPRESSION};

    /// Inject payload must be Runtime.evaluate with expression that calls __ChromeRemoteDevToolsReconnect /
    /// inject 페이로드는 Runtime.evaluate이며 표현식이 __ChromeRemoteDevToolsReconnect를 호출해야 함
    #[test]
    fn inject_reconnect_payload_shape() {
        let inject = serde_json::json!({
            "id": INJECT_RECONNECT_CDP_ID,
            "method": "Runtime.evaluate",
            "params": {
                "expression": INJECT_RECONNECT_EXPRESSION
            }
        });
        assert_eq!(inject["method"], "Runtime.evaluate");
        let expr = inject["params"]["expression"].as_str().unwrap();
        assert!(
            expr.contains("__ChromeRemoteDevToolsReconnect"),
            "expression must call __ChromeRemoteDevToolsReconnect for RN app reconnect"
        );
    }
}
