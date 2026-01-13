// Type definitions for socket server / 소켓 서버 타입 정의
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;

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

/// Client connection / 클라이언트 연결
pub struct Client {
    pub id: String,
    pub url: Option<String>,
    pub title: Option<String>,
    pub favicon: Option<String>,
    pub ua: Option<String>,
    pub time: Option<String>,
    pub sender: mpsc::UnboundedSender<String>,
}

/// DevTools connection / DevTools 연결
pub struct DevTools {
    pub id: String,
    pub client_id: Option<String>,
    pub sender: mpsc::UnboundedSender<String>,
}

/// Client information / 클라이언트 정보
#[derive(Debug, Clone, Serialize)]
pub struct ClientInfo {
    pub id: String,
    pub url: Option<String>,
    pub title: Option<String>,
    pub favicon: Option<String>,
    pub ua: Option<String>,
    pub time: Option<String>,
}

/// Inspector information / Inspector 정보
#[derive(Debug, Clone, Serialize)]
pub struct InspectorInfo {
    pub id: String,
    pub client_id: Option<String>,
}
