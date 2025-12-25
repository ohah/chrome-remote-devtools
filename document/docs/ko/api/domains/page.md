# Page Domain

페이지 도메인은 페이지 네비게이션 및 생명주기를 처리합니다.

## Methods

### Page.enable

페이지 도메인을 활성화합니다.

### Page.disable

페이지 도메인을 비활성화합니다.

### Page.getResourceTree

페이지 리소스 트리를 가져옵니다.

**Returns:**

- `frameTree`: 프레임 트리 구조

## Events

### Page.loadEventFired

페이지 로드 이벤트가 발생했을 때 발생합니다.

**Parameters:**

- `timestamp`: 타임스탬프

### Page.domContentEventFired

DOM 콘텐츠 이벤트가 발생했을 때 발생합니다.

**Parameters:**

- `timestamp`: 타임스탬프

### Page.frameNavigated

프레임이 네비게이션되었을 때 발생합니다.

**Parameters:**

- `frame`: 프레임 정보
