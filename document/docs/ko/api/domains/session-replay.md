# SessionReplay Domain

SessionReplay 도메인은 rrweb을 사용하여 사용자 상호작용을 기록하고 재생합니다.

## Methods

### SessionReplay.enable

SessionReplay 도메인을 활성화하고 저장된 이벤트를 자동으로 재생합니다.

**Returns:**

- `success`: 작업 성공 여부

### SessionReplay.disable

SessionReplay 도메인을 비활성화합니다.

**Returns:**

- `success`: 작업 성공 여부

### SessionReplay.sendEvent

rrweb 이벤트를 CDP 이벤트로 전송합니다.

**Parameters:**

- `events` (array, optional): 전송할 rrweb 이벤트 배열

**Returns:**

- `success`: 작업 성공 여부

### SessionReplay.replayStoredEvents

IndexedDB에서 저장된 SessionReplay 이벤트를 재생합니다.

**Returns:**

- `success`: 작업 성공 여부
- `count` (number, optional): 재생된 이벤트 수

## Events

### SessionReplay.eventRecorded

rrweb 이벤트가 기록되었을 때 발생합니다.

**Parameters:**

- `events`: rrweb 이벤트 배열
