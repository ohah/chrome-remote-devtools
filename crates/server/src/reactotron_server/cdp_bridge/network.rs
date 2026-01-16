// Convert network messages to CDP format / 네트워크 메시지를 CDP 형식으로 변환
use crate::logging::Logger;
use crate::reactotron_server::cdp_bridge::normalize::{
    normalize_reactotron_json_value, normalize_reactotron_string,
};
use crate::reactotron_server::types::Command;
use std::sync::Arc;

/// Convert network request to CDP Network.requestWillBeSent event / 네트워크 요청을 CDP Network.requestWillBeSent 이벤트로 변환
pub fn convert_network_request_to_cdp(
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
        .unwrap_or_default();

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

/// Convert network response to CDP Network events / 네트워크 응답을 CDP Network 이벤트로 변환
/// Returns a vector of CDP messages: [requestWillBeSent, responseReceived, loadingFinished] / CDP 메시지 벡터 반환: [requestWillBeSent, responseReceived, loadingFinished]
/// Reactotron's api.response contains both request and response information / Reactotron의 api.response는 요청과 응답 정보를 모두 포함함
pub fn convert_network_response_to_cdp(
    cmd: &Command,
    _logger: Arc<Logger>,
) -> Option<Vec<serde_json::Value>> {
    let payload = &cmd.payload;

    // Extract request and response information from payload / payload에서 요청과 응답 정보 추출
    // Reactotron's api.response has both request and response in the payload / Reactotron의 api.response는 payload에 request와 response가 모두 있음
    let request = payload.get("request")?;
    let response = payload.get("response")?;

    // Extract request information / 요청 정보 추출
    let url = request
        .get("url")
        .and_then(|v| v.as_str())
        .map(String::from)
        .unwrap_or_default();

    let method = request
        .get("method")
        .and_then(|v| v.as_str())
        .map(String::from)
        .unwrap_or_else(|| "GET".to_string());

    let request_headers = request
        .get("headers")
        .cloned()
        .unwrap_or_else(|| serde_json::json!({}));

    let post_data = request.get("data");

    // Generate request ID / 요청 ID 생성
    let request_id = format!(
        "reactotron-{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    );

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

    let timestamp_seconds = timestamp_ms as f64 / 1000.0;

    // 1. Network.requestWillBeSent event / Network.requestWillBeSent 이벤트
    let mut request_params = serde_json::json!({
        "requestId": request_id,
        "loaderId": request_id.clone(),
        "documentURL": url.clone(),
        "request": {
            "url": url.clone(),
            "method": method,
            "headers": request_headers,
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
    // Normalize Reactotron custom formats in post data / post data에서 Reactotron 커스텀 포맷 정규화
    if let Some(data) = post_data {
        if let Some(request_obj) = request_params
            .get_mut("request")
            .and_then(|r| r.as_object_mut())
        {
            if let Some(data_str) = data.as_str() {
                // Normalize Reactotron custom formats in the string / 문자열에서 Reactotron 커스텀 포맷 정규화
                let normalized_str = normalize_reactotron_string(data_str);
                request_obj.insert("postData".to_string(), serde_json::json!(normalized_str));
            } else {
                // Normalize Reactotron custom formats in JSON value / JSON 값에서 Reactotron 커스텀 포맷 정규화
                let normalized_data = normalize_reactotron_json_value(data.clone());
                request_obj.insert(
                    "postData".to_string(),
                    serde_json::json!(serde_json::to_string(&normalized_data)
                        .unwrap_or_else(|_| "{}".to_string())),
                );
            }
        }
    }

    let request_will_be_sent = serde_json::json!({
        "method": "Network.requestWillBeSent",
        "params": request_params
    });

    // 2. Network.responseReceived event / Network.responseReceived 이벤트
    let status = response
        .get("status")
        .and_then(|v| v.as_u64())
        .unwrap_or(200);

    let status_text = response
        .get("statusText")
        .and_then(|v| v.as_str())
        .map(String::from)
        .unwrap_or_else(|| "OK".to_string());

    let response_headers = response
        .get("headers")
        .cloned()
        .unwrap_or_else(|| serde_json::json!({}));

    // Calculate encodedDataLength from response body if available / 응답 본문이 있으면 encodedDataLength 계산
    let encoded_data_length = response
        .get("body")
        .and_then(|body| {
            if let Some(body_str) = body.as_str() {
                Some(body_str.len())
            } else {
                serde_json::to_string(body).ok().map(|s| s.len())
            }
        })
        .unwrap_or(0);

    // Extract mimeType from response headers or use default / 응답 헤더에서 mimeType 추출 또는 기본값 사용
    let mime_type = response_headers
        .get("Content-Type")
        .and_then(|v| v.as_str())
        .or_else(|| {
            response_headers
                .get("content-type")
                .and_then(|v| v.as_str())
        })
        .unwrap_or("application/json");

    // Extract response body / 응답 본문 추출
    let response_body = response.get("body").cloned();
    let has_response_body = response_body.is_some();

    // Build response object / 응답 객체 생성
    let mut response_obj = serde_json::json!({
        "url": url,
        "status": status,
        "statusText": status_text,
        "headers": response_headers,
        "mimeType": mime_type,
        "connectionReused": false,
        "connectionId": 0,
        "fromDiskCache": false,
        "fromServiceWorker": false,
        "fromPrefetchCache": false,
        "encodedDataLength": encoded_data_length,
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
    });

    // Add response body if available / 응답 본문이 있으면 추가
    // Normalize Reactotron custom formats in response body / 응답 본문에서 Reactotron 커스텀 포맷 정규화
    if let Some(body) = response_body {
        if let Some(body_str) = body.as_str() {
            // Normalize Reactotron custom formats in the string / 문자열에서 Reactotron 커스텀 포맷 정규화
            let normalized_str = normalize_reactotron_string(body_str);
            response_obj["body"] = serde_json::json!(normalized_str);
        } else {
            // Normalize Reactotron custom formats in JSON value / JSON 값에서 Reactotron 커스텀 포맷 정규화
            let normalized_body = normalize_reactotron_json_value(body);
            response_obj["body"] = serde_json::json!(
                serde_json::to_string(&normalized_body).unwrap_or_else(|_| "{}".to_string())
            );
        }
    }

    let response_received = serde_json::json!({
        "method": "Network.responseReceived",
        "params": {
            "requestId": request_id,
            "loaderId": request_id.clone(),
            "timestamp": timestamp_seconds,
            "type": "Other",
            "response": response_obj,
        }
    });

    // 3. Network.loadingFinished event / Network.loadingFinished 이벤트
    // Timestamp should be slightly after responseReceived to indicate completion / timestamp는 responseReceived 이후로 설정하여 완료를 나타냄
    let loading_finished_timestamp = timestamp_seconds + 0.001; // Add 1ms delay to indicate completion / 완료를 나타내기 위해 1ms 지연 추가

    // Ensure encodedDataLength is at least 1 if body exists to avoid "0 byte 리소스" / 본문이 있으면 encodedDataLength를 최소 1로 설정하여 "0 byte 리소스" 방지
    let final_encoded_data_length = if encoded_data_length > 0 {
        encoded_data_length
    } else if has_response_body {
        // If body exists but length is 0, set to 1 to indicate body was received / 본문이 있지만 길이가 0이면 1로 설정하여 본문이 수신되었음을 나타냄
        1
    } else {
        0
    };

    let loading_finished = serde_json::json!({
        "method": "Network.loadingFinished",
        "params": {
            "requestId": request_id,
            "timestamp": loading_finished_timestamp,
            "encodedDataLength": final_encoded_data_length,
        }
    });

    Some(vec![
        request_will_be_sent,
        response_received,
        loading_finished,
    ])
}

/// Convert network error to CDP Network.loadingFailed event / 네트워크 에러를 CDP Network.loadingFailed 이벤트로 변환
pub fn convert_network_error_to_cdp(
    cmd: &Command,
    _logger: Arc<Logger>,
) -> Option<serde_json::Value> {
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
