# Client API

클라이언트 API를 사용하면 웹페이지에서 CDP 클라이언트를 초기화하고 상호작용할 수 있습니다.

## 초기화

### 자동 초기화

데이터 속성이 있는 클라이언트 스크립트를 로드합니다:

```html
<script
  src="http://localhost:8080/client.js"
  data-server-url="http://localhost:8080"
  data-enable-rrweb="true"
></script>
```

**속성:**

- `data-server-url`: 서버 WebSocket URL
- `data-enable-rrweb`: rrweb 세션 기록 활성화 (선택 사항)

### 수동 초기화

```typescript
import { initCDPClient } from '@ohah/chrome-remote-devtools-client';

await initCDPClient('http://localhost:8080', {
  enable: true, // Enable rrweb
});
```

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
