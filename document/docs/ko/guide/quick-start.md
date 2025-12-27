# 빠른 시작

이 가이드는 몇 분 안에 Chrome Remote DevTools를 시작하는 데 도움이 됩니다.

## 개발 서버 시작

### 1. WebSocket 릴레이 서버 시작

```bash
bun run dev:server
```

서버는 기본적으로 `http://localhost:8080`에서 시작됩니다.

### 2. Inspector (웹 버전) 시작

새 터미널에서:

```bash
bun run dev:inspector
```

Inspector는 `http://localhost:5173` (또는 터미널에 표시된 포트)에서 사용할 수 있습니다.

### 3. 웹 페이지에서 클라이언트 초기화

**npm 패키지 사용 (ESM):**

```bash
npm install @ohah/chrome-remote-devtools-client
```

```typescript
import { init } from '@ohah/chrome-remote-devtools-client';

init({
  serverUrl: 'ws://localhost:8080',
});
```

**스크립트 태그 사용 (IIFE):**

```html
<script src="http://localhost:8080/client.js"></script>
<script>
  ChromeRemoteDevTools.init({
    serverUrl: 'ws://localhost:8080',
  });
</script>
```

## 첫 디버깅 세션

1. 클라이언트 스크립트가 로드된 웹 페이지 열기
2. 브라우저에서 Inspector 열기 (`http://localhost:5173`)
3. 목록에서 클라이언트 선택
4. 디버깅 시작!

Inspector가 페이지에 연결되고 모든 DevTools 기능을 사용할 수 있습니다:

- 콘솔 보기 및 상호작용
- DOM 검사
- 네트워크 요청 모니터링
- JavaScript 디버깅
- 그리고 더 많은 기능!

## 다음 단계

- [아키텍처](/ko/architecture/overview) 알아보기
- [플레이그라운드](/ko/examples/) 체험하기
- [API 문서](/ko/api/server) 읽기
