// Message processing utilities / 메시지 처리 유틸리티
use super::message::{CDPMessage, CompressedParams};
use crate::logging::{LogType, Logger};
use flate2::read::GzDecoder;
use std::io::Read;

/// Process client message (decompress if needed) / 클라이언트 메시지 처리 (필요시 압축 해제)
/// Returns original message if not compressed, decompressed message if compressed / 압축되지 않은 경우 원본 메시지 반환, 압축된 경우 압축 해제된 메시지 반환
pub fn process_client_message(message: &str, client_id: &str, logger: &Logger) -> String {
    // Try to parse message to check for compression / 압축 여부 확인을 위해 메시지 파싱 시도
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
                        // If decompression fails, return original message / 압축 해제 실패 시 원본 메시지 반환
                        return message.to_string();
                    }

                    // Log message / 메시지 로깅
                    logger.log(
                        LogType::Client,
                        client_id,
                        "received",
                        Some(&serde_json::json!(parsed)),
                        parsed.method.as_deref(),
                    );

                    // Return decompressed message / 압축 해제된 메시지 반환
                    return serde_json::to_string(&parsed).unwrap_or_else(|_| message.to_string());
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

        message.to_string()
    } else {
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::logging::Logger;

    fn create_test_logger() -> Logger {
        Logger::new(false, None, None).unwrap()
    }

    #[test]
    /// Test processing normal JSON message / 일반 JSON 메시지 처리 테스트
    fn test_process_normal_message() {
        let logger = create_test_logger();
        let message = r#"{"method":"Test.method","params":{}}"#;
        let result = process_client_message(message, "test-client", &logger);
        assert_eq!(result, message);
    }

    #[test]
    /// Test processing invalid JSON message / 잘못된 JSON 메시지 처리 테스트
    fn test_process_invalid_json() {
        let logger = create_test_logger();
        let message = "invalid json";
        let result = process_client_message(message, "test-client", &logger);
        assert_eq!(result, message);
    }

    #[test]
    /// Test processing message without method / method가 없는 메시지 처리 테스트
    fn test_process_message_without_method() {
        let logger = create_test_logger();
        let message = r#"{"params":{}}"#;
        let result = process_client_message(message, "test-client", &logger);
        assert_eq!(result, message);
    }

    #[test]
    /// Test processing message with empty params / 빈 params가 있는 메시지 처리 테스트
    fn test_process_message_with_empty_params() {
        let logger = create_test_logger();
        let message = r#"{"method":"Test.method","params":null}"#;
        let result = process_client_message(message, "test-client", &logger);
        assert_eq!(result, message);
    }
}
