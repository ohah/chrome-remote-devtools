// Normalize Reactotron custom format strings / Reactotron 커스텀 포맷 문자열 정규화
// Based on reactotron-core-server/src/repair-serialization.ts / reactotron-core-server/src/repair-serialization.ts 기반

/// Normalize Reactotron custom format strings in JSON values / JSON 값에서 Reactotron 커스텀 포맷 문자열 정규화
/// Recursively processes strings to convert "~~~ null ~~~", "~~~ zero ~~~", etc. / 문자열을 재귀적으로 처리하여 "~~~ null ~~~", "~~~ zero ~~~" 등을 변환
/// Based on reactotron-core-server/src/repair-serialization.ts / reactotron-core-server/src/repair-serialization.ts 기반
pub fn normalize_reactotron_json_value(value: serde_json::Value) -> serde_json::Value {
    match value {
        serde_json::Value::String(s) => {
            match s.as_str() {
                // Basic falsy values / 기본 falsy 값들
                "~~~ undefined ~~~" => serde_json::json!(null), // JSON doesn't have undefined, use null
                "~~~ null ~~~" => serde_json::Value::Null,
                "~~~ false ~~~" => serde_json::json!(false),
                "~~~ true ~~~" => serde_json::json!(true),
                "~~~ zero ~~~" => serde_json::json!(0),
                "~~~ empty string ~~~" => serde_json::json!(""),

                // Special number values / 특수 숫자 값들
                "~~~ NaN ~~~" => serde_json::json!(f64::NAN),
                "~~~ Infinity ~~~" => serde_json::json!(f64::INFINITY),
                "~~~ -Infinity ~~~" => serde_json::json!(f64::NEG_INFINITY),

                // Function values / 함수 값들
                "~~~ anonymous function ~~~" => serde_json::json!("fn()"),
                "~~~ skipped ~~~" => serde_json::json!("[skipped]"),
                "~~~ Circular Reference ~~~" => serde_json::json!("[Circular Reference]"),

                _ => {
                    // Handle function name pattern: "~~~ functionName() ~~~" / 함수 이름 패턴 처리: "~~~ functionName() ~~~"
                    if s.starts_with("~~~ ") && s.ends_with(" ~~~") && s.len() > 9 {
                        // Extract function name / 함수 이름 추출
                        let func_name = s.trim_start_matches("~~~ ").trim_end_matches(" ~~~");
                        if func_name.ends_with("()") {
                            serde_json::json!(format!("fn:{}", func_name.trim_end_matches("()")))
                        } else {
                            // Generic pattern match - remove ~~~ markers / 일반 패턴 매칭 - ~~~ 마커 제거
                            serde_json::Value::String(func_name.to_string())
                        }
                    } else {
                        // Try to parse as JSON string that might contain Reactotron formats / Reactotron 포맷을 포함할 수 있는 JSON 문자열로 파싱 시도
                        if s.starts_with('{') || s.starts_with('[') {
                            if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&s) {
                                normalize_reactotron_json_value(parsed)
                            } else {
                                serde_json::Value::String(s)
                            }
                        } else {
                            serde_json::Value::String(s)
                        }
                    }
                }
            }
        }
        serde_json::Value::Array(arr) => serde_json::Value::Array(
            arr.into_iter()
                .map(normalize_reactotron_json_value)
                .collect(),
        ),
        serde_json::Value::Object(obj) => serde_json::Value::Object(
            obj.into_iter()
                .map(|(k, v)| (k, normalize_reactotron_json_value(v)))
                .collect(),
        ),
        other => other,
    }
}

/// Normalize Reactotron custom format in string / 문자열에서 Reactotron 커스텀 포맷 정규화
/// Based on reactotron-core-server/src/repair-serialization.ts / reactotron-core-server/src/repair-serialization.ts 기반
pub fn normalize_reactotron_string(s: &str) -> String {
    // If the string is exactly a Reactotron format, replace it / 문자열이 정확히 Reactotron 포맷이면 교체
    match s {
        // Basic falsy values / 기본 falsy 값들
        "~~~ undefined ~~~" => "null".to_string(), // JSON doesn't have undefined / JSON에는 undefined가 없음
        "~~~ null ~~~" => "null".to_string(),
        "~~~ false ~~~" => "false".to_string(),
        "~~~ true ~~~" => "true".to_string(),
        "~~~ zero ~~~" => "0".to_string(),
        "~~~ empty string ~~~" => "\"\"".to_string(),

        // Special number values / 특수 숫자 값들
        "~~~ NaN ~~~" => "NaN".to_string(),
        "~~~ Infinity ~~~" => "Infinity".to_string(),
        "~~~ -Infinity ~~~" => "-Infinity".to_string(),

        // Function values / 함수 값들
        "~~~ anonymous function ~~~" => "\"fn()\"".to_string(),
        "~~~ skipped ~~~" => "\"[skipped]\"".to_string(),
        "~~~ Circular Reference ~~~" => "\"[Circular Reference]\"".to_string(),

        _ => {
            // Handle function name pattern: "~~~ functionName() ~~~" / 함수 이름 패턴 처리: "~~~ functionName() ~~~"
            if s.starts_with("~~~ ") && s.ends_with(" ~~~") && s.len() > 9 {
                let func_name = s.trim_start_matches("~~~ ").trim_end_matches(" ~~~");
                if func_name.ends_with("()") {
                    format!("\"fn:{}\"", func_name.trim_end_matches("()"))
                } else {
                    format!("\"{}\"", func_name)
                }
            } else {
                // Try to replace Reactotron formats within JSON strings / JSON 문자열 내의 Reactotron 포맷 교체 시도
                s.replace("~~~ undefined ~~~", "null")
                    .replace("~~~ null ~~~", "null")
                    .replace("~~~ false ~~~", "false")
                    .replace("~~~ true ~~~", "true")
                    .replace("~~~ zero ~~~", "0")
                    .replace("~~~ empty string ~~~", "\"\"")
                    .replace("~~~ NaN ~~~", "NaN")
                    .replace("~~~ Infinity ~~~", "Infinity")
                    .replace("~~~ -Infinity ~~~", "-Infinity")
                    .replace("~~~ anonymous function ~~~", "\"fn()\"")
                    .replace("~~~ skipped ~~~", "\"[skipped]\"")
                    .replace("~~~ Circular Reference ~~~", "\"[Circular Reference]\"")
            }
        }
    }
}
