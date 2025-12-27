# Client API

클라이언트 API를 사용하면 웹페이지에서 CDP 클라이언트를 초기화하고 상호작용할 수 있습니다.

## 초기화

`init()` 함수를 사용하여 클라이언트를 초기화합니다:

```typescript
import { init } from '@ohah/chrome-remote-devtools-client';

init({
  serverUrl: 'ws://localhost:8080',
  rrweb: {
    enable: true,
    enableExportButton: true,
  },
});
```

**옵션:**

- `serverUrl`: 서버 WebSocket URL (HTTPS는 `wss://`, HTTP는 `ws://` 사용)
- `rrweb.enable`: rrweb 세션 리플레이 녹화 활성화 (선택사항, 기본값: `false`)
- `rrweb.enableExportButton`: 페이지에 export 버튼 표시 (선택사항, 기본값: `false`)
- `skipWebSocket`: WebSocket 연결 건너뛰고 postMessage만 사용 (선택사항, 기본값: `false`)

## CDP Domains

클라이언트는 다음 CDP 도메인을 구현합니다:

- **Runtime**: JavaScript 실행 및 평가
- **Page**: 페이지 네비게이션 및 정보
- **DOM**: DOM 검사 및 페이지 구조 보기
- **Network**: 네트워크 요청 모니터링
- **Console**: 콘솔 메시지 처리
- **DOMStorage**: 로컬 및 세션 스토리지
- **Storage**: 스토리지 키 관리
- **SessionReplay**: 세션 기록 및 재생

## 사용법

초기화되면 클라이언트는 자동으로:

- WebSocket을 통해 서버에 연결
- 모든 CDP 도메인 등록
- Inspector의 CDP 명령 처리
- Inspector에 CDP 이벤트 발생

기본 사용을 위해 추가 코드가 필요하지 않습니다.
