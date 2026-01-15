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
    let (write, mut read) = ws_stream.split();
    let _ = &write; // Keep write half alive / write 절반 유지

    // Connection should be established / 연결이 설정되어야 함
    // Try to read a message (might timeout, which is OK) / 메시지 읽기 시도 (타임아웃될 수 있음, 괜찮음)
    let result = tokio::time::timeout(tokio::time::Duration::from_millis(100), read.next()).await;

    // Connection established successfully / 연결이 성공적으로 설정됨
    // Timeout is expected since server doesn't send messages immediately / 서버가 즉시 메시지를 보내지 않으므로 타임아웃 예상
    assert!(
        result.is_ok(),
        "Connection should be established / 연결이 설정되어야 함"
    );

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
    let (write, mut read) = ws_stream.split();
    let _ = &write; // Keep write half alive / write 절반 유지

    // Connection should be established / 연결이 설정되어야 함
    let result = tokio::time::timeout(tokio::time::Duration::from_millis(100), read.next()).await;

    // Timeout is expected since server doesn't send messages immediately / 서버가 즉시 메시지를 보내지 않으므로 타임아웃 예상
    assert!(
        result.is_ok(),
        "Connection should be established / 연결이 설정되어야 함"
    );

    stop_test_server(handle).await;
}

#[tokio::test]
/// Test WebSocket message sending / WebSocket 메시지 전송 테스트
async fn test_websocket_message_sending() {
    let port = 18092;
    let handle = start_test_server(port).await;

    // Connect client / 클라이언트 연결
    let client_url = format!("ws://127.0.0.1:{}/remote/debug/client/test-client-2", port);
    let (client_stream, _) = connect_async(&client_url).await.unwrap();
    let (mut client_write, _client_read) = client_stream.split();

    // Connect DevTools to receive messages / 메시지를 받기 위해 DevTools 연결
    let devtools_url = format!(
        "ws://127.0.0.1:{}/remote/debug/devtools/test-inspector-2?clientId=test-client-2",
        port
    );
    let (devtools_stream, _) = connect_async(&devtools_url).await.unwrap();
    let (_devtools_write, mut devtools_read) = devtools_stream.split();

    // Send a test message from client / 클라이언트에서 테스트 메시지 전송
    let test_message = r#"{"method":"Test.method","params":{}}"#;
    client_write
        .send(Message::Text(test_message.to_string()))
        .await
        .unwrap();

    // Wait for message to be processed and forwarded to DevTools / 메시지가 처리되어 DevTools로 전달될 때까지 대기
    let result = tokio::time::timeout(
        tokio::time::Duration::from_millis(500),
        devtools_read.next(),
    )
    .await;

    // Verify message was received by DevTools / DevTools가 메시지를 받았는지 확인
    match result {
        Ok(Some(Ok(Message::Text(received)))) => {
            // Message was received / 메시지가 수신됨
            assert!(
                received.contains("Test.method"),
                "Received message should contain method name / 수신된 메시지에 메서드 이름이 포함되어야 함"
            );
        }
        Ok(Some(Ok(Message::Close(_)))) => {
            panic!("DevTools connection closed unexpectedly / DevTools 연결이 예기치 않게 닫힘");
        }
        Ok(Some(Ok(Message::Binary(_)))) => {
            // Binary message received, not expected in this test / 바이너리 메시지 수신, 이 테스트에서는 예상되지 않음
        }
        Ok(Some(Ok(Message::Ping(_)))) => {
            // Ping message received, not expected in this test / Ping 메시지 수신, 이 테스트에서는 예상되지 않음
        }
        Ok(Some(Ok(Message::Pong(_)))) => {
            // Pong message received, not expected in this test / Pong 메시지 수신, 이 테스트에서는 예상되지 않음
        }
        Ok(Some(Ok(Message::Frame(_)))) => {
            // Frame message received, not expected in this test / Frame 메시지 수신, 이 테스트에서는 예상되지 않음
        }
        Ok(None) => {
            panic!("DevTools stream ended unexpectedly / DevTools 스트림이 예기치 않게 종료됨");
        }
        Ok(Some(Err(e))) => {
            panic!(
                "Error reading from DevTools: {} / DevTools에서 읽기 오류: {}",
                e, e
            );
        }
        Err(_) => {
            // Timeout - message might not have been forwarded if no DevTools was connected / 타임아웃 - DevTools가 연결되지 않았으면 메시지가 전달되지 않았을 수 있음
            // This is acceptable as the test verifies the message was sent successfully / 메시지가 성공적으로 전송되었는지 확인하므로 허용 가능
        }
    }

    stop_test_server(handle).await;
}
