// Bridge Reactotron messages to CDP format / Reactotron 메시지를 CDP 형식으로 변환하는 브릿지
mod console;
mod network;
mod normalize;

use crate::logging::Logger;
use crate::reactotron_server::types::Command;
use std::sync::Arc;

pub use network::convert_network_response_to_cdp;

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
        return console::convert_console_to_cdp(cmd, console_type, logger);
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
        return console::convert_console_to_cdp(cmd, console_type, logger);
    }

    // Check if it's a network event / 네트워크 이벤트인지 확인
    // Note: api.response is handled separately in handler.rs because it returns multiple CDP events / 주의: api.response는 여러 CDP 이벤트를 반환하므로 handler.rs에서 별도로 처리됨
    if cmd_type.starts_with("network.") || cmd_type == "api.request" || cmd_type == "api.error" {
        match cmd_type {
            "network.request" | "api.request" => {
                return network::convert_network_request_to_cdp(cmd, logger);
            }
            "network.error" | "api.error" => {
                return network::convert_network_error_to_cdp(cmd, logger);
            }
            _ => {}
        }
    }

    // Check if it's a network event with type "network" or "api" / 타입이 "network" 또는 "api"인 경우
    // Note: api.response is handled separately in handler.rs / 주의: api.response는 handler.rs에서 별도로 처리됨
    if cmd_type == "network" || cmd_type == "api" {
        if let Some(kind) = cmd.payload.get("kind").and_then(|v| v.as_str()) {
            match kind {
                "request" => return network::convert_network_request_to_cdp(cmd, logger),
                "error" => return network::convert_network_error_to_cdp(cmd, logger),
                // "response" is handled separately in handler.rs / "response"는 handler.rs에서 별도로 처리됨
                _ => {}
            }
        }
    }

    // Command type not supported / 지원되지 않는 명령 타입
    None
}
