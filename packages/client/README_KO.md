# @ohah/chrome-remote-devtools-client

웹 페이지용 Chrome Remote DevTools Protocol (CDP) 클라이언트. ESM (React/모던 번들러용)과 IIFE (직접 script 태그용) 모두 지원합니다.

## 설치

```bash
npm install @ohah/chrome-remote-devtools-client
```

## 사용법

### React / ESM

```typescript
import { init } from '@ohah/chrome-remote-devtools-client';

useEffect(() => {
  init({
    serverUrl: 'wss://your-server.com',
    rrweb: {
      enable: true, // rrweb 세션 녹화 활성화
      enableExportButton: true, // 선택사항: 페이지에 export 버튼 표시
    },
  });
}, []);
```

### HTML / IIFE

```html
<script src="node_modules/@ohah/chrome-remote-devtools-client/dist/index.global.js"></script>
<script>
  ChromeRemoteDevTools.init({
    serverUrl: 'wss://your-server.com',
    rrweb: {
      enable: true, // rrweb 세션 녹화 활성화
      enableExportButton: true, // 선택사항: 페이지에 export 버튼 표시
    },
  });
</script>
```

또는 CDN에서 로드 (배포 후):

```html
<script src="https://unpkg.com/@ohah/chrome-remote-devtools-client/dist/index.global.js"></script>
<script>
  ChromeRemoteDevTools.init({
    serverUrl: 'wss://your-server.com',
    rrweb: {
      enable: true,
      enableExportButton: true,
    },
  });
</script>
```

## API

### `init(options)` (ESM)

CDP 클라이언트 초기화.

**매개변수:**

- `options` (object) - 설정 옵션
  - `serverUrl` (string, 선택) - 서버 WebSocket URL
  - `rrweb` (object, 선택) - Rrweb 설정
    - `enable` (boolean) - rrweb 세션 녹화 활성화 (기본값: `false`)
    - `enableExportButton` (boolean) - 페이지에 export 버튼 표시 (기본값: `false`)
  - `skipWebSocket` (boolean, 선택) - WebSocket 연결 건너뛰기 (postMessage만 사용, 기본값: `false`)

**예시:**

```typescript
import { init } from '@ohah/chrome-remote-devtools-client';

await init({
  serverUrl: 'wss://your-server.com',
  rrweb: {
    enable: true,
    enableExportButton: true,
  },
});
```

### `ChromeRemoteDevTools.init(options)` (IIFE 전용)

전역 API를 사용하여 CDP 클라이언트 초기화.

**매개변수:**

- `options` (object) - 설정 옵션
  - `serverUrl` (string, 선택) - 서버 WebSocket URL
  - `rrweb` (object, 선택) - Rrweb 설정
    - `enable` (boolean) - rrweb 세션 녹화 활성화 (기본값: `false`)
    - `enableExportButton` (boolean) - 페이지에 export 버튼 표시 (기본값: `false`)
  - `skipWebSocket` (boolean, 선택) - WebSocket 연결 건너뛰기 (postMessage만 사용, 기본값: `false`)

**예시:**

```javascript
ChromeRemoteDevTools.init({
  serverUrl: 'wss://your-server.com',
  rrweb: {
    enable: true,
    enableExportButton: true,
  },
});
```

## CDP 도메인

클라이언트는 다음 CDP 도메인을 구현합니다:

- **Runtime**: JavaScript 실행 및 평가
- **Page**: 페이지 네비게이션 및 정보
- **DOM**: DOM 검사 및 페이지 구조 보기
- **Network**: 네트워크 요청 모니터링
- **Console**: 콘솔 메시지 처리
- **DOMStorage**: 로컬 및 세션 스토리지
- **Storage**: 스토리지 키 관리
- **SessionReplay**: 세션 녹화 및 재생

## 전역 API (IIFE 전용)

IIFE 빌드를 사용할 때 전역 `ChromeRemoteDevTools` 객체를 사용할 수 있습니다:

```javascript
// 클라이언트 초기화
ChromeRemoteDevTools.init({
  serverUrl: 'wss://your-server.com',
  rrweb: {
    enable: true,
    enableExportButton: true,
  },
});

// 녹화된 이벤트 내보내기
await ChromeRemoteDevTools.exportEvents();
```

## 빌드 형식

이 패키지는 여러 빌드 형식을 제공합니다:

- **ESM** (`dist/index.js`) - React, Vite, Webpack 등용
- **IIFE** (`dist/index.global.js`) - 직접 script 태그용
- **TypeScript 타입** (`dist/index.d.ts`) - 타입 정의

## 라이선스

MIT
