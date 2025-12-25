# Server API

서버는 클라이언트 발견 및 CDP 메시지 릴레이를 위한 HTTP 엔드포인트 및 WebSocket 연결을 제공합니다.

## HTTP 엔드포인트

### 모든 클라이언트 가져오기 (레거시 형식)

```http
GET /json
```

레거시 형식으로 연결된 모든 클라이언트 목록을 반환합니다.

**응답:**
```json
{
  "targets": [
    {
      "id": "client-123",
      "url": "http://localhost:3000",
      "title": "My Page",
      "favicon": "data:image/png;base64,..."
    }
  ]
}
```

### 모든 클라이언트 가져오기 (상세)

```http
GET /json/clients
```

연결된 모든 클라이언트에 대한 상세 정보를 반환합니다.

**응답:**
```json
{
  "clients": [
    {
      "id": "client-123",
      "url": "http://localhost:3000",
      "title": "My Page",
      "favicon": "data:image/png;base64,...",
      "ua": "Mozilla/5.0...",
      "time": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 모든 Inspector 가져오기

```http
GET /json/inspectors
```

연결된 모든 Inspector 목록을 반환합니다.

**응답:**
```json
{
  "inspectors": [
    {
      "id": "devtools-123",
      "clientId": "client-456"
    }
  ]
}
```

### 특정 클라이언트 가져오기

```http
GET /json/client/:id
```

특정 클라이언트에 대한 정보를 반환합니다.

### 클라이언트 스크립트 제공

```http
GET /client.js
```

웹페이지에 임베드할 빌드된 클라이언트 스크립트를 제공합니다.

### 테스트 페이지 제공

```http
GET /test-page.html
```

클라이언트 스크립트가 사전 로드된 테스트 페이지를 제공합니다.

## WebSocket 프로토콜

### 클라이언트 연결

클라이언트는 WebSocket을 통해 서버에 연결합니다:

```
ws://localhost:8080/remote/debug/client/:id
```

### Inspector 연결

Inspector는 WebSocket을 통해 서버에 연결합니다:

```
ws://localhost:8080/remote/debug/devtools/:id?clientId=:clientId
```

### 메시지 형식

모든 메시지는 Chrome DevTools Protocol (CDP) 형식을 사용합니다:

```json
{
  "id": 1,
  "method": "Runtime.evaluate",
  "params": {
    "expression": "console.log('Hello')"
  }
}
```
