# Network Domain

네트워크 도메인은 네트워크 요청 모니터링을 처리합니다.

## Methods

### Network.enable

네트워크 도메인을 활성화합니다.

### Network.disable

네트워크 도메인을 비활성화합니다.

## Events

### Network.requestWillBeSent

네트워크 요청이 전송되기 전에 발생합니다.

**Parameters:**
- `requestId`: 요청 ID
- `request`: 요청 정보
- `timestamp`: 타임스탬프

### Network.responseReceived

네트워크 응답을 받았을 때 발생합니다.

**Parameters:**
- `requestId`: 요청 ID
- `response`: 응답 정보
- `timestamp`: 타임스탬프

### Network.loadingFinished

네트워크 로딩이 완료되었을 때 발생합니다.

**Parameters:**
- `requestId`: 요청 ID
- `timestamp`: 타임스탬프
