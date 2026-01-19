# Chrome Remote DevTools 스펙

## 개요
Chrome DevTools Protocol (CDP)을 활용하여 원격 크롬 브라우저를 제어하고 디버깅하는 도구

## 주요 기능

### 1. 연결 관리
- 원격 크롬 인스턴스에 WebSocket 연결
- 연결 상태 모니터링 및 재연결 처리
- 여러 크롬 인스턴스 동시 관리

### 2. 페이지 제어
- 페이지 네비게이션 (이동, 새로고침, 뒤로가기)
- 페이지 정보 조회 (URL, 제목, DOM 구조)
- 스크린샷 캡처

### 3. 콘솔 및 로깅
- 콘솔 메시지 수신 및 표시
- JavaScript 실행 및 평가
- 에러 및 경고 모니터링

### 4. 네트워크 모니터링
- 네트워크 요청/응답 추적
- 요청 차단 및 수정
- 네트워크 성능 분석

### 5. 디버깅
- 브레이크포인트 설정
- 스텝 디버깅
- 변수 및 스택 트레이스 조회

### 6. 성능 프로파일링
- CPU 프로파일링
- 메모리 힙 스냅샷
- 렌더링 성능 분석

## 기술 스택

### 백엔드
- **Rust** (WebSocket 서버 및 Tauri 백엔드)
- **TypeScript** (클라이언트)
- **WebSocket** (axum WebSocket)

### 프론트엔드
- **React** + **Vite** (Inspector)
- **TypeScript**
- **Tauri** (데스크탑 앱)

### DevTools
- **devtools-frontend** (Google 오픈소스, 포크 사용)
- Nice-PLQ 방식 (빌드 없이 소스 직접 서빙)

### 도구
- **oxlint** / **oxfmt** (코드 품질)
- **rustfmt** / **clippy** (Rust 코드 품질)
- **mise** (도구 버전 관리)

### 문서
- **RSPress** (문서 페이지)

## 아키텍처

### 3-Tier 구조
```
[디버깅 대상 웹페이지] ←→ [Rust WebSocket 중계 서버] ←→ [Inspector (웹/데스크탑)]
     (client)                    (server)                      (inspector)
```

### 패키지 구조
- **chrome-remote-devtools-server** (Rust): WebSocket 중계 서버 (독립 실행형 또는 Tauri에 내장)
- **@ohah/chrome-remote-devtools-client**: CDP 클라이언트 (JavaScript, 웹페이지에 로드)
- **@ohah/chrome-remote-devtools-inspector**: Inspector UI (React + Vite, 웹/데스크탑 공유)
- **@ohah/chrome-remote-devtools-inspector-react-native**: React Native Inspector 플러그인 (네이티브 모듈 포함)

### 통신 흐름
1. 클라이언트(`client`)가 WebSocket으로 서버에 연결
2. Inspector가 WebSocket으로 서버에 연결
3. 서버가 CDP 메시지를 양방향으로 전달 (프록시 역할)
4. 클라이언트가 CDP 프로토콜을 클라이언트 사이드에서 구현

## 프로젝트 구조

```
chrome-remote-devtools/
├── crates/
│   └── server/          # WebSocket 중계 서버 (Rust)
├── packages/
│   ├── client/          # CDP 클라이언트 (웹페이지용)
│   └── inspector/       # Inspector UI (React + Vite, 웹/데스크탑)
├── document/            # RSPress 문서 페이지
│   ├── docs/            # 문서 소스
│   └── rspress.config.ts
├── devtools/
│   └── devtools-frontend/  # DevTools 프론트엔드
└── reference/           # 참조 코드 (gitignore)
    ├── chii/
    ├── chobitsu/
    ├── devtools-remote-debugger/
    ├── devtools-protocol/
    └── rrweb/
```

## 참조 프로젝트

### devtools-remote-debugger (Nice-PLQ)
- 클라이언트 사이드 CDP 직접 구현
- Vue.js 기반 Inspector
- 소스 파일 직접 서빙 방식

### chii
- chobitsu 라이브러리 사용
- TypeScript 기반
- Channel 기반 메시지 라우팅

### chobitsu
- CDP 프로토콜 JavaScript 구현 라이브러리
- TypeScript 기반
- 다양한 CDP 도메인 구현

## 개발 명령어

```bash
# 개발 서버 시작
cargo run --bin chrome-remote-devtools-server  # Rust 서버만
bun run dev:inspector       # Inspector 웹만
bun run dev:inspector:tauri  # Inspector 데스크탑
bun run dev:docs            # 문서 페이지 (document 패키지)

# 코드 품질
bun run lint                # oxlint
bun run format              # oxfmt
bun run format:rust         # rustfmt

# 빌드
bun run build               # 전체 빌드
bun run build:docs          # 문서 빌드 (document 패키지)
```

## 코딩 스타일 가이드라인

### 주석 규칙

모든 주석은 **영어와 한글을 함께** 사용합니다.

**형식**: `영어 설명 / 한글 설명`

#### JavaScript/TypeScript 주석

**JavaScript와 TypeScript 코드에서는 JSDoc 스타일 주석을 사용합니다.**

**JSDoc 예시**:
```typescript
/**
 * Client entity types / 클라이언트 엔티티 타입
 */
export interface Client {
  /** Client unique identifier / 클라이언트 고유 식별자 */
  id: string;
  /** Page URL / 페이지 URL */
  url?: string;
}

/**
 * Get clients from server / 서버에서 클라이언트 목록 가져오기
 * @returns Promise resolving to array of clients / 클라이언트 배열로 resolve되는 Promise
 */
export async function getClients(): Promise<Client[]> {
  // ...
}
```

**일반 주석 예시**:
```typescript
// Update connection state / 연결 상태 업데이트
function updateConnection() {
  // ...
}

// Handle WebSocket message / WebSocket 메시지 처리
async function handleMessage(msg: string) {
  // ...
}
```

**Rust 주석 예시**:
```rust
/// Client connection handler / 클라이언트 연결 핸들러
pub struct ClientHandler {
    /// Client unique identifier / 클라이언트 고유 식별자
    pub id: String,
    /// WebSocket connection / WebSocket 연결
    pub ws: WebSocket,
}

/// Initialize client handler / 클라이언트 핸들러 초기화
///
/// # Arguments
///
/// * `id` - Client identifier / 클라이언트 식별자
/// * `ws` - WebSocket connection / WebSocket 연결
///
/// # Returns
///
/// Initialized client handler / 초기화된 클라이언트 핸들러
pub fn new(id: String, ws: WebSocket) -> ClientHandler {
    // ...
}
```

**스크립트 파일 예시**:
```bash
# Install dependencies / 의존성 설치
bun install

# Build packages / 패키지 빌드
bun run build
```

**원칙**:
- **JSDoc 스타일 (JavaScript/TypeScript)**: 인터페이스, 타입, 함수, 클래스 등은 `/** */` 형식의 JSDoc 주석 사용
- **일반 주석 (JavaScript/TypeScript)**: 간단한 설명이나 인라인 주석은 `//` 형식 사용
- **Rust 문서 주석**: 구조체, 함수, 모듈 등은 `///` 형식의 문서 주석 사용
- **Rust 일반 주석**: 간단한 설명이나 인라인 주석은 `//` 형식 사용
- 영어를 먼저 작성하고, 슬래시(`/`)로 구분한 후 한글을 작성
- 짧은 주석은 한 줄로 작성
- 긴 설명이 필요한 경우 여러 줄로 나누어 작성 가능
- 코드 자체로 명확한 경우 주석 생략 가능

### 코드 규칙

**주석을 제외한 모든 코드는 영어만 사용합니다.**

- 변수명, 함수명, 클래스명 등 모든 식별자는 영어로 작성
- 문자열 리터럴은 영어로 작성 (사용자에게 표시되는 메시지 제외)
- 에러 메시지, 로그 메시지 등은 영어로 작성

**예시**:
```typescript
// Good / 좋은 예
function updateConnectionState() {
  const clientId = 'client-123';
  console.log('Connection established');
}

// Bad / 나쁜 예
function 연결상태업데이트() {
  const 클라이언트ID = 'client-123';
  console.log('연결이 설정되었습니다');
}
```

## 주요 파일 위치

- 서버: `crates/server/src/` (Rust)
  - 메인 바이너리: `crates/server/src/main.rs`
  - 라이브러리: `crates/server/src/lib.rs`
- 클라이언트: `packages/client/src/index.ts`
- Inspector: `packages/inspector/src/`
- DevTools: `devtools/devtools-frontend/front_end/`
- 문서: `document/docs/`

## 커밋 규칙

**중요**: 모든 커밋은 단일 목적에 집중하고, 논리적으로 분리되어야 합니다.

### 커밋 메시지 형식

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type (필수)

- `feat`: 새로운 기능 추가
- `fix`: 버그 수정
- `refactor`: 코드 리팩토링 (기능 변경 없음)
- `test`: 테스트 추가/수정
- `docs`: 문서 업데이트
- `chore`: 빌드 설정, 의존성 업데이트 등
- `style`: 코드 포맷팅, 세미콜론 누락 등 (기능 변경 없음)

### Scope (선택)

- `server`: 서버 패키지 관련
- `client`: 클라이언트 패키지 관련
- `inspector`: Inspector 패키지 관련
- `devtools`: devtools-frontend 관련
- `docs`: 문서 관련
- `scripts`: 빌드/초기화 스크립트 관련
- `config`: 프로젝트 설정 파일 관련

### Subject (필수)

- 50자 이내로 간결하게 작성
- 명령형으로 작성 (과거형 X)
- 첫 글자는 대문자로 시작하지 않음
- 마지막에 마침표(.) 사용하지 않음

### Body (선택)

- 72자마다 줄바꿈
- 무엇을, 왜 변경했는지 설명
- 어떻게 변경했는지는 코드로 보이므로 생략 가능

### Footer (선택)

- Breaking changes, Issue 번호 등

### 커밋 예시

```
feat(server): add WebSocket relay server

- Implement Rust WebSocket server for CDP message relay
- Support multiple client connections
- Add connection state management
```

```
fix(client): handle WebSocket reconnection properly

- Fix reconnection logic when connection is lost
- Add exponential backoff for reconnection attempts
```

```
refactor(inspector): reorganize component structure

- Move DevTools integration to separate module
- Extract connection logic to custom hook
```

### 커밋 원칙

1. **단일 목적**: 하나의 커밋은 하나의 목적만 가져야 함
2. **논리적 분리**: 관련 없는 변경사항은 별도 커밋으로 분리
3. **독립적 의미**: 각 커밋은 독립적으로 의미가 있어야 함
4. **되돌리기 용이**: 특정 기능만 되돌릴 수 있도록 구성
5. **작은 단위**: 가능한 작은 단위로 커밋 (하지만 너무 작지 않게)

### 커밋 순서 예시

1. 의존성 추가
2. 타입 정의
3. 기능 구현
4. 리팩토링
5. 테스트 추가
6. 문서 업데이트

이 순서로 커밋하면 히스토리가 명확하고 이해하기 쉬워집니다.

### 커밋 전 필수 작업

**중요**: 커밋하기 전에 반드시 다음 작업을 수행해야 합니다.

#### TypeScript/JavaScript 코드 작업 시

1. **코드 포맷팅 검사 및 적용**:
   ```bash
   bun run format
   ```
   - `bun format` 명령어로 코드 포맷팅을 검사하고 자동으로 수정합니다
   - 포맷팅 오류가 있으면 자동으로 수정되므로, 수정된 파일을 함께 커밋해야 합니다
   - 포맷팅 검사를 통과한 후에만 커밋을 진행합니다

2. **린트 검사** (선택사항):
   ```bash
   bun run lint
   ```
   - `bun lint` 명령어로 코드 품질을 검사합니다
   - 린트 오류가 있으면 수정 후 커밋합니다

#### Rust 코드 작업 시

**중요**: Rust 코드를 수정한 경우 반드시 다음 명령어를 실행해야 합니다.

1. **코드 포맷팅 검사**:
   ```bash
   cargo fmt --all -- --check
   ```
   - Rust 코드 포맷팅을 검사합니다
   - 포맷팅 오류가 있으면 다음 명령어로 자동 수정:
     ```bash
     cargo fmt --all
     ```
   - 수정된 파일을 함께 커밋해야 합니다

2. **코드 품질 검사**:
   ```bash
   cargo clippy --all-targets --all-features -- -D warnings
   ```
   - Clippy로 코드 품질을 검사합니다
   - 경고(`warnings`)가 있으면 모두 수정해야 합니다
   - 모든 경고를 수정한 후에만 커밋을 진행합니다

**커밋 전 체크리스트**:

**TypeScript/JavaScript 코드**:
- [ ] `bun run format` 실행하여 포맷팅 검사 및 수정
- [ ] 포맷팅으로 변경된 파일이 있으면 함께 스테이징
- [ ] (선택) `bun run lint` 실행하여 린트 검사
- [ ] 모든 검사를 통과한 후 커밋 진행

**Rust 코드**:
- [ ] `cargo fmt --all -- --check` 실행하여 포맷팅 검사
- [ ] 포맷팅 오류가 있으면 `cargo fmt --all` 실행하여 수정
- [ ] 수정된 파일을 함께 스테이징
- [ ] `cargo clippy --all-targets --all-features -- -D warnings` 실행하여 코드 품질 검사
- [ ] 모든 경고를 수정
- [ ] 모든 검사를 통과한 후 커밋 진행

## React Native 원격 개발 전략

### 기본 원칙

**중요**: React Native의 모든 이벤트 인터셉션은 **JSI (JavaScript Interface) 레벨에서만** 처리합니다.

1. **JSI 레벨 우선**: 모든 이벤트 인터셉션(네트워크, 콘솔, 디버깅 등)은 JSI 레벨에서 처리
2. **네이티브 레벨 제한**: 네이티브 레벨 인터셉터는 사용하지 않음
3. **함수 래핑 방식**: JavaScript 함수를 래핑하여 이벤트 정보 수집

### 네트워크 인터셉션

#### 구현 방식

**XMLHttpRequest 인터셉션**:
- `open()` 메서드 훅: method, url 정보 수집
- `setRequestHeader()` 메서드 훅: headers 정보 수집
- `send()` 메서드 훅: body 정보 수집 및 요청 전송 이벤트 발생
- `load` 이벤트 리스너 추가: 응답 정보 수집 및 응답 수신 이벤트 발생

**fetch 인터셉션**:
- `fetch()` 함수 래핑: 요청 정보 수집 및 요청 전송 이벤트 발생
- Promise의 `then()` 훅: 응답 정보 수집 및 응답 수신 이벤트 발생

### 콘솔 인터셉션

#### 구현 방식

**console 메서드 인터셉션**:
- `console.log()`, `console.warn()`, `console.error()` 등 모든 console 메서드 훅
- 원본 메서드를 백업하고 래핑된 함수로 교체
- 콘솔 메시지를 CDP 형식으로 변환하여 전송

### 코드 구조 원칙

1. **모듈화**: 이벤트 정보 수집 로직을 별도 함수로 분리
2. **이벤트 전송 분리**: CDP 이벤트 전송 로직을 별도 함수로 분리
3. **에러 처리**: 모든 JSI 호출은 try-catch로 감싸서 안전하게 처리
4. **원본 함수 보존**: 원본 함수를 백업하여 정상 동작 보장
5. **JSI 레벨 일관성**: 모든 인터셉션은 JSI 레벨에서 일관되게 처리

#### 제한사항

- **함수 래핑 필수**: 이벤트 정보를 얻기 위해 함수 래핑이 필요
- **이벤트 리스너만으로는 부족**: 요청 정보를 얻기 위해서는 함수 호출을 가로채야 함
- **성능 고려**: 함수 래핑은 성능에 영향을 줄 수 있으므로 최소한의 로직만 수행

### 파일 위치

- 네트워크 훅: `packages/react-native-inspector/cpp/NetworkHook.cpp`
- 네트워크 훅 헤더: `packages/react-native-inspector/cpp/NetworkHook.h`
- 콘솔 훅: `packages/react-native-inspector/cpp/ConsoleHook.cpp`
- 콘솔 훅 헤더: `packages/react-native-inspector/cpp/ConsoleHook.h`

