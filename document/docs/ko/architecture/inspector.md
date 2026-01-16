# Inspector 아키텍처

Inspector는 웹페이지를 원격으로 디버깅하기 위한 DevTools UI를 제공합니다. 웹 애플리케이션이나 데스크탑 애플리케이션(Tauri 사용)으로 실행할 수 있습니다. 데스크탑 버전의 경우 Tauri가 Rust 서버를 내장하여 별도의 서버 실행 없이 사용할 수 있습니다.

## Inspector 구조

### 웹 Inspector

```mermaid
graph TB
    I[Web Inspector] --> CL[Client List]
    I --> DT[DevTools Iframe]
    I --> WS[WebSocket Connection]
    CL --> S[External Rust Server]
    DT --> WS
    WS --> S
```

### 데스크탑 Inspector (Tauri)

```mermaid
graph TB
    I[Tauri Inspector] --> CL[Client List]
    I --> DT[DevTools Iframe]
    I --> WS[WebSocket Connection]
    I --> TC[Tauri Commands]
    CL --> ES[Embedded Rust Server]
    DT --> WS
    WS --> ES
    TC --> ES
```

## DevTools 통합

Inspector는 iframe을 사용하여 devtools-frontend와 통합합니다:

```mermaid
graph LR
    I[Inspector UI] --> IF[DevTools Iframe]
    IF --> DTF[devtools-frontend]
    IF --> WS[WebSocket]
    WS --> S[Server]
```

## 클라이언트 선택 흐름

### 웹 Inspector

```mermaid
sequenceDiagram
    participant U as User
    participant I as Web Inspector
    participant S as External Server
    participant C as Client

    U->>I: Select client
    I->>S: Request client list
    S->>I: Return clients
    I->>I: Display client list
    U->>I: Choose client
    I->>S: Connect to client
    S->>C: Establish connection
    I->>I: Load DevTools iframe
```

### 데스크탑 Inspector (Tauri)

```mermaid
sequenceDiagram
    participant U as User
    participant I as Inspector UI
    participant T as Tauri
    participant ES as Embedded Server
    participant C as Client

    U->>I: Start server
    I->>T: Tauri Command (start_server)
    T->>ES: Start server
    ES->>ES: Server running
    U->>I: Select client
    I->>ES: Request client list
    ES->>I: Return clients
    I->>I: Display client list
    U->>I: Choose client
    I->>ES: Connect to client
    ES->>C: Establish connection
    I->>I: Load DevTools iframe
```

## 웹 및 데스크탑 버전

Inspector는 웹 및 데스크탑 버전을 모두 지원합니다:

```mermaid
graph TB
    I[Inspector] --> W[Web Version]
    I --> D[Desktop Version]
    W --> R[React + Vite]
    W --> ES[External Rust Server]
    D --> R
    D --> T[Tauri]
    D --> ES2[Embedded Rust Server]
    T --> ES2
```

## 기능

- **클라이언트 발견**: 연결된 클라이언트를 자동으로 발견하고 나열
- **클라이언트 선택**: 다른 클라이언트 간 전환
- **DevTools 통합**: iframe을 통한 전체 DevTools UI
- **WebSocket 통신**: 서버에 직접 연결
- **자동 새로고침**: 자동 클라이언트 목록 업데이트
- **내장 서버** (데스크탑): Tauri 앱이 Rust 서버를 내장하여 별도 서버 실행 불필요

## 구현

Inspector는 다음을 사용하여 구현됩니다:

- **React**: UI 프레임워크
- **Vite**: 빌드 도구
- **TanStack Router**: 라우팅
- **Tailwind CSS**: 스타일링
- **Tauri**: 데스크탑 앱 프레임워크 (데스크탑 버전)
- **Rust 서버 라이브러리**: Tauri에 내장된 WebSocket 서버

## DevTools URL 구성

Inspector는 WebSocket 구성을 사용하여 DevTools URL을 구성합니다:

```typescript
const devtoolsUrl = buildDevToolsUrl(clientId, serverUrl);
// Result: /devtools-frontend/?ws=localhost:8080/remote/debug/devtools/devtools-{clientId}?clientId={clientId}
```

iframe이 이 URL을 로드하면, 서버에 대한 WebSocket 연결로 devtools-frontend가 초기화됩니다.
