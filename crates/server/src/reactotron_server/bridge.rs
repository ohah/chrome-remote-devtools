// Bridge between Reactotron and Remote DevTools / Reactotron과 Remote DevTools 간 브릿지
use crate::socket_server::SocketServer;
use crate::logging::{LogType, Logger};
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::mpsc;

/// Register Reactotron client as Remote DevTools client / Reactotron 클라이언트를 Remote DevTools 클라이언트로 등록
/// This allows Reactotron clients to appear in the Remote DevTools UI / 이를 통해 Reactotron 클라이언트가 Remote DevTools UI에 표시됩니다
pub async fn register_reactotron_client(
    client_id: String,
    payload: &Value,
    socket_server: Arc<SocketServer>,
    logger: Arc<Logger>,
) -> Option<mpsc::UnboundedSender<String>> {
    // Extract client information from Reactotron payload / Reactotron payload에서 클라이언트 정보 추출
    let name = payload
        .get("name")
        .and_then(|v| v.as_str())
        .map(String::from)
        .unwrap_or_else(|| format!("Reactotron Client {}", client_id));

    let app_name = payload
        .get("app")
        .and_then(|v| v.as_str())
        .map(String::from)
        .or_else(|| {
            payload
                .get("appName")
                .and_then(|v| v.as_str())
                .map(String::from)
        });

    let platform = payload
        .get("platform")
        .and_then(|v| v.as_str())
        .map(String::from);

    // Create a virtual URL for Reactotron client / Reactotron 클라이언트를 위한 가상 URL 생성
    let url = format!("reactotron://{}", client_id);
    let title = app_name
        .clone()
        .unwrap_or_else(|| "Reactotron Client".to_string());
    let ua = platform
        .as_ref()
        .map(|p| format!("Reactotron/{}", p))
        .unwrap_or_else(|| "Reactotron".to_string());

    // Use SocketServer's register_reactotron_client method / SocketServer의 register_reactotron_client 메서드 사용
    let tx = socket_server
        .register_reactotron_client(
            client_id.clone(),
            url,
            title.clone(),
            ua,
            logger.clone(),
        )
        .await;

    logger.log(
        LogType::Reactotron,
        &client_id,
        &format!("✅ Registered Reactotron client as Remote DevTools client: {} ({})", name, title),
        Some(&serde_json::json!({
            "clientId": client_id,
            "name": name,
            "appName": app_name,
            "platform": platform,
        })),
        None,
    );

    tx
}

/// Unregister Reactotron client from Remote DevTools / Reactotron 클라이언트를 Remote DevTools에서 등록 해제
pub async fn unregister_reactotron_client(
    client_id: &str,
    socket_server: Arc<SocketServer>,
    logger: Arc<Logger>,
) {
    socket_server.unregister_reactotron_client(client_id, logger).await;
}
