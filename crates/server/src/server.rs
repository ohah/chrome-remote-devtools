// Server main logic / 서버 메인 로직
use crate::config::ServerConfig;
use crate::http_routes::create_router;
use crate::logging::Logger;
use crate::socket_server::SocketServer;
use axum_server::tls_rustls::RustlsConfig;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::net::TcpListener;
use tower::ServiceBuilder;
use tower_http::cors::CorsLayer;

/// Run the server / 서버 실행
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
    let socket_server = Arc::new(SocketServer::new(logger.clone()));

    // Create HTTP router / HTTP 라우터 생성
    let app = create_router(config.dev_mode)
        .layer(
            ServiceBuilder::new()
                .layer(CorsLayer::permissive())
                .into_inner(),
        )
        .with_state(socket_server.clone());

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
        axum_server::bind_rustls(addr, rustls_config)
            .serve(app.into_make_service())
            .await
            .map_err(|e| crate::ServerError::Io(e))?;
    } else {
        // Run server without TLS / TLS 없이 서버 실행
        let listener = TcpListener::bind(&addr)
            .await
            .map_err(|e| crate::ServerError::Io(e))?;
        axum::serve(listener, app)
            .await
            .map_err(|e| crate::ServerError::Io(e))?;
    }

    Ok(())
}
