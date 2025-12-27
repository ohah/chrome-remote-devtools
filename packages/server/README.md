# @ohah/chrome-remote-devtools-server

Chrome Remote DevTools WebSocket relay server with SSL support.

## Installation

```bash
npm install @ohah/chrome-remote-devtools-server
```

## Usage

### Basic Usage / 기본 사용법

```bash
npx chrome-remote-devtools-server
```

### With Environment Variables / 환경 변수와 함께

```bash
PORT=8080 npx chrome-remote-devtools-server
```

### With SSL (HTTPS/WSS) / SSL과 함께

For production, you'll need to set up SSL certificates. You can either:

1. Use a reverse proxy (Nginx/Caddy) - Recommended
2. Use Bun's built-in HTTPS support

#### Using CLI Options / CLI 옵션 사용

```bash
npx chrome-remote-devtools-server \
  --ssl \
  --cert /path/to/cert.pem \
  --key /path/to/key.pem
```

#### Using Environment Variables / 환경 변수 사용

```bash
USE_SSL=true \
SSL_CERT_PATH=/path/to/cert.pem \
SSL_KEY_PATH=/path/to/key.pem \
npx chrome-remote-devtools-server
```

### With Logging / 로깅과 함께

#### Enable All Logs / 모든 로그 활성화

```bash
npx chrome-remote-devtools-server --log-enabled
```

#### Filter Logs by Methods / 메소드로 로그 필터링

```bash
npx chrome-remote-devtools-server \
  --log-enabled \
  --log-methods "Runtime.evaluate,Page.navigate"
```

#### File Logging / 파일 로깅

```bash
npx chrome-remote-devtools-server \
  --log-enabled \
  --log-file ./logs/server.log
```

## Environment Variables / 환경 변수

### Basic Configuration / 기본 설정

- `PORT` - Server port (default: `8080` for HTTP, `8443` for HTTPS) / 서버 포트 (기본값: HTTP는 `8080`, HTTPS는 `8443`)
- `HOST` - Server host (default: `0.0.0.0`) / 서버 호스트 (기본값: `0.0.0.0`)

### SSL Configuration / SSL 설정

- `USE_SSL` - Enable HTTPS/WSS (default: `false`) / HTTPS/WSS 활성화 (기본값: `false`)
- `SSL_CERT_PATH` - Path to SSL certificate file (required when `USE_SSL=true`) / SSL 인증서 파일 경로 (`USE_SSL=true`일 때 필수)
- `SSL_KEY_PATH` - Path to SSL private key file (required when `USE_SSL=true`) / SSL 개인 키 파일 경로 (`USE_SSL=true`일 때 필수)

### Logging Configuration / 로깅 설정

- `LOG_ENABLED` - Enable logging (default: `false`) / 로깅 활성화 (기본값: `false`)
- `LOG_METHODS` - Comma-separated list of CDP methods to log (default: all methods) / 로깅할 CDP 메소드 목록 (쉼표로 구분, 기본값: 모든 메소드)
- `LOG_FILE_PATH` - Path to log file (logs will be written to both console and file) / 로그 파일 경로 (콘솔과 파일 모두에 기록)

## CLI Options / CLI 옵션

- `-p, --port <number>` - Server port
- `-h, --host <string>` - Server host
- `--ssl` - Enable HTTPS/WSS
- `--cert <path>` - Path to SSL certificate file
- `--key <path>` - Path to SSL private key file
- `--log-enabled` - Enable logging
- `--log-methods <methods>` - Comma-separated list of CDP methods to log
- `--log-file <path>` - Path to log file
- `--help` - Show help message

**Note**: CLI options take precedence over environment variables. / CLI 옵션이 환경 변수보다 우선순위가 높습니다.

## SSL Certificate Setup / SSL 인증서 설정

### Using Let's Encrypt (Recommended) / Let's Encrypt 사용 (권장)

```bash
# Install certbot
sudo apt-get install certbot

# Get certificate
sudo certbot certonly --standalone -d your-domain.com

# Use the certificate
USE_SSL=true \
SSL_CERT_PATH=/etc/letsencrypt/live/your-domain.com/fullchain.pem \
SSL_KEY_PATH=/etc/letsencrypt/live/your-domain.com/privkey.pem \
npx chrome-remote-devtools-server
```

### Using Self-Signed Certificate (Development Only) / 자체 서명 인증서 사용 (개발 전용)

```bash
# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -nodes \
  -keyout key.pem \
  -out cert.pem \
  -days 365 \
  -subj "/CN=localhost"

# Use the certificate
npx chrome-remote-devtools-server \
  --ssl \
  --cert ./cert.pem \
  --key ./key.pem
```

**Warning / 경고**: Self-signed certificates are not secure for production use. Use Let's Encrypt or a trusted CA for production. / 자체 서명 인증서는 프로덕션에서 안전하지 않습니다. 프로덕션에서는 Let's Encrypt나 신뢰할 수 있는 CA를 사용하세요.

## Examples / 예시

### Development Server / 개발 서버

```bash
# HTTP on default port
npx chrome-remote-devtools-server

# HTTP on custom port
npx chrome-remote-devtools-server --port 3000

# With logging
npx chrome-remote-devtools-server --log-enabled
```

### Production Server / 프로덕션 서버

```bash
# HTTPS with Let's Encrypt
USE_SSL=true \
SSL_CERT_PATH=/etc/letsencrypt/live/your-domain.com/fullchain.pem \
SSL_KEY_PATH=/etc/letsencrypt/live/your-domain.com/privkey.pem \
LOG_ENABLED=true \
LOG_FILE_PATH=/var/log/chrome-remote-devtools/server.log \
npx chrome-remote-devtools-server
```

## API

The server provides the following HTTP endpoints:

- `GET /json` - Get all clients
- `GET /json/clients` - Get all clients with details
- `GET /json/inspectors` - Get all inspectors
- `GET /json/client/:id` - Get specific client

WebSocket endpoints:

- `WS /remote/debug/client/:id` - Client connection
- `WS /remote/debug/devtools/:id` - DevTools connection

## License

MIT
