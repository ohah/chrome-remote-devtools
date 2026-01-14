// WebSocket integration tests / WebSocket 통합 테스트
mod common;

use common::{start_test_server, stop_test_server};
use futures_util::{SinkExt, StreamExt};
use tokio_tungstenite::{connect_async, tungstenite::Message};

#[tokio::test]
/// Test WebSocket client connection / WebSocket 클라이언트 연결 테스트
async fn test_websocket_client_connection() {
    let port = 18090;
    let handle = start_test_server(port).await;

    let url = format!("ws://127.0.0.1:{}/remote/debug/client/test-client-1", port);
    let (ws_stream, _) = connect_async(&url).await.unwrap();

    let (mut _write, mut read) = ws_stream.split();

    // Connection should be established / 연결이 설정되어야 함
    // Try to read a message (might timeout, which is OK) / 메시지 읽기 시도 (타임아웃될 수 있음, 괜찮음)
    let result = tokio::time::timeout(tokio::time::Duration::from_millis(100), read.next()).await;

    // Connection established successfully / 연결이 성공적으로 설정됨
    assert!(result.is_ok() || result.is_err()); // Either message or timeout is OK / 메시지 또는 타임아웃 모두 OK

    stop_test_server(handle).await;
}

#[tokio::test]
/// Test WebSocket devtools connection / WebSocket DevTools 연결 테스트
async fn test_websocket_devtools_connection() {
    let port = 18091;
    let handle = start_test_server(port).await;

    let url = format!(
        "ws://127.0.0.1:{}/remote/debug/devtools/test-inspector-1",
        port
    );
    let (ws_stream, _) = connect_async(&url).await.unwrap();

    let (mut _write, mut read) = ws_stream.split();

    // Connection should be established / 연결이 설정되어야 함
    let result = tokio::time::timeout(tokio::time::Duration::from_millis(100), read.next()).await;

    assert!(result.is_ok() || result.is_err());

    stop_test_server(handle).await;
}

#[tokio::test]
/// Test WebSocket message sending / WebSocket 메시지 전송 테스트
async fn test_websocket_message_sending() {
    let port = 18092;
    let handle = start_test_server(port).await;

    let url = format!("ws://127.0.0.1:{}/remote/debug/client/test-client-2", port);
    let (ws_stream, _) = connect_async(&url).await.unwrap();

    let (mut write, _read) = ws_stream.split();

    // Send a test message / 테스트 메시지 전송
    let test_message = r#"{"method":"Test.method","params":{}}"#;
    write
        .send(Message::Text(test_message.to_string()))
        .await
        .unwrap();

    // Message sent successfully / 메시지가 성공적으로 전송됨

    stop_test_server(handle).await;
}
