# 서버 아키텍처

서버는 Rust로 구현된 WebSocket 릴레이 서버로, 클라이언트와 Inspector 사이의 릴레이 역할을 하며 CDP 메시지를 양방향으로 라우팅합니다.

## WebSocket 릴레이 서버

```mermaid
graph LR
    C1[Client 1] -->|WebSocket| WS[WebSocket Server]
    C2[Client 2] -->|WebSocket| WS
    WS --> RM[Message Router]
    RM -->|WebSocket| I1[Inspector 1]
    RM -->|WebSocket| I2[Inspector 2]
```

## 연결 관리

```mermaid
stateDiagram-v2
    [*] --> Disconnected
    Disconnected --> Connecting: Client connects
    Connecting --> Connected: WebSocket established
    Connected --> Disconnected: Connection closed
    Connected --> Connected: Message relay
```

## 메시지 라우팅

서버는 연결 유형에 따라 메시지를 라우팅합니다:

1. **클라이언트에서 Inspector로**: 클라이언트가 CDP 이벤트나 응답을 보내면, 서버는 해당 클라이언트를 선택한 모든 연결된 Inspector에 전달합니다.

2. **Inspector에서 클라이언트로**: Inspector가 CDP 명령을 보내면, 서버는 선택된 클라이언트에 전달합니다.

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    participant I1 as Inspector 1
    participant I2 as Inspector 2

    C->>S: CDP Event
    S->>I1: Forward to selected inspector
    S->>I2: Forward to selected inspector

    I1->>S: CDP Command
    S->>C: Forward to client
    C->>S: CDP Response
    S->>I1: Forward response
```

## HTTP 엔드포인트

서버는 클라이언트 발견을 위한 HTTP 엔드포인트를 제공합니다:

- `GET /json` - 모든 클라이언트 가져오기 (레거시 형식)
- `GET /json/clients` - 모든 클라이언트 세부 정보 가져오기
- `GET /json/inspectors` - 모든 Inspector 가져오기
- `GET /json/client/:id` - 특정 클라이언트 가져오기
- `GET /client.js` - 빌드된 클라이언트 스크립트 제공

## 기능

- **다중 클라이언트 지원**: 여러 클라이언트 연결을 동시에 처리
- **다중 Inspector 지원**: 여러 Inspector가 동일하거나 다른 클라이언트에 연결 지원
- **클라이언트 전환**: Inspector가 다른 클라이언트 간 전환 가능
- **메시지 릴레이**: 클라이언트와 Inspector 간 양방향 메시지 라우팅
- **연결 상태 관리**: 연결 상태 추적 및 관리

## 구현

서버는 Rust로 구현되며 다음 기술을 사용합니다:

- **Rust**: 시스템 프로그래밍 언어
- **Tokio**: 비동기 런타임
- **Axum**: 웹 프레임워크 (HTTP 및 WebSocket)
- **tokio-tungstenite**: WebSocket 라이브러리
- **serde**: 직렬화/역직렬화

## 실행 모드

서버는 두 가지 모드로 실행할 수 있습니다:

### 독립 실행형 모드

```bash
cargo run --bin chrome-remote-devtools-server -- --port 8080
```

독립 실행형 서버로 실행되며, 웹 Inspector나 외부 클라이언트가 연결할 수 있습니다.

### Tauri 내장 모드

Tauri 데스크탑 앱에 라이브러리로 내장되어 실행됩니다. Inspector UI가 Tauri 명령을 통해 서버를 시작/중지할 수 있습니다.

```rust
use chrome_remote_devtools_server::{ServerHandle, ServerConfig};

let handle = ServerHandle::new();
let config = ServerConfig::default();
handle.start(config).await?;
```
