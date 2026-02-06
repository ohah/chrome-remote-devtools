// Metro WebSocket proxy handler / Metro WebSocket 프록시 핸들러
// Proxies WebSocket between DevTools and Metro bundler, rewriting sourcemap URLs
// DevTools와 Metro 번들러 사이의 WebSocket을 프록시하고 소스맵 URL을 재작성
use crate::logging::{LogType, Logger};
use axum::extract::ws::{Message, WebSocket};
use futures_util::{SinkExt, StreamExt};
use std::collections::HashMap;
use std::sync::Arc;
use tokio_tungstenite::tungstenite::Message as TungsteniteMessage;
use url::Url;

/// Handle Metro WebSocket proxy connection / Metro WebSocket 프록시 연결 처리
/// Connects to Metro's WebSocket and relays messages bidirectionally,
/// rewriting Debugger.scriptParsed URLs to go through our server's resource proxy.
/// Metro WebSocket에 연결하고 메시지를 양방향으로 중계하며,
/// Debugger.scriptParsed URL을 우리 서버의 리소스 프록시를 통하도록 재작성
pub async fn handle_metro_proxy_websocket(
    ws: WebSocket,
    query_params: HashMap<String, String>,
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

    // Task: DevTools → Metro (forward unmodified) / DevTools → Metro (수정 없이 전달)
    let logger_d2m = logger.clone();
    let devtools_to_metro = tokio::spawn(async move {
        while let Some(msg) = devtools_stream.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    if metro_sink
                        .send(TungsteniteMessage::Text(text))
                        .await
                        .is_err()
                    {
                        break;
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

    // Task: Metro → DevTools (rewrite URLs in Debugger.scriptParsed) / Metro → DevTools (Debugger.scriptParsed URL 재작성)
    let logger_m2d = logger.clone();
    let metro_origin_clone = metro_origin.clone();
    let server_origin_clone = server_origin.clone();
    let metro_to_devtools = tokio::spawn(async move {
        while let Some(msg) = metro_stream.next().await {
            match msg {
                Ok(TungsteniteMessage::Text(text)) => {
                    let rewritten = rewrite_script_parsed_urls(
                        &text,
                        &metro_origin_clone,
                        &server_origin_clone,
                    );
                    if devtools_sink
                        .send(Message::Text(rewritten))
                        .await
                        .is_err()
                    {
                        break;
                    }
                }
                Ok(TungsteniteMessage::Binary(data)) => {
                    if devtools_sink
                        .send(Message::Binary(data))
                        .await
                        .is_err()
                    {
                        break;
                    }
                }
                Ok(TungsteniteMessage::Close(_)) => {
                    let _ = devtools_sink.send(Message::Close(None)).await;
                    break;
                }
                Ok(TungsteniteMessage::Ping(data)) => {
                    let _ = devtools_sink.send(Message::Ping(data)).await;
                }
                Ok(TungsteniteMessage::Pong(data)) => {
                    let _ = devtools_sink.send(Message::Pong(data)).await;
                }
                Err(e) => {
                    logger_m2d.log_error(
                        LogType::Server,
                        "metro-proxy",
                        "Metro WebSocket error",
                        Some(&e.to_string()),
                    );
                    break;
                }
                _ => {}
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

    logger.log(
        LogType::Server,
        "metro-proxy",
        "Metro proxy connection closed",
        None,
        None,
    );
}

/// Derive HTTP origin from a WebSocket URL / WebSocket URL에서 HTTP origin 도출
/// e.g. "ws://localhost:8081/page/abc" → "http://localhost:8081"
fn derive_metro_origin(ws_url: &str) -> Option<String> {
    let parsed = Url::parse(ws_url).ok()?;
    let scheme = match parsed.scheme() {
        "ws" => "http",
        "wss" => "https",
        other => other,
    };
    let host = parsed.host_str()?;
    match parsed.port() {
        Some(port) => Some(format!("{}://{}:{}", scheme, host, port)),
        None => Some(format!("{}://{}", scheme, host)),
    }
}

/// Rewrite URLs in Debugger.scriptParsed CDP messages / Debugger.scriptParsed CDP 메시지의 URL 재작성
/// Rewrites url and sourceMapURL fields to go through our server's /metro-resource proxy
/// url과 sourceMapURL 필드를 우리 서버의 /metro-resource 프록시를 통하도록 재작성
fn rewrite_script_parsed_urls(message: &str, metro_origin: &str, server_origin: &str) -> String {
    // Try to parse as JSON / JSON 파싱 시도
    let mut parsed: serde_json::Value = match serde_json::from_str(message) {
        Ok(v) => v,
        Err(_) => return message.to_string(), // Not JSON, pass through / JSON이 아님, 그대로 전달
    };

    // Check if this is Debugger.scriptParsed / Debugger.scriptParsed인지 확인
    let method = parsed.get("method").and_then(|m| m.as_str()).unwrap_or("");
    if method != "Debugger.scriptParsed" {
        return message.to_string(); // Not scriptParsed, pass through / scriptParsed가 아님, 그대로 전달
    }

    // Get params object / params 객체 가져오기
    let params = match parsed.get_mut("params") {
        Some(p) if p.is_object() => p,
        _ => return message.to_string(),
    };

    // Rewrite params.url / params.url 재작성
    let original_url = params
        .get("url")
        .and_then(|u| u.as_str())
        .unwrap_or("")
        .to_string();

    if !original_url.is_empty() {
        let rewritten_url = rewrite_url(&original_url, metro_origin, server_origin);
        if let Some(obj) = params.as_object_mut() {
            obj.insert("url".to_string(), serde_json::Value::String(rewritten_url));
        }
    }

    // Rewrite params.sourceMapURL / params.sourceMapURL 재작성
    if let Some(source_map_url) = params.get("sourceMapURL").and_then(|u| u.as_str()) {
        let source_map_url = source_map_url.to_string();
        if !source_map_url.is_empty() && !source_map_url.starts_with("data:") {
            let resolved = resolve_url(&source_map_url, &original_url);
            let rewritten = rewrite_url(&resolved, metro_origin, server_origin);
            if let Some(obj) = params.as_object_mut() {
                obj.insert(
                    "sourceMapURL".to_string(),
                    serde_json::Value::String(rewritten),
                );
            }
        }
    }

    // Serialize back / 다시 직렬화
    serde_json::to_string(&parsed).unwrap_or_else(|_| message.to_string())
}

/// Rewrite a URL to go through our server's /metro-resource proxy / URL을 우리 서버의 /metro-resource 프록시를 통하도록 재작성
/// Only rewrites if the URL matches the Metro origin / Metro origin과 일치하는 URL만 재작성
fn rewrite_url(url: &str, metro_origin: &str, server_origin: &str) -> String {
    if url.starts_with(metro_origin) {
        if let Ok(mut proxy_url) = Url::parse(&format!("{}/metro-resource", server_origin)) {
            proxy_url.query_pairs_mut().append_pair("url", url);
            return proxy_url.to_string();
        }
    }
    url.to_string()
}

/// Resolve a potentially relative URL against a base URL / 기준 URL에 대해 상대 URL을 해석
fn resolve_url(url: &str, base: &str) -> String {
    if url.starts_with("http://") || url.starts_with("https://") {
        return url.to_string();
    }
    // Try resolving relative URL against base / 기준 URL에 대해 상대 URL 해석 시도
    if let Ok(base_url) = Url::parse(base) {
        if let Ok(resolved) = base_url.join(url) {
            return resolved.to_string();
        }
    }
    url.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_derive_metro_origin_ws() {
        assert_eq!(
            derive_metro_origin("ws://localhost:8081/page/abc"),
            Some("http://localhost:8081".to_string())
        );
    }

    #[test]
    fn test_derive_metro_origin_wss() {
        // Port 443 is default for https, so url crate omits it / 443은 https 기본 포트이므로 url crate가 생략
        assert_eq!(
            derive_metro_origin("wss://host.example.com:443/page/1"),
            Some("https://host.example.com".to_string())
        );
        // Non-default port should be preserved / 기본 포트가 아닌 경우 유지
        assert_eq!(
            derive_metro_origin("wss://host.example.com:8443/page/1"),
            Some("https://host.example.com:8443".to_string())
        );
    }

    #[test]
    fn test_derive_metro_origin_no_port() {
        assert_eq!(
            derive_metro_origin("ws://localhost/page/abc"),
            Some("http://localhost".to_string())
        );
    }

    #[test]
    fn test_derive_metro_origin_invalid() {
        assert_eq!(derive_metro_origin("not a url"), None);
    }

    #[test]
    fn test_rewrite_absolute_urls() {
        let message = serde_json::json!({
            "method": "Debugger.scriptParsed",
            "params": {
                "scriptId": "1",
                "url": "http://localhost:8081/index.bundle?platform=ios",
                "sourceMapURL": "http://localhost:8081/index.map?platform=ios"
            }
        })
        .to_string();

        let result =
            rewrite_script_parsed_urls(&message, "http://localhost:8081", "http://localhost:8080");
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();

        let url = parsed["params"]["url"].as_str().unwrap();
        assert!(url.starts_with("http://localhost:8080/metro-resource?url="));
        assert!(url.contains("index.bundle"));

        let source_map = parsed["params"]["sourceMapURL"].as_str().unwrap();
        assert!(source_map.starts_with("http://localhost:8080/metro-resource?url="));
        assert!(source_map.contains("index.map"));
    }

    #[test]
    fn test_rewrite_relative_source_map_url() {
        let message = serde_json::json!({
            "method": "Debugger.scriptParsed",
            "params": {
                "scriptId": "1",
                "url": "http://localhost:8081/index.bundle?platform=ios",
                "sourceMapURL": "/index.map?platform=ios"
            }
        })
        .to_string();

        let result =
            rewrite_script_parsed_urls(&message, "http://localhost:8081", "http://localhost:8080");
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();

        let source_map = parsed["params"]["sourceMapURL"].as_str().unwrap();
        // Relative URL should be resolved against script URL, then rewritten
        assert!(source_map.starts_with("http://localhost:8080/metro-resource?url="));
        assert!(source_map.contains("index.map"));
    }

    #[test]
    fn test_passthrough_non_script_parsed() {
        let message = serde_json::json!({
            "method": "Runtime.enable",
            "id": 1,
            "params": {}
        })
        .to_string();

        let result =
            rewrite_script_parsed_urls(&message, "http://localhost:8081", "http://localhost:8080");
        assert_eq!(result, message);
    }

    #[test]
    fn test_passthrough_invalid_json() {
        let message = "not json at all";
        let result =
            rewrite_script_parsed_urls(message, "http://localhost:8081", "http://localhost:8080");
        assert_eq!(result, message);
    }

    #[test]
    fn test_no_rewrite_data_uri() {
        let message = serde_json::json!({
            "method": "Debugger.scriptParsed",
            "params": {
                "scriptId": "1",
                "url": "http://localhost:8081/index.bundle",
                "sourceMapURL": "data:application/json;base64,abc123"
            }
        })
        .to_string();

        let result =
            rewrite_script_parsed_urls(&message, "http://localhost:8081", "http://localhost:8080");
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();

        let source_map = parsed["params"]["sourceMapURL"].as_str().unwrap();
        assert!(source_map.starts_with("data:"));
    }

    #[test]
    fn test_no_rewrite_different_origin() {
        let message = serde_json::json!({
            "method": "Debugger.scriptParsed",
            "params": {
                "scriptId": "1",
                "url": "http://other-host:9090/bundle.js",
                "sourceMapURL": "http://other-host:9090/bundle.map"
            }
        })
        .to_string();

        let result =
            rewrite_script_parsed_urls(&message, "http://localhost:8081", "http://localhost:8080");
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();

        // URLs from different origin should not be rewritten / 다른 origin의 URL은 재작성하지 않음
        assert_eq!(
            parsed["params"]["url"].as_str().unwrap(),
            "http://other-host:9090/bundle.js"
        );
        assert_eq!(
            parsed["params"]["sourceMapURL"].as_str().unwrap(),
            "http://other-host:9090/bundle.map"
        );
    }

    #[test]
    fn test_missing_source_map_url() {
        let message = serde_json::json!({
            "method": "Debugger.scriptParsed",
            "params": {
                "scriptId": "1",
                "url": "http://localhost:8081/index.bundle"
            }
        })
        .to_string();

        let result =
            rewrite_script_parsed_urls(&message, "http://localhost:8081", "http://localhost:8080");
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();

        // url should still be rewritten / url은 여전히 재작성되어야 함
        let url = parsed["params"]["url"].as_str().unwrap();
        assert!(url.starts_with("http://localhost:8080/metro-resource?url="));

        // sourceMapURL should not exist / sourceMapURL은 존재하지 않아야 함
        assert!(parsed["params"]["sourceMapURL"].is_null());
    }
}
