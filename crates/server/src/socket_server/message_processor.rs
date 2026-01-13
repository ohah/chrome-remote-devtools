// Message processing utilities / 메시지 처리 유틸리티
use super::message::{CDPMessage, CompressedParams};
use crate::logging::{LogType, Logger};
use flate2::read::GzDecoder;
use std::io::Read;

/// Process client message (decompress if needed) / 클라이언트 메시지 처리 (필요시 압축 해제)
pub fn process_client_message(message: &str, client_id: &str, logger: &Logger) -> String {
    // Try to parse message / 메시지 파싱 시도
    if let Ok(mut parsed) = serde_json::from_str::<CDPMessage>(message) {
        // Check for compressed params / 압축된 파라미터 확인
        if let Some(params) = &parsed.params {
            if let Ok(compressed) = serde_json::from_value::<CompressedParams>(params.clone()) {
                if compressed.compressed && !compressed.data.is_empty() {
                    // Decompress / 압축 해제
                    let mut decoder = GzDecoder::new(&compressed.data[..]);
                    let mut decompressed = String::new();
                    if decoder.read_to_string(&mut decompressed).is_ok() {
                        if let Ok(decompressed_data) =
                            serde_json::from_str::<serde_json::Value>(&decompressed)
                        {
                            if let Some(method) =
                                decompressed_data.get("method").and_then(|v| v.as_str())
                            {
                                parsed.method = Some(method.to_string());
                            }
                            if let Some(new_params) = decompressed_data.get("params") {
                                parsed.params = Some(new_params.clone());
                            }
                        }
                    } else {
                        logger.log_error(LogType::Client, client_id, "decompression failed", None);
                    }
                }
            }
        }

        // Log message / 메시지 로깅
        logger.log(
            LogType::Client,
            client_id,
            "received",
            Some(&serde_json::json!(parsed)),
            parsed.method.as_deref(),
        );

        // Return as JSON string / JSON 문자열로 반환
        serde_json::to_string(&parsed).unwrap_or_else(|_| message.to_string())
    } else {
        // If parsing fails, log raw message / 파싱 실패 시 원본 메시지 로깅
        logger.log(
            LogType::Client,
            client_id,
            "received (raw)",
            Some(&serde_json::json!({ "data": message })),
            None,
        );
        message.to_string()
    }
}
