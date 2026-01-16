// Convert console messages to CDP format / 콘솔 메시지를 CDP 형식으로 변환
use crate::logging::{LogType, Logger};
use crate::reactotron_server::types::Command;
use std::sync::Arc;

/// Convert console message to CDP Runtime.consoleAPICalled event / 콘솔 메시지를 CDP Runtime.consoleAPICalled 이벤트로 변환
pub fn convert_console_to_cdp(
    cmd: &Command,
    console_type: &str,
    logger: Arc<Logger>,
) -> Option<serde_json::Value> {
    // Helper function to convert Reactotron custom format to actual values / Reactotron 커스텀 포맷을 실제 값으로 변환하는 헬퍼 함수
    // Reactotron uses special formats like "~~~ null ~~~", "~~~ zero ~~~", "~~~ undefined ~~~" / Reactotron은 "~~~ null ~~~", "~~~ zero ~~~", "~~~ undefined ~~~" 같은 특수 포맷 사용
    let normalize_reactotron_value = |s: &str| -> serde_json::Value {
        match s {
            "~~~ null ~~~" => serde_json::Value::Null,
            "~~~ zero ~~~" => serde_json::json!(0),
            "~~~ undefined ~~~" => serde_json::json!({"type": "undefined"}),
            _ => serde_json::Value::String(s.to_string()),
        }
    };

    // Helper function to convert value to CDP RemoteObject / 값을 CDP RemoteObject로 변환하는 헬퍼 함수
    let convert_to_remote_object = |arg: &serde_json::Value| -> serde_json::Value {
        match arg {
            serde_json::Value::String(s) => {
                // Check for Reactotron custom formats / Reactotron 커스텀 포맷 확인
                let normalized = normalize_reactotron_value(s);
                match normalized {
                    serde_json::Value::Null => {
                        serde_json::json!({
                            "type": "object",
                            "subtype": "null",
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
                                "value": s,
                            })
                        }
                    }
                    serde_json::Value::Object(obj)
                        if obj.get("type") == Some(&serde_json::json!("undefined")) =>
                    {
                        serde_json::json!({
                            "type": "undefined",
                        })
                    }
                    _ => {
                        serde_json::json!({
                            "type": "string",
                            "value": s,
                        })
                    }
                }
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
