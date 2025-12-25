# Runtime Domain

JavaScript 런타임 도메인은 JavaScript 실행 및 평가를 처리합니다.

## Methods

### Runtime.evaluate

JavaScript 표현식을 평가합니다.

**Parameters:**

- `expression` (string): 평가할 JavaScript 표현식
- `returnByValue` (boolean, optional): 값을 반환할지 여부

**Returns:**

- `result`: 평가 결과

### Runtime.callFunctionOn

함수를 호출합니다.

**Parameters:**

- `functionDeclaration` (string): 호출할 함수 선언
- `objectId` (string, optional): 함수를 호출할 객체 ID

**Returns:**

- `result`: 호출 결과

## Events

### Runtime.consoleAPICalled

콘솔 API가 호출되었을 때 발생합니다.

**Parameters:**

- `type`: 콘솔 메시지 유형 (log, error, warn, info, debug)
- `args`: 콘솔 인수
- `timestamp`: 타임스탬프
