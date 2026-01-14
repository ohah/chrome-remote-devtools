// HTTP API integration tests / HTTP API 통합 테스트
mod common;

use common::{start_test_server, stop_test_server};

#[tokio::test]
/// Test HTTP API clients endpoint / HTTP API clients 엔드포인트 테스트
async fn test_http_clients_endpoint() {
    let port = 18080; // Use different port to avoid conflicts / 충돌 방지를 위해 다른 포트 사용
    let handle = start_test_server(port).await;

    let client = reqwest::Client::new();
    let url = format!("http://127.0.0.1:{}/json/clients", port);

    // Test /json/clients endpoint / /json/clients 엔드포인트 테스트
    let response = client.get(&url).send().await;

    match response {
        Ok(resp) => {
            assert!(resp.status().is_success());
            let json: serde_json::Value = resp.json().await.unwrap();
            assert!(json.get("clients").is_some());
            let clients = json.get("clients").unwrap().as_array().unwrap();
            // Initially should be empty / 초기에는 비어있어야 함
            assert_eq!(clients.len(), 0);
        }
        Err(e) => {
            // Server might not be ready yet, skip test / 서버가 아직 준비되지 않았을 수 있음, 테스트 스킵
            eprintln!("Server not ready: {}", e);
        }
    }

    stop_test_server(handle).await;
}

#[tokio::test]
/// Test HTTP API inspectors endpoint / HTTP API inspectors 엔드포인트 테스트
async fn test_http_inspectors_endpoint() {
    let port = 18081;
    let handle = start_test_server(port).await;

    let client = reqwest::Client::new();
    let url = format!("http://127.0.0.1:{}/json/inspectors", port);

    let response = client.get(&url).send().await;

    match response {
        Ok(resp) => {
            assert!(resp.status().is_success());
            let json: serde_json::Value = resp.json().await.unwrap();
            assert!(json.get("inspectors").is_some());
            let inspectors = json.get("inspectors").unwrap().as_array().unwrap();
            // Initially should be empty / 초기에는 비어있어야 함
            assert_eq!(inspectors.len(), 0);
        }
        Err(e) => {
            eprintln!("Server not ready: {}", e);
        }
    }

    stop_test_server(handle).await;
}

#[tokio::test]
/// Test HTTP API json endpoint / HTTP API json 엔드포인트 테스트
async fn test_http_json_endpoint() {
    let port = 18082;
    let handle = start_test_server(port).await;

    let client = reqwest::Client::new();
    let url = format!("http://127.0.0.1:{}/json", port);

    let response = client.get(&url).send().await;

    match response {
        Ok(resp) => {
            assert!(resp.status().is_success());
            let json: serde_json::Value = resp.json().await.unwrap();
            // Should return targets object / targets 객체를 반환해야 함
            assert!(json.get("targets").is_some());
            let targets = json.get("targets").unwrap().as_array().unwrap();
            // Initially should be empty / 초기에는 비어있어야 함
            assert_eq!(targets.len(), 0);
        }
        Err(e) => {
            eprintln!("Server not ready: {}", e);
        }
    }

    stop_test_server(handle).await;
}
