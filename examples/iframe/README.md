# iframe DevTools Example

This example demonstrates how to display DevTools in an iframe within the same page, similar to [chii's iframe.html example](https://chii.liriliri.io/playground/test/iframe.html).

## Features / 기능

- **iframe DevTools**: DevTools displayed in a resizable iframe panel at the bottom of the page / 페이지 하단에 크기 조절 가능한 iframe 패널로 DevTools 표시
- **Popup DevTools**: DevTools opened in a separate popup window / 별도의 팝업 창에서 DevTools 열기
- **Router Navigation**: Navigate between different pages (Home, Test, About) / 다른 페이지 간 네비게이션 (홈, 테스트, 정보)
- **Auto-connect**: Automatically connects to the WebSocket server and displays DevTools / WebSocket 서버에 자동 연결하고 DevTools 표시
- **Resizable panel**: Drag the handle at the top of the DevTools panel to resize / DevTools 패널 상단의 핸들을 드래그하여 크기 조절
- **Height persistence**: Panel height is saved to localStorage and restored on next visit / 패널 높이는 localStorage에 저장되어 다음 방문 시 복원됨
- **postMessage communication**: WebSocket-free communication between parent and DevTools / 부모와 DevTools 간 WebSocket 없는 통신

## Usage / 사용 방법

### Prerequisites / 사전 요구사항

1. Start the WebSocket server / WebSocket 서버 시작:

   ```bash
   bun run dev:server
   ```

2. Start the example / 예제 시작:

   ```bash
   cd examples/iframe
   bun install
   bun run dev
   ```

3. Open the example in your browser / 브라우저에서 예제 열기:
   - The example will be available at `http://localhost:5174` (or another port if 5174 is in use) / 예제는 `http://localhost:5174`에서 사용 가능 (5174가 사용 중이면 다른 포트)
   - The client script will automatically connect to the WebSocket server / 클라이언트 스크립트가 자동으로 WebSocket 서버에 연결됨
   - DevTools iframe will appear at the bottom of the page / DevTools iframe이 페이지 하단에 나타남

### Testing / 테스트

Use the test buttons on the page to:

- **Console Test**: Log messages to the console / 콘솔에 메시지 로그
- **Network Test**: Make a network request / 네트워크 요청 수행
- **Storage Test**: Test localStorage and sessionStorage / localStorage 및 sessionStorage 테스트

All of these will be visible in the DevTools iframe / 이 모든 것이 DevTools iframe에서 확인 가능합니다.

## Differences from chii iframe.html / chii iframe.html과의 차이점

| Feature / 기능                     | chii iframe.html                | examples/iframe                  |
| ---------------------------------- | ------------------------------- | -------------------------------- |
| Structure / 구조                   | target iframe + devtools iframe | Main page + devtools iframe/popup |
| Client injection / 클라이언트 주입 | Injected into target iframe     | Injected directly into main page |
| DevTools location / DevTools 위치  | Bottom iframe (fixed)           | Bottom panel (resizable) or popup |
| Communication / 통신               | postMessage                     | postMessage (CDP)                |
| Router / 라우터                    | None                            | Hash-based router                |

## Implementation Details / 구현 세부사항

### DevTools Components / DevTools 컴포넌트

**DevToolsIframe Component**:

- Creates a fixed bottom panel with a resizable handle / 크기 조절 가능한 핸들이 있는 고정 하단 패널 생성
- Loads DevTools from `/devtools-frontend/devtools_app.html` / `/devtools-frontend/devtools_app.html`에서 DevTools 로드
- Uses postMessage for communication / 통신에 postMessage 사용
- Supports embedded mode with origin parameter / origin 파라미터로 embedded 모드 지원

**DevToolsPopup Component**:

- Opens DevTools in a separate popup window / 별도의 팝업 창에서 DevTools 열기
- Uses postMessage for communication / 통신에 postMessage 사용
- Automatically closes when client disconnects / 클라이언트 연결이 끊기면 자동으로 닫힘

### Router / 라우터

The example includes a simple hash-based router / 예제에는 간단한 hash 기반 라우터가 포함되어 있습니다:

- **Home Page (/)** / 홈 페이지: Welcome page with navigation links / 네비게이션 링크가 있는 환영 페이지
- **Test Page (/test)** / 테스트 페이지: Various test functions (console, network, storage, router) / 다양한 테스트 함수 (콘솔, 네트워크, 스토리지, 라우터)
- **About Page (/about)** / 정보 페이지: Information about the example / 예제에 대한 정보

### Client ID Detection / 클라이언트 ID 감지

The client ID is retrieved from `sessionStorage.getItem('debug_id')`, which is set by the client script when it connects to the WebSocket server / 클라이언트 ID는 `sessionStorage.getItem('debug_id')`에서 가져오며, 클라이언트 스크립트가 WebSocket 서버에 연결할 때 설정됩니다.

### Height Persistence / 높이 지속성

The panel height is saved to `localStorage` with the key `chii-embedded-height` (following chii's convention) / 패널 높이는 `chii-embedded-height` 키로 `localStorage`에 저장됩니다 (chii의 관례를 따름).

## Remote Debugging vs iframe Mode / 원격 디버깅 vs iframe 모드

- **Remote Debugging (basic example)**: DevTools opened in a separate Inspector page / 별도의 Inspector 페이지에서 DevTools 열림
- **iframe Mode (this example)**: DevTools displayed in an iframe within the same page / 같은 페이지 내의 iframe에 DevTools 표시

Both modes can be used simultaneously / 두 모드를 동시에 사용할 수 있습니다.
