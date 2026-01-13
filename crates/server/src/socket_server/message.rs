// CDP message types / CDP 메시지 타입
use serde::{Deserialize, Serialize};

/// CDP message / CDP 메시지
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CDPMessage {
    pub method: Option<String>,
    pub params: Option<serde_json::Value>,
    pub id: Option<u64>,
    pub result: Option<serde_json::Value>,
    pub error: Option<serde_json::Value>,
}

/// Compressed params / 압축된 파라미터
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompressedParams {
    pub compressed: bool,
    pub data: Vec<u8>,
}
