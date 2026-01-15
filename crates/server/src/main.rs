// Chrome Remote DevTools Server - Standalone binary / Chrome Remote DevTools 서버 - 독립 실행형 바이너리
use chrome_remote_devtools_server::ServerConfig;
use clap::Parser;

#[derive(Parser)]
#[command(name = "chrome-remote-devtools-server")]
#[command(about = "Chrome Remote DevTools WebSocket relay server")]
struct Cli {
    /// Server port / 서버 포트
    #[arg(short, long, default_value = "8080")]
    port: u16,

    /// Server host / 서버 호스트
    #[arg(short = 'H', long, default_value = "0.0.0.0")]
    host: String,

    /// Enable HTTPS/WSS / HTTPS/WSS 활성화
    #[arg(long)]
    ssl: bool,

    /// Path to SSL certificate file / SSL 인증서 파일 경로
    #[arg(long)]
    cert: Option<String>,

    /// Path to SSL private key file / SSL 개인 키 파일 경로
    #[arg(long)]
    key: Option<String>,

    /// Enable logging / 로깅 활성화
    #[arg(long)]
    log_enabled: bool,

    /// Comma-separated list of CDP methods to log / 로깅할 CDP 메소드 목록 (쉼표로 구분)
    #[arg(long)]
    log_methods: Option<String>,

    /// Path to log file / 로그 파일 경로
    #[arg(long)]
    log_file: Option<String>,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let cli = Cli::parse();

    let config = ServerConfig {
        port: cli.port,
        host: cli.host,
        use_ssl: cli.ssl,
        ssl_cert_path: cli.cert,
        ssl_key_path: cli.key,
        log_enabled: cli.log_enabled,
        log_methods: cli.log_methods,
        log_file: cli.log_file,
        dev_mode: cfg!(debug_assertions), // Enable dev mode in debug builds / 디버그 빌드에서 개발 모드 활성화
        enable_reactotron_server: false, // Default to false for standalone server / 독립 실행형 서버는 기본적으로 false
    };

    chrome_remote_devtools_server::run_server(config).await?;

    Ok(())
}
