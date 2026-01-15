// Bridge Reactotron messages to CDP format / Reactotron 메시지를 CDP 형식으로 변환하는 브릿지
use crate::logging::{LogType, Logger};
use crate::reactotron_server::types::Command;
use std::sync::Arc;

/// Convert Reactotron command to CDP message / Reactotron 명령을 CDP 메시지로 변환
/// Returns None if the command type is not supported / 지원되지 않는 명령 타입이면 None 반환
pub fn convert_reactotron_to_cdp(
    cmd: &Command,
    logger: Arc<Logger>,
) -> Option<serde_json::Value> {
    let cmd_type = cmd.r#type.as_str();
    
    // Check if it's a console message / 콘솔 메시지인지 확인
    if cmd_type.starts_with("console.") {
        let console_type = match cmd_type {
            "console.log" | "console.debug" | "console.info" => "log",
            "console.warn" => "warning",
            "console.error" => "error",
            "console.trace" => "trace",
            "console.clear" => "clear",
            _ => {
                // Try to extract type from payload / payload에서 타입 추출 시도
                if let Some(level) = cmd.payload.get("level").and_then(|v| v.as_str()) {
                    match level {
                        "log" | "debug" | "info" => "log",
                        "warn" => "warning",
                        "error" => "error",
                        "trace" => "trace",
                        _ => "log",
                    }
                } else {
                    "log" // Default to log / 기본값은 log
                }
            }
        };
        return convert_console_to_cdp(cmd, console_type, logger);
    }
    
    // Check if it's a console message with type "console" / 타입이 "console"인 경우
    if cmd_type == "console" {
        let console_type = cmd
            .payload
            .get("level")
            .and_then(|v| v.as_str())
            .map(|level| match level {
                "log" | "debug" | "info" => "log",
                "warn" => "warning",
                "error" => "error",
                "trace" => "trace",
                _ => "log",
            })
            .unwrap_or("log");
        return convert_console_to_cdp(cmd, console_type, logger);
    }
    
    // Check if it's a network event / 네트워크 이벤트인지 확인
    if cmd_type.starts_with("network.") || cmd_type == "api.request" || cmd_type == "api.response" {
        match cmd_type {
            "network.request" | "api.request" => {
                return convert_network_request_to_cdp(cmd, logger);
            }
            "network.response" | "api.response" => {
                return convert_network_response_to_cdp(cmd, logger);
            }
            "network.error" | "api.error" => {
                return convert_network_error_to_cdp(cmd, logger);
            }
            _ => {}
        }
    }
    
    // Check if it's a network event with type "network" or "api" / 타입이 "network" 또는 "api"인 경우
    if cmd_type == "network" || cmd_type == "api" {
        if let Some(kind) = cmd.payload.get("kind").and_then(|v| v.as_str()) {
            match kind {
                "request" => return convert_network_request_to_cdp(cmd, logger),
                "response" => return convert_network_response_to_cdp(cmd, logger),
                "error" => return convert_network_error_to_cdp(cmd, logger),
                _ => {}
            }
        }
    }

    // Other types are not converted / 다른 타입은 변환하지 않음
    None
}

/// Convert console message to CDP Runtime.consoleAPICalled event / 콘솔 메시지를 CDP Runtime.consoleAPICalled 이벤트로 변환
fn convert_console_to_cdp(
    cmd: &Command,
    console_type: &str,
    logger: Arc<Logger>,
) -> Option<serde_json::Value> {
    // Extract message from payload / payload에서 메시지 추출
    let message = cmd
        .payload
        .get("message")
        .and_then(|v| v.as_str())
        .map(String::from)
        .or_else(|| {
            cmd.payload
                .get("value")
                .and_then(|v| v.as_str())
                .map(String::from)
        })
        .unwrap_or_else(|| "".to_string());

    // Extract args if available / args가 있으면 추출
    let args = if let Some(args_array) = cmd.payload.get("args").and_then(|v| v.as_array()) {
        args_array
            .iter()
            .map(|arg| {
                // Convert argument to CDP format / 인자를 CDP 형식으로 변환
                let value = if let Some(str_val) = arg.as_str() {
                    str_val.to_string()
                } else {
                    serde_json::to_string(arg).unwrap_or_else(|_| "undefined".to_string())
                };
                serde_json::json!({
                    "type": "string",
                    "value": value,
                })
            })
            .collect::<Vec<_>>()
    } else if !message.is_empty() {
        // If no args but has message, create args from message / args가 없지만 message가 있으면 message로 args 생성
        vec![serde_json::json!({
            "type": "string",
            "value": message,
        })]
    } else {
        vec![]
    };

    // Get timestamp / 타임스탬프 가져오기
    let timestamp = cmd
        .date
        .as_ref()
        .and_then(|d| {
            // Try to parse timestamp from date string / date 문자열에서 타임스탬프 파싱 시도
            d.parse::<f64>().ok().map(|t| (t * 1000.0) as u64)
        })
        .unwrap_or_else(|| {
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64
        });

    // Create CDP message / CDP 메시지 생성
    let cdp_message = serde_json::json!({
        "method": "Runtime.consoleAPICalled",
        "params": {
            "type": console_type,
            "args": args,
            "executionContextId": 1,
            "timestamp": timestamp,
            "stackTrace": {
                "callFrames": []
            }
        }
    });

    logger.log(
        LogType::Reactotron,
        "cdp-bridge",
        &format!("Converted console.{} to Runtime.consoleAPICalled", console_type),
        Some(&cdp_message),
        Some("Runtime.consoleAPICalled"),
    );

    Some(cdp_message)
}

/// Convert network request to CDP Network.requestWillBeSent event / 네트워크 요청을 CDP Network.requestWillBeSent 이벤트로 변환
fn convert_network_request_to_cdp(
    cmd: &Command,
    logger: Arc<Logger>,
) -> Option<serde_json::Value> {
    let payload = &cmd.payload;

    // Extract request information / 요청 정보 추출
    let url = payload
        .get("url")
        .and_then(|v| v.as_str())
        .map(String::from)
        .unwrap_or_else(|| "".to_string());

    let method = payload
        .get("method")
        .and_then(|v| v.as_str())
        .map(String::from)
        .unwrap_or_else(|| "GET".to_string());

    let headers = payload.get("headers").cloned().unwrap_or_else(|| serde_json::json!({}));

    let post_data = payload.get("data").or_else(|| payload.get("body"));

    // Generate request ID / 요청 ID 생성
    let request_id = payload
        .get("requestId")
        .and_then(|v| v.as_str())
        .map(String::from)
        .unwrap_or_else(|| {
            format!(
                "reactotron-{}",
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_nanos()
            )
        });

    // Get timestamp / 타임스탬프 가져오기
    let timestamp = cmd
        .date
        .as_ref()
        .and_then(|d| d.parse::<f64>().ok().map(|t| (t * 1000.0) as u64))
        .unwrap_or_else(|| {
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64
        });

    // Create CDP message / CDP 메시지 생성
    let mut params = serde_json::json!({
        "requestId": request_id,
        "loaderId": request_id.clone(),
        "documentURL": url.clone(),
        "request": {
            "url": url,
            "method": method,
            "headers": headers,
            "mixedContentType": "none",
            "initialPriority": "Medium",
            "referrerPolicy": "strict-origin-when-cross-origin",
        },
        "timestamp": timestamp as f64 / 1000.0,
        "wallTime": timestamp as f64 / 1000.0,
        "initiator": {
            "type": "other"
        },
        "type": "Other",
    });

    // Add post data if available / post data가 있으면 추가
    if let Some(data) = post_data {
        if let Some(request_obj) = params.get_mut("request").and_then(|r| r.as_object_mut()) {
            if let Some(data_str) = data.as_str() {
                request_obj.insert("postData".to_string(), serde_json::json!(data_str));
            } else {
                request_obj.insert(
                    "postData".to_string(),
                    serde_json::json!(serde_json::to_string(data).unwrap_or_else(|_| "{}".to_string())),
                );
            }
        }
    }

    let cdp_message = serde_json::json!({
        "method": "Network.requestWillBeSent",
        "params": params
    });

    logger.log(
        LogType::Reactotron,
        "cdp-bridge",
        "Converted network.request to Network.requestWillBeSent",
        Some(&cdp_message),
        Some("Network.requestWillBeSent"),
    );

    Some(cdp_message)
}

/// Convert network response to CDP Network.responseReceived event / 네트워크 응답을 CDP Network.responseReceived 이벤트로 변환
fn convert_network_response_to_cdp(
    cmd: &Command,
    logger: Arc<Logger>,
) -> Option<serde_json::Value> {
    let payload = &cmd.payload;

    // Extract response information / 응답 정보 추출
    let url = payload
        .get("url")
        .and_then(|v| v.as_str())
        .map(String::from)
        .unwrap_or_else(|| "".to_string());

    let status = payload
        .get("status")
        .and_then(|v| v.as_u64())
        .unwrap_or(200);

    let status_text = payload
        .get("statusText")
        .and_then(|v| v.as_str())
        .map(String::from)
        .unwrap_or_else(|| "OK".to_string());

    let headers = payload.get("headers").cloned().unwrap_or_else(|| serde_json::json!({}));

    // Generate request ID / 요청 ID 생성
    let request_id = payload
        .get("requestId")
        .and_then(|v| v.as_str())
        .map(String::from)
        .unwrap_or_else(|| {
            format!(
                "reactotron-{}",
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_nanos()
            )
        });

    // Get timestamp / 타임스탬프 가져오기
    let timestamp = cmd
        .date
        .as_ref()
        .and_then(|d| d.parse::<f64>().ok().map(|t| (t * 1000.0) as u64))
        .unwrap_or_else(|| {
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64
        });

    // Create CDP message / CDP 메시지 생성
    let cdp_message = serde_json::json!({
        "method": "Network.responseReceived",
        "params": {
            "requestId": request_id,
            "loaderId": request_id.clone(),
            "timestamp": timestamp as f64 / 1000.0,
            "type": "Other",
            "response": {
                "url": url,
                "status": status,
                "statusText": status_text,
                "headers": headers,
                "mimeType": payload.get("mimeType").and_then(|v| v.as_str()).unwrap_or("application/json"),
                "connectionReused": false,
                "connectionId": 0,
                "fromDiskCache": false,
                "fromServiceWorker": false,
                "fromPrefetchCache": false,
                "encodedDataLength": 0,
                "timing": {
                    "requestTime": timestamp as f64 / 1000.0,
                    "proxyStart": -1.0,
                    "proxyEnd": -1.0,
                    "dnsStart": -1.0,
                    "dnsEnd": -1.0,
                    "connectStart": -1.0,
                    "connectEnd": -1.0,
                    "sslStart": -1.0,
                    "sslEnd": -1.0,
                    "workerStart": -1.0,
                    "workerReady": -1.0,
                    "sendStart": 0.0,
                    "sendEnd": 0.0,
                    "pushStart": -1.0,
                    "pushEnd": -1.0,
                    "receiveHeadersEnd": 0.0,
                },
                "protocol": "http/1.1",
                "securityState": "unknown",
            },
        }
    });

    logger.log(
        LogType::Reactotron,
        "cdp-bridge",
        "Converted network.response to Network.responseReceived",
        Some(&cdp_message),
        Some("Network.responseReceived"),
    );

    Some(cdp_message)
}

/// Convert network error to CDP Network.loadingFailed event / 네트워크 에러를 CDP Network.loadingFailed 이벤트로 변환
fn convert_network_error_to_cdp(
    cmd: &Command,
    logger: Arc<Logger>,
) -> Option<serde_json::Value> {
    let payload = &cmd.payload;

    // Extract error information / 에러 정보 추출
    let url = payload
        .get("url")
        .and_then(|v| v.as_str())
        .map(String::from)
        .unwrap_or_else(|| "".to_string());

    let error_text = payload
        .get("error")
        .and_then(|v| v.as_str())
        .map(String::from)
        .or_else(|| {
            payload
                .get("message")
                .and_then(|v| v.as_str())
                .map(String::from)
        })
        .unwrap_or_else(|| "Network error".to_string());

    // Generate request ID / 요청 ID 생성
    let request_id = payload
        .get("requestId")
        .and_then(|v| v.as_str())
        .map(String::from)
        .unwrap_or_else(|| {
            format!(
                "reactotron-{}",
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_nanos()
            )
        });

    // Get timestamp / 타임스탬프 가져오기
    let timestamp = cmd
        .date
        .as_ref()
        .and_then(|d| d.parse::<f64>().ok().map(|t| (t * 1000.0) as u64))
        .unwrap_or_else(|| {
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64
        });

    // Create CDP message / CDP 메시지 생성
    let cdp_message = serde_json::json!({
        "method": "Network.loadingFailed",
        "params": {
            "requestId": request_id,
            "timestamp": timestamp as f64 / 1000.0,
            "type": "Other",
            "errorText": error_text,
            "canceled": false,
            "blockedReason": "other",
        }
    });

    logger.log(
        LogType::Reactotron,
        "cdp-bridge",
        "Converted network.error to Network.loadingFailed",
        Some(&cdp_message),
        Some("Network.loadingFailed"),
    );

    Some(cdp_message)
}
