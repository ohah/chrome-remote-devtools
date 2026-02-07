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

    // --- Register in devtools map to receive app responses via fan-out ---
    // devtools 맵에 등록하여 팬아웃을 통해 앱 응답을 받음
    let (app_tx, mut app_rx) = mpsc::unbounded_channel::<String>();
    let metro_devtools_id = format!("metro-proxy-{}", uuid::Uuid::new_v4().simple());

    // Find the first available RN inspector connection
    // get_connection is keyed by connection id (ConnectionInfo.id); DevTools.client_id uses client_id
    // 첫 번째 사용 가능한 RN inspector 연결 찾기.
    // get_connection은 ConnectionInfo.id로 조회하고, DevTools.client_id에는 client_id 사용
    let (rn_connection_id, rn_client_id) = {
        let connections = rn_manager.get_all_connections().await;
        connections
            .first()
            .map(|c| (Some(c.id.clone()), c.client_id.clone()))
            .unwrap_or((None, None))
    };

    if let Some(ref client_id) = rn_client_id {
        let devtool_entry = Arc::new(DevTools {
            id: metro_devtools_id.clone(),
            client_id: Some(client_id.clone()),
            sender: app_tx.clone(),
        });
        {
            let mut devtools = devtools_map.write().await;
            devtools.insert(metro_devtools_id.clone(), devtool_entry);
        }
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
        // RN inspector에 저장된 이벤트 요청 (enable replay 등)
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
    } else {
        logger.log(
            LogType::Server,
            "metro-proxy",
            "No RN inspector connection found; custom CDP domains will not be available",
            None,
            None,
        );
    }

    // Task: DevTools → Metro / App (multiplex by domain) / DevTools → Metro / App (도메인별 멀티플렉싱)
    let logger_d2m = logger.clone();
    let rn_manager_d2m = rn_manager.clone();
    let rn_connection_id_d2m = rn_connection_id.clone();
    let devtools_to_metro = tokio::spawn(async move {
        while let Some(msg) = devtools_stream.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    // Try to parse and check if it's a custom domain
                    // 파싱하여 커스텀 도메인인지 확인
                    let is_custom = serde_json::from_str::<serde_json::Value>(&text)
                        .ok()
                        .and_then(|v| v.get("method")?.as_str().map(String::from))
                        .map(|m| is_custom_cdp_domain(&m))
                        .unwrap_or(false);

                    if is_custom {
                        // Route to RN app via inspector connection (keyed by connection id)
                        // inspector 연결을 통해 RN 앱으로 라우팅 (connection id로 조회)
                        let sent = if let Some(ref conn_id) = rn_connection_id_d2m {
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
