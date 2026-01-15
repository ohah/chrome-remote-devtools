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

    // Split WebSocket stream / WebSocket 스트림 분리
    // Hold write half to keep the WebSocket stream alive / WebSocket 스트림을 유지하기 위해 write 절반 보유
    // Even though we don't write to it, dropping it would close the connection / 쓰지 않더라도 드롭하면 연결이 닫힘
    let (mut write, mut read) = ws_stream.split();
    let _ = &write; // Keep write half alive / write 절반 유지

    // Connection should be established / 연결이 설정되어야 함
    // Try to read a message (might timeout, which is OK) / 메시지 읽기 시도 (타임아웃될 수 있음, 괜찮음)
    let result = tokio::time::timeout(tokio::time::Duration::from_millis(100), read.next()).await;

    // Connection established successfully / 연결이 성공적으로 설정됨
    // Timeout is expected since server doesn't send messages immediately / 서버가 즉시 메시지를 보내지 않으므로 타임아웃 예상
    assert!(result.is_ok(), "Connection should be established / 연결이 설정되어야 함");

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

    // Split WebSocket stream / WebSocket 스트림 분리
    // Hold write half to keep the WebSocket stream alive / WebSocket 스트림을 유지하기 위해 write 절반 보유
    // Even though we don't write to it, dropping it would close the connection / 쓰지 않더라도 드롭하면 연결이 닫힘
    let (mut write, mut read) = ws_stream.split();
    let _ = &write; // Keep write half alive / write 절반 유지

    // Connection should be established / 연결이 설정되어야 함
    let result = tokio::time::timeout(tokio::time::Duration::from_millis(100), read.next()).await;

    // Timeout is expected since server doesn't send messages immediately / 서버가 즉시 메시지를 보내지 않으므로 타임아웃 예상
    assert!(result.is_ok(), "Connection should be established / 연결이 설정되어야 함");

    stop_test_server(handle).await;
}

#[tokio::test]
/// Test WebSocket message sending / WebSocket 메시지 전송 테스트
async fn test_websocket_message_sending() {
    let port = 18092;
    let handle = start_test_server(port).await;

    let url = format!("ws://127.0.0.1:{}/remote/debug/client/test-client-2", port);
    let (ws_stream, _) = connect_async(&url).await.unwrap();

    // Split WebSocket stream / WebSocket 스트림 분리
    // Hold read half to keep the WebSocket stream alive / WebSocket 스트림을 유지하기 위해 read 절반 보유
    // Even though we don't read from it immediately, dropping it would close the connection / 즉시 읽지 않더라도 드롭하면 연결이 닫힘
    let (mut write, read) = ws_stream.split();
    let _ = &read; // Keep read half alive / read 절반 유지

    // Send a test message / 테스트 메시지 전송
    let test_message = r#"{"method":"Test.method","params":{}}"#;
    write
        .send(Message::Text(test_message.to_string()))
        .await
        .unwrap();

    // Message sent successfully / 메시지가 성공적으로 전송됨
    // Note: We don't verify the message was received since the server might not echo it back / 서버가 메시지를 다시 보내지 않을 수 있으므로 수신 확인은 하지 않음
    // The test verifies that sending doesn't panic, which indicates the connection is working / 전송이 패닉하지 않는다는 것은 연결이 작동한다는 것을 의미

    stop_test_server(handle).await;
}
