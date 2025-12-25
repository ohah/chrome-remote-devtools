# 설치 가이드

이 가이드는 웹페이지에 Chrome Remote DevTools 클라이언트를 설치하고 사용하는 방법을 보여줍니다.

## 기본 설치

HTML 페이지에 클라이언트 스크립트를 추가합니다:

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Page</title>
  <!-- 서버에서 클라이언트 스크립트 로드 -->
  <script
    src="http://localhost:8080/client.js"
    data-server-url="http://localhost:8080"
  ></script>
</head>
<body>
  <h1>My Page</h1>
  <!-- 페이지 콘텐츠 -->
</body>
</html>
```

## 세션 재생 포함

rrweb 세션 기록 활성화:

```html
<script
  src="http://localhost:8080/client.js"
  data-server-url="http://localhost:8080"
  data-enable-rrweb="true"
></script>
```

## 구성 옵션

### 서버 URL

서버 WebSocket URL 설정:

```html
<script
  src="http://localhost:8080/client.js"
  data-server-url="http://localhost:8080"
></script>
```

### 세션 재생

세션 재생 활성화 또는 비활성화:

```html
<!-- 활성화 -->
<script
  src="http://localhost:8080/client.js"
  data-server-url="http://localhost:8080"
  data-enable-rrweb="true"
></script>

<!-- 비활성화 (기본값) -->
<script
  src="http://localhost:8080/client.js"
  data-server-url="http://localhost:8080"
  data-enable-rrweb="false"
></script>
```

## 다음 단계

- 완전한 플레이그라운드는 [팝업 콘솔](/ko/examples/popup) 참조
- [Client API](/ko/api/client) 알아보기
