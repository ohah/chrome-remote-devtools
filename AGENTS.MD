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
- **Bun** (TypeScript 런타임)
- **TypeScript** (서버 및 클라이언트)
- **WebSocket** (ws 패키지)
- **Rust** (Tauri 백엔드만)

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
[디버깅 대상 웹페이지] ←→ [Bun 중계 서버] ←→ [Inspector (웹/데스크탑)]
     (client)              (server)              (inspector)
```

### 패키지 구조
- **@ohah/chrome-remote-devtools-server**: WebSocket 중계 서버 (TypeScript/Bun)
- **@ohah/chrome-remote-devtools-client**: CDP 클라이언트 (JavaScript, 웹페이지에 로드)
- **@ohah/chrome-remote-devtools-inspector**: Inspector UI (React + Vite, 웹/데스크탑 공유)

### 통신 흐름
1. 클라이언트(`client`)가 WebSocket으로 서버에 연결
2. Inspector가 WebSocket으로 서버에 연결
3. 서버가 CDP 메시지를 양방향으로 전달 (프록시 역할)
4. 클라이언트가 CDP 프로토콜을 클라이언트 사이드에서 구현

## 프로젝트 구조

```
chrome-remote-devtools/
├── packages/
│   ├── server/          # WebSocket 중계 서버
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
bun run dev:server          # 서버만
bun run dev:inspector       # Inspector 웹만
bun run dev:inspector:desktop  # Inspector 데스크탑
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

**예시**:
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

**스크립트 파일 예시**:
```bash
# Install dependencies / 의존성 설치
bun install

# Build packages / 패키지 빌드
bun run build
```

**원칙**:
- 영어를 먼저 작성하고, 슬래시(`/`)로 구분한 후 한글을 작성
- 짧은 주석은 한 줄로 작성
- 긴 설명이 필요한 경우 여러 줄로 나누어 작성 가능
- 코드 자체로 명확한 경우 주석 생략 가능

## 주요 파일 위치

- 서버: `packages/server/src/index.ts`
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

- Implement basic WebSocket server for CDP message relay
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

