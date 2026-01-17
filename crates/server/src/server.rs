// Server main logic / 서버 메인 로직
use crate::config::ServerConfig;
use crate::http_routes::create_router;
use crate::logging::Logger;
use crate::socket_server::SocketServer;
use axum_server::tls_rustls::RustlsConfig;
use std::io::{self, Write};
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::sync::RwLock;
use tower::ServiceBuilder;
use tower_http::cors::CorsLayer;

/// Run the server with a shared SocketServer instance / 공유 SocketServer 인스턴스와 함께 서버 실행
pub async fn run_server_with_socket_server(
    config: ServerConfig,
    socket_server_rwlock: Arc<tokio::sync::RwLock<SocketServer>>,
    shutdown_rx: tokio::sync::oneshot::Receiver<()>,
) -> Result<(), crate::ServerError> {
    // Use logger from socket_server / socket_server의 logger 사용
    // We need to read the lock to get the logger / logger를 얻기 위해 lock을 읽어야 함
    let logger = {
        let server = socket_server_rwlock.read().await;
        server.logger.clone()
    };

    // Create HTTP router / HTTP 라우터 생성
    // Pass the RwLock to the router state / 라우터 state에 RwLock 전달
    let app = create_router(config.dev_mode)
        .layer(
            ServiceBuilder::new()
                .layer(CorsLayer::permissive())
                .into_inner(),
        )
        .with_state(socket_server_rwlock.clone());

    // Parse address / 주소 파싱
    let addr: SocketAddr = format!("{}:{}", config.host, config.port)
        .parse()
        .map_err(|e| {
            crate::ServerError::Other(format!("Invalid address format / 잘못된 주소 형식: {}", e))
        })?;

    // Start server / 서버 시작
    let protocol = if config.use_ssl { "https" } else { "http" };
    let ws_protocol = if config.use_ssl { "wss" } else { "ws" };
    logger.log(
        crate::logging::LogType::Server,
        "server",
        &format!("Server started at {}://{}", protocol, addr),
        None,
        None,
    );
    logger.log(
        crate::logging::LogType::Server,
        "server",
        &format!("WebSocket available at {}://{}", ws_protocol, addr),
        None,
        None,
    );

    // Log Reactotron server status / Reactotron 서버 상태 로깅
    if config.enable_reactotron_server {
        eprintln!(
            "[reactotron] ✅ Reactotron WebSocket server is ENABLED on root path (ws://{}:{})",
            config.host, config.port
        );
        let _ = io::stderr().flush();
        logger.log(
            crate::logging::LogType::Server,
            "reactotron",
            &format!(
                "Reactotron WebSocket server enabled on root path (ws://{}:{})",
                config.host, config.port
            ),
            None,
            None,
        );
    } else {
        eprintln!("[reactotron] ⚠️ Reactotron WebSocket server is DISABLED. Enable it via toggle button in Tauri app.");
        let _ = io::stderr().flush();
        logger.log(
            crate::logging::LogType::Server,
            "reactotron",
            "Reactotron WebSocket server disabled",
            None,
            None,
        );
    }

    // Run server with or without TLS / TLS 사용 여부에 따라 서버 실행
    if config.use_ssl {
        // Validate SSL configuration / SSL 설정 검증
        let cert_path = config.ssl_cert_path.ok_or_else(|| {
            crate::ServerError::Certificate(
                "SSL certificate path is required when use_ssl is true / use_ssl이 true일 때 SSL 인증서 경로가 필요합니다"
                    .to_string(),
            )
        })?;
        let key_path = config.ssl_key_path.ok_or_else(|| {
            crate::ServerError::Certificate(
                "SSL key path is required when use_ssl is true / use_ssl이 true일 때 SSL 키 경로가 필요합니다"
                    .to_string(),
            )
        })?;

        // Load TLS configuration using rustls / rustls를 사용하여 TLS 설정 로드
        let rustls_config = RustlsConfig::from_pem_file(&cert_path, &key_path)
            .await
            .map_err(|e| {
                crate::ServerError::Certificate(format!(
                    "Failed to load TLS configuration / TLS 설정 로드 실패: {}",
                    e
                ))
            })?;

        // Run server with TLS using axum-server / axum-server를 사용하여 TLS로 서버 실행
        // Note: axum-server doesn't support with_graceful_shutdown directly / axum-server는 with_graceful_shutdown을 직접 지원하지 않음
        // Use tokio::select to handle shutdown signal / shutdown signal을 처리하기 위해 tokio::select 사용
        let server_future =
            axum_server::bind_rustls(addr, rustls_config).serve(app.into_make_service());

        tokio::select! {
            result = server_future => {
                result.map_err(crate::ServerError::Io)?;
            }
            _ = shutdown_rx => {
                // Shutdown signal received, server will stop / 종료 신호 수신, 서버가 중지됨
            }
        }
    } else {
        // Run server without TLS / TLS 없이 서버 실행
        // Bind to port directly without retries / 재시도 없이 포트에 직접 바인딩
        let listener = TcpListener::bind(&addr).await.map_err(|e| {
            eprintln!("[server] ❌ Failed to bind to {}: {}", addr, e);
            let _ = io::stderr().flush();
            crate::ServerError::Io(e)
        })?;

        eprintln!("[server] ✅ Successfully bound to {}", addr);
        let _ = io::stderr().flush();

        axum::serve(listener, app)
            .with_graceful_shutdown(async {
                shutdown_rx.await.ok();
            })
            .await
            .map_err(crate::ServerError::Io)?;
    }

    Ok(())
}

/// Run the server / 서버 실행 (기존 함수, 하위 호환성 유지)
/// Note: This function creates a dummy shutdown receiver that never triggers / 이 함수는 절대 트리거되지 않는 더미 종료 수신자를 생성합니다
pub async fn run_server(config: ServerConfig) -> Result<(), crate::ServerError> {
    // Initialize logger / 로거 초기화
    let logger = Arc::new(
        Logger::new(
            config.log_enabled,
            config.log_methods.clone(),
            config.log_file.clone(),
        )
        .map_err(crate::ServerError::Io)?,
    );

    // Create socket server / 소켓 서버 생성
    let socket_server = Arc::new(RwLock::new(SocketServer::new(
        logger.clone(),
        config.enable_reactotron_server,
    )));

    // Create a dummy shutdown receiver that never triggers / 절대 트리거되지 않는 더미 종료 수신자 생성
    let (_shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel::<()>();
    run_server_with_socket_server(config, socket_server, shutdown_rx).await
}
