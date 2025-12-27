# @ohah/chrome-remote-devtools-server

SSL 지원이 있는 Chrome Remote DevTools WebSocket 중계 서버.

## 설치

```bash
npm install @ohah/chrome-remote-devtools-server
```

## 사용법

### 기본 사용법

```bash
npx chrome-remote-devtools-server
```

### 환경 변수와 함께

```bash
PORT=8080 npx chrome-remote-devtools-server
```

### SSL (HTTPS/WSS)과 함께

프로덕션 환경에서는 SSL 인증서를 설정해야 합니다. 다음 중 하나를 선택할 수 있습니다:

1. 리버스 프록시 사용 (Nginx/Caddy) - 권장
2. Bun의 내장 HTTPS 지원 사용

#### CLI 옵션 사용

```bash
npx chrome-remote-devtools-server \
  --ssl \
  --cert /path/to/cert.pem \
  --key /path/to/key.pem
```

#### 환경 변수 사용

```bash
USE_SSL=true \
SSL_CERT_PATH=/path/to/cert.pem \
SSL_KEY_PATH=/path/to/key.pem \
npx chrome-remote-devtools-server
```

### 로깅과 함께

#### 모든 로그 활성화

```bash
npx chrome-remote-devtools-server --log-enabled
```

#### 메소드로 로그 필터링

```bash
npx chrome-remote-devtools-server \
  --log-enabled \
  --log-methods "Runtime.evaluate,Page.navigate"
```

#### 파일 로깅

```bash
npx chrome-remote-devtools-server \
  --log-enabled \
  --log-file ./logs/server.log
```

## 환경 변수

### 기본 설정

- `PORT` - 서버 포트 (기본값: HTTP는 `8080`, HTTPS는 `8443`)
- `HOST` - 서버 호스트 (기본값: `0.0.0.0`)

### SSL 설정

- `USE_SSL` - HTTPS/WSS 활성화 (기본값: `false`)
- `SSL_CERT_PATH` - SSL 인증서 파일 경로 (`USE_SSL=true`일 때 필수)
- `SSL_KEY_PATH` - SSL 개인 키 파일 경로 (`USE_SSL=true`일 때 필수)

### 로깅 설정

- `LOG_ENABLED` - 로깅 활성화 (기본값: `false`)
- `LOG_METHODS` - 로깅할 CDP 메소드 목록 (쉼표로 구분, 기본값: 모든 메소드)
- `LOG_FILE_PATH` - 로그 파일 경로 (콘솔과 파일 모두에 기록)

## CLI 옵션

- `-p, --port <number>` - 서버 포트
- `-h, --host <string>` - 서버 호스트
- `--ssl` - HTTPS/WSS 활성화
- `--cert <path>` - SSL 인증서 파일 경로
- `--key <path>` - SSL 개인 키 파일 경로
- `--log-enabled` - 로깅 활성화
- `--log-methods <methods>` - 로깅할 CDP 메소드 목록 (쉼표로 구분)
- `--log-file <path>` - 로그 파일 경로
- `--help` - 도움말 메시지 표시

**참고**: CLI 옵션이 환경 변수보다 우선순위가 높습니다.

## SSL 인증서 설정

### Let's Encrypt 사용 (권장)

```bash
# certbot 설치
sudo apt-get install certbot

# 인증서 발급
sudo certbot certonly --standalone -d your-domain.com

# 인증서 사용
USE_SSL=true \
SSL_CERT_PATH=/etc/letsencrypt/live/your-domain.com/fullchain.pem \
SSL_KEY_PATH=/etc/letsencrypt/live/your-domain.com/privkey.pem \
npx chrome-remote-devtools-server
```

### 자체 서명 인증서 사용 (개발 전용)

```bash
# 자체 서명 인증서 생성
openssl req -x509 -newkey rsa:4096 -nodes \
  -keyout key.pem \
  -out cert.pem \
  -days 365 \
  -subj "/CN=localhost"

# 인증서 사용
npx chrome-remote-devtools-server \
  --ssl \
  --cert ./cert.pem \
  --key ./key.pem
```

**경고**: 자체 서명 인증서는 프로덕션에서 안전하지 않습니다. 프로덕션에서는 Let's Encrypt나 신뢰할 수 있는 CA를 사용하세요.

## 예시

### 개발 서버

```bash
# 기본 포트에서 HTTP
npx chrome-remote-devtools-server

# 사용자 지정 포트에서 HTTP
npx chrome-remote-devtools-server --port 3000

# 로깅과 함께
npx chrome-remote-devtools-server --log-enabled
```

### 프로덕션 서버

```bash
# Let's Encrypt와 함께 HTTPS
USE_SSL=true \
SSL_CERT_PATH=/etc/letsencrypt/live/your-domain.com/fullchain.pem \
SSL_KEY_PATH=/etc/letsencrypt/live/your-domain.com/privkey.pem \
LOG_ENABLED=true \
LOG_FILE_PATH=/var/log/chrome-remote-devtools/server.log \
npx chrome-remote-devtools-server
```

## API

서버는 다음 HTTP 엔드포인트를 제공합니다:

- `GET /json` - 모든 클라이언트 가져오기
- `GET /json/clients` - 상세 정보와 함께 모든 클라이언트 가져오기
- `GET /json/inspectors` - 모든 inspector 가져오기
- `GET /json/client/:id` - 특정 클라이언트 가져오기

WebSocket 엔드포인트:

- `WS /remote/debug/client/:id` - 클라이언트 연결
- `WS /remote/debug/devtools/:id` - DevTools 연결

## 라이선스

MIT
