// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    // Test greet function / greet 함수 테스트
    #[test]
    fn test_greet() {
        let result = greet("World");
        assert!(result.contains("Hello"));
        assert!(result.contains("World"));
    }

    // Test greet with empty string / 빈 문자열로 greet 테스트
    #[test]
    fn test_greet_empty() {
        let result = greet("");
        assert!(result.contains("Hello"));
    }
}
