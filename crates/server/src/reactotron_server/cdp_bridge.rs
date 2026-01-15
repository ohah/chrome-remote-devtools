// Bridge Reactotron messages to CDP format / Reactotron 메시지를 CDP 형식으로 변환하는 브릿지
use crate::logging::{LogType, Logger};
use crate::reactotron_server::types::Command;
use std::sync::Arc;

/// Convert Reactotron command to CDP message / Reactotron 명령을 CDP 메시지로 변환
/// Returns None if the command type is not supported / 지원되지 않는 명령 타입이면 None 반환
pub fn convert_reactotron_to_cdp(cmd: &Command, logger: Arc<Logger>) -> Option<serde_json::Value> {
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

    // Check if it's a console message with type "console" or "log" / 타입이 "console" 또는 "log"인 경우
    if cmd_type == "console" || cmd_type == "log" {
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

        logger.log(
            LogType::Reactotron,
            "cdp-bridge",
            &format!(
                "📝 Detected console/log message with level: {}",
                console_type
            ),
            Some(&cmd.payload),
            Some("detect_console"),
        );

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

    // Command type not supported / 지원되지 않는 명령 타입
    None
}

/// Convert console message to CDP Runtime.consoleAPICalled event / 콘솔 메시지를 CDP Runtime.consoleAPICalled 이벤트로 변환
fn convert_console_to_cdp(
    cmd: &Command,
    console_type: &str,
    logger: Arc<Logger>,
) -> Option<serde_json::Value> {
    // Helper function to convert value to CDP RemoteObject / 값을 CDP RemoteObject로 변환하는 헬퍼 함수
    let convert_to_remote_object = |arg: &serde_json::Value| -> serde_json::Value {
        match arg {
            serde_json::Value::String(s) => {
                serde_json::json!({
                    "type": "string",
                    "value": s,
                })
            }
            serde_json::Value::Number(n) => {
                if let Some(i) = n.as_i64() {
                    serde_json::json!({
                        "type": "number",
                        "value": i,
                    })
                } else if let Some(f) = n.as_f64() {
                    serde_json::json!({
                        "type": "number",
                        "value": f,
                    })
                } else {
                    serde_json::json!({
                        "type": "string",
                        "value": n.to_string(),
                    })
                }
            }
            serde_json::Value::Bool(b) => {
                serde_json::json!({
                    "type": "boolean",
                    "value": b,
                })
            }
            serde_json::Value::Null => {
                serde_json::json!({
                    "type": "object",
                    "subtype": "null",
                })
            }
            serde_json::Value::Array(arr) => {
                let description = format!("Array({})", arr.len());
                serde_json::json!({
                    "type": "object",
                    "subtype": "array",
                    "description": description,
                    "value": serde_json::to_string(arg).unwrap_or_else(|_| "[]".to_string()),
                })
            }
            serde_json::Value::Object(_) => {
                let description = serde_json::to_string(arg).unwrap_or_else(|_| "{}".to_string());
                serde_json::json!({
                    "type": "object",
                    "description": description,
                    "value": description,
                })
            }
        }
    };

    // Extract args from payload / payload에서 args 추출
    // Reactotron의 log 타입은 message가 배열일 수 있음 / Reactotron's log type can have message as array
    let args = if let Some(args_array) = cmd.payload.get("args").and_then(|v| v.as_array()) {
        // args가 있으면 사용 / Use args if available
        args_array
            .iter()
            .map(convert_to_remote_object)
            .collect::<Vec<_>>()
    } else if let Some(message_array) = cmd.payload.get("message").and_then(|v| v.as_array()) {
        // message가 배열인 경우 / If message is an array
        message_array
            .iter()
            .map(convert_to_remote_object)
            .collect::<Vec<_>>()
    } else if let Some(message_str) = cmd.payload.get("message").and_then(|v| v.as_str()) {
        // message가 문자열인 경우 / If message is a string
        vec![serde_json::json!({
            "type": "string",
            "value": message_str.to_string(),
        })]
    } else if let Some(value) = cmd.payload.get("value") {
        // value가 있는 경우 (모든 타입 지원) / If value exists (supports all types)
        vec![convert_to_remote_object(value)]
    } else {
        vec![]
    };

    // Get timestamp in milliseconds (CDP Runtime.consoleAPICalled uses milliseconds) / 타임스탬프를 밀리초 단위로 가져오기 (CDP Runtime.consoleAPICalled는 밀리초 사용)
    // Reactotron's date field is typically in milliseconds (Date.now() format) / Reactotron의 date 필드는 일반적으로 밀리초 단위 (Date.now() 형식)
    let timestamp = cmd
        .date
        .as_ref()
        .and_then(|d| {
            // Try to parse timestamp from date string / date 문자열에서 타임스탬프 파싱 시도
            d.parse::<f64>().ok().map(|t| {
                // Reactotron typically sends milliseconds (Date.now()), but check if it's reasonable / Reactotron은 일반적으로 밀리초를 보내지만, 합리적인 값인지 확인
                // Current time in milliseconds (2025): ~1735689600000 / 현재 시간 밀리초 (2025년): ~1735689600000
                // If timestamp is unreasonably large (> year 3000 in milliseconds), it might be in microseconds / 타임스탬프가 비정상적으로 크면 (3000년 이후 밀리초), 마이크로초일 수 있음
                if t > 3_155_760_000_000_000.0 {
                    // Likely microseconds, convert to milliseconds / 마이크로초일 가능성, 밀리초로 변환
                    t / 1000.0
                } else if t > 4_102_444_800_000.0 {
                    // Already in milliseconds (but very large, might be future date) / 이미 밀리초 단위 (하지만 매우 큼, 미래 날짜일 수 있음)
                    t
                } else if t > 4_102_444_800.0 {
                    // Between 2100 seconds and 2100 milliseconds - ambiguous, assume milliseconds / 2100초와 2100밀리초 사이 - 모호함, 밀리초로 가정
                    t
                } else {
                    // Likely seconds, convert to milliseconds / 초일 가능성, 밀리초로 변환
                    t * 1000.0
                }
            })
        })
        .unwrap_or_else(|| {
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis() as f64
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
        &format!(
            "✅ Converted console.{} to Runtime.consoleAPICalled (args count: {})",
            console_type,
            args.len()
        ),
        Some(&serde_json::json!({
            "original": {
                "type": cmd.r#type,
                "payload": cmd.payload,
            },
            "converted": cdp_message,
        })),
        Some("Runtime.consoleAPICalled"),
    );

    Some(cdp_message)
}

/// Convert network request to CDP Network.requestWillBeSent event / 네트워크 요청을 CDP Network.requestWillBeSent 이벤트로 변환
fn convert_network_request_to_cdp(
    cmd: &Command,
    _logger: Arc<Logger>,
) -> Option<serde_json::Value> {
    let payload = &cmd.payload;

    // Extract request information / 요청 정보 추출
    // For api.request, URL is in payload.request.url / api.request의 경우 URL은 payload.request.url에 있음
    let url = payload
        .get("request")
        .and_then(|r| r.get("url"))
        .and_then(|v| v.as_str())
        .map(String::from)
        .or_else(|| {
            payload
                .get("url")
                .and_then(|v| v.as_str())
                .map(String::from)
        })
        .unwrap_or_else(|| "".to_string());

    let method = payload
        .get("request")
        .and_then(|r| r.get("method"))
        .and_then(|v| v.as_str())
        .map(String::from)
        .or_else(|| {
            payload
                .get("method")
                .and_then(|v| v.as_str())
                .map(String::from)
        })
        .unwrap_or_else(|| "GET".to_string());

    // For api.request, headers are in payload.request.headers / api.request의 경우 headers는 payload.request.headers에 있음
    let headers = payload
        .get("request")
        .and_then(|r| r.get("headers"))
        .cloned()
        .or_else(|| payload.get("headers").cloned())
        .unwrap_or_else(|| serde_json::json!({}));

    // For api.request, data is in payload.request.data / api.request의 경우 data는 payload.request.data에 있음
    let post_data = payload
        .get("request")
        .and_then(|r| r.get("data"))
        .or_else(|| payload.get("data"))
        .or_else(|| payload.get("body"));

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

    // Get timestamp in milliseconds / 타임스탬프를 밀리초 단위로 가져오기
    let timestamp_ms = cmd
        .date
        .as_ref()
        .and_then(|d| {
            d.parse::<f64>().ok().map(|t| {
                // If timestamp is very large (> year 2100 in seconds), assume it's in milliseconds / 타임스탬프가 매우 크면 (2100년 이후 초 단위), 밀리초 단위로 가정
                if t > 4_102_444_800.0 {
                    t as u64 // Already in milliseconds / 이미 밀리초 단위
                } else {
                    (t * 1000.0) as u64 // Convert seconds to milliseconds / 초를 밀리초로 변환
                }
            })
        })
        .unwrap_or_else(|| {
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64
        });

    // Create CDP message / CDP 메시지 생성
    // CDP Network events use seconds for timestamp and wallTime / CDP Network 이벤트는 timestamp와 wallTime에 초 단위 사용
    let timestamp_seconds = timestamp_ms as f64 / 1000.0;
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
        "timestamp": timestamp_seconds,
        "wallTime": timestamp_seconds,
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
                    serde_json::json!(
                        serde_json::to_string(data).unwrap_or_else(|_| "{}".to_string())
                    ),
                );
            }
        }
    }

    let cdp_message = serde_json::json!({
        "method": "Network.requestWillBeSent",
        "params": params
    });

    Some(cdp_message)
}

/// Convert network response to CDP Network.responseReceived event / 네트워크 응답을 CDP Network.responseReceived 이벤트로 변환
fn convert_network_response_to_cdp(
    cmd: &Command,
    _logger: Arc<Logger>,
) -> Option<serde_json::Value> {
    let payload = &cmd.payload;

    // Extract response information / 응답 정보 추출
    // For api.response, URL is in payload.request.url / api.response의 경우 URL은 payload.request.url에 있음
    let url = payload
        .get("request")
        .and_then(|r| r.get("url"))
        .and_then(|v| v.as_str())
        .map(String::from)
        .or_else(|| {
            payload
                .get("url")
                .and_then(|v| v.as_str())
                .map(String::from)
        })
        .unwrap_or_else(|| "".to_string());

    // For api.response, status is in payload.response.status / api.response의 경우 status는 payload.response.status에 있음
    let status = payload
        .get("response")
        .and_then(|r| r.get("status"))
        .and_then(|v| v.as_u64())
        .or_else(|| payload.get("status").and_then(|v| v.as_u64()))
        .unwrap_or(200);

    let status_text = payload
        .get("response")
        .and_then(|r| r.get("statusText"))
        .and_then(|v| v.as_str())
        .map(String::from)
        .or_else(|| {
            payload
                .get("statusText")
                .and_then(|v| v.as_str())
                .map(String::from)
        })
        .unwrap_or_else(|| "OK".to_string());

    // For api.response, headers are in payload.response.headers / api.response의 경우 headers는 payload.response.headers에 있음
    let headers = payload
        .get("response")
        .and_then(|r| r.get("headers"))
        .cloned()
        .or_else(|| payload.get("headers").cloned())
        .unwrap_or_else(|| serde_json::json!({}));

    // Generate request ID / 요청 ID 생성
    // For api.response, ID might be in payload.request.id or payload.id / api.response의 경우 ID는 payload.request.id 또는 payload.id에 있을 수 있음
    let request_id = payload
        .get("request")
        .and_then(|r| r.get("id"))
        .and_then(|v| v.as_str())
        .map(String::from)
        .or_else(|| payload.get("id").and_then(|v| v.as_str()).map(String::from))
        .or_else(|| {
            payload
                .get("requestId")
                .and_then(|v| v.as_str())
                .map(String::from)
        })
        .unwrap_or_else(|| {
            format!(
                "reactotron-{}",
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_nanos()
            )
        });

    // Get timestamp in milliseconds / 타임스탬프를 밀리초 단위로 가져오기
    let timestamp_ms = cmd
        .date
        .as_ref()
        .and_then(|d| {
            d.parse::<f64>().ok().map(|t| {
                // If timestamp is very large (> year 2100 in seconds), assume it's in milliseconds / 타임스탬프가 매우 크면 (2100년 이후 초 단위), 밀리초 단위로 가정
                if t > 4_102_444_800.0 {
                    t as u64 // Already in milliseconds / 이미 밀리초 단위
                } else {
                    (t * 1000.0) as u64 // Convert seconds to milliseconds / 초를 밀리초로 변환
                }
            })
        })
        .unwrap_or_else(|| {
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64
        });

    // Create CDP message / CDP 메시지 생성
    // CDP Network events use seconds for timestamp / CDP Network 이벤트는 timestamp에 초 단위 사용
    let timestamp_seconds = timestamp_ms as f64 / 1000.0;
    let cdp_message = serde_json::json!({
        "method": "Network.responseReceived",
        "params": {
            "requestId": request_id,
            "loaderId": request_id.clone(),
            "timestamp": timestamp_seconds,
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
                    "requestTime": timestamp_seconds,
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

    Some(cdp_message)
}

/// Convert network error to CDP Network.loadingFailed event / 네트워크 에러를 CDP Network.loadingFailed 이벤트로 변환
fn convert_network_error_to_cdp(cmd: &Command, _logger: Arc<Logger>) -> Option<serde_json::Value> {
    let payload = &cmd.payload;

    // Extract error information / 에러 정보 추출
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

    // Get timestamp in milliseconds / 타임스탬프를 밀리초 단위로 가져오기
    let timestamp_ms = cmd
        .date
        .as_ref()
        .and_then(|d| {
            d.parse::<f64>().ok().map(|t| {
                // If timestamp is very large (> year 2100 in seconds), assume it's in milliseconds / 타임스탬프가 매우 크면 (2100년 이후 초 단위), 밀리초 단위로 가정
                if t > 4_102_444_800.0 {
                    t as u64 // Already in milliseconds / 이미 밀리초 단위
                } else {
                    (t * 1000.0) as u64 // Convert seconds to milliseconds / 초를 밀리초로 변환
                }
            })
        })
        .unwrap_or_else(|| {
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64
        });

    // Create CDP message / CDP 메시지 생성
    // CDP Network events use seconds for timestamp / CDP Network 이벤트는 timestamp에 초 단위 사용
    let timestamp_seconds = timestamp_ms as f64 / 1000.0;
    let cdp_message = serde_json::json!({
        "method": "Network.loadingFailed",
        "params": {
            "requestId": request_id,
            "timestamp": timestamp_seconds,
            "type": "Other",
            "errorText": error_text,
            "canceled": false,
            "blockedReason": "other",
        }
    });

    Some(cdp_message)
}
