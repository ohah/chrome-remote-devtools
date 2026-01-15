// Reactotron protocol types / Reactotron 프로토콜 타입
use serde::{Deserialize, Serialize};

/// Reactotron command / Reactotron 명령
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Command {
    pub r#type: String,
    pub payload: serde_json::Value,
    #[serde(default)]
    pub important: Option<serde_json::Value>,
    #[serde(default, rename = "connectionId")]
    pub connection_id: Option<u32>,
    #[serde(default, rename = "messageId")]
    pub message_id: Option<u32>,
    #[serde(default)]
    pub date: Option<String>,
    #[serde(default, rename = "deltaTime")]
    pub delta_time: Option<serde_json::Value>,
    #[serde(default, rename = "clientId")]
    pub client_id: Option<String>,
}

/// Command with client ID / 클라이언트 ID가 포함된 명령
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandWithClientId {
    pub r#type: String,
    pub payload: serde_json::Value,
    pub client_id: String,
    pub important: bool,
    #[serde(default)]
    pub date: Option<String>,
    #[serde(default)]
    pub delta_time: Option<i64>,
}
