# Runtime Domain

JavaScript 런타임 도메인은 JavaScript 실행 및 평가를 처리합니다.

## Methods

### Runtime.evaluate

JavaScript 표현식을 평가합니다.

**Parameters:**

- `expression` (string): 평가할 JavaScript 표현식
- `returnByValue` (boolean, optional): 값을 반환할지 여부

**Returns:**

- `result`: 평가 결과. 표현식의 **값**을 반환해야 함 (예: `1+2` → 3, `globalThis.x != undefined` → true/false). React Native에서 React DevTools 초기화 시 필요.

### Runtime.addBinding

바인딩 이름을 등록합니다. 클라이언트(앱)가 나중에 해당 바인딩을 호출하면 백엔드가 `Runtime.bindingCalled` 이벤트를 보냅니다. React DevTools(Fusebox)에서 프론트엔드와 React Native 앱 간 메시징에 사용됩니다.

**Parameters:**

- `name` (string): 바인딩 이름 (예: `"react-devtools"`)

**Returns:**

- (성공 시 비움)

### Runtime.getProperties

객체의 속성을 반환합니다 (`objectId` 기준). 콘솔에서 객체를 펼칠 때 사용됩니다. react-native-inspector에서 구현됨.

**Parameters:**

- `objectId` (string): 객체 ID (RemoteObject에서 옴)

**Returns:**

- `result`: `PropertyDescriptor` 배열 (각각 `name`, `value`(RemoteObject) 등)

### Runtime.releaseObject

객체를 해제하여 백엔드가 참조를 버릴 수 있게 합니다. DevTools가 객체가 더 이상 필요 없을 때 호출합니다. react-native-inspector에서 구현됨.

**Parameters:**

- `objectId` (string): 해제할 객체 ID

**Returns:**

- (성공 시 비움)

### Runtime.enable

Runtime 도메인을 활성화합니다. 프론트엔드가 이 명령을 보내면(예: DevTools 연결 시) 백엔드는 `Runtime.executionContextCreated`를 보내 콘솔 메시지가 컨텍스트와 연결되도록 합니다. react-native-inspector에서 구현됨 (응답 본문 없음; 백엔드가 이벤트 전송).

### Runtime.callFunctionOn

함수를 호출합니다. **react-native-inspector에서는 구현되지 않음.**

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

### Runtime.executionContextCreated

JavaScript 실행 컨텍스트가 생성되었을 때 발생합니다. 백엔드는 `Runtime.enable`을 수신했을 때 이 이벤트를 보내 콘솔 메시지 도착 전에 프론트엔드가 컨텍스트를 등록할 수 있게 합니다. react-native-inspector에서 구현됨.

**Parameters:**

- `context`: `{ id: number, origin: string, name?: string, auxData?: object }` — 최소 `id`, `origin` (예: `"react-native://"`).

### Runtime.bindingCalled

`Runtime.addBinding`으로 등록한 바인딩을 클라이언트가 호출했을 때 발생합니다. React DevTools에서 사용: 앱이 직렬화된 메시지와 함께 바인딩을 호출하면, 프론트엔드가 이 이벤트를 받아 React DevTools UI로 전달합니다.

**Parameters:**

- `name` (string): 바인딩 이름
- `payload` (string): 직렬화된 메시지 (예: JSON)
- `executionContextId` (number): 실행 컨텍스트 ID

## 프로토콜 상세 (와이어 형식)

CDP 메시지는 JSON입니다. 명령: `{ "id": number, "method": "Domain.method", "params": object }`. 응답: `{ "id": number, "result": object }` 또는 `{ "id": number, "error": { "code", "message" } }`. 이벤트: `{ "method": "Domain.event", "params": object }`. 전체 스펙: [Chrome DevTools Protocol — Runtime](https://chromedevtools.github.io/devtools-protocol/tot/Runtime/).

### Runtime.evaluate

- **요청:** `{ "id": number, "method": "Runtime.evaluate", "params": { "expression": string, "returnByValue": boolean? } }`
- **응답:** `{ "id": number, "result": { "result": RemoteObject, "exceptionDetails"?: ExceptionDetails } }` 또는 `{ "id": number, "error": { "code", "message" } }`
- **RemoteObject:** `{ "type": "string"|"number"|"boolean"|"object"|"undefined"|..., "value"?: any, "subtype"?: string, "description"?: string }`. React Native 백엔드는 **평가된 값**을 반환해야 함 (예: `globalThis.x != undefined` → true/false).

### Runtime.addBinding

- **요청:** `{ "id": number, "method": "Runtime.addBinding", "params": { "name": string } }`
- **응답:** `{ "id": number, "result": {} }`

### Runtime.getProperties

- **요청:** `{ "id": number, "method": "Runtime.getProperties", "params": { "objectId": string } }`
- **응답:** `{ "id": number, "result": { "result": PropertyDescriptor[] } }`. 각 descriptor는 `name`, `value`(RemoteObject), 및 선택적 `configurable`, `enumerable`, `writable`, `get`, `set`.

### Runtime.releaseObject

- **요청:** `{ "id": number, "method": "Runtime.releaseObject", "params": { "objectId": string } }`
- **응답:** `{ "id": number, "result": {} }`

### Runtime.enable

- **요청:** `{ "id"?: number, "method": "Runtime.enable", "params"?: {} }` (종종 `id` 없음). 백엔드는 CDP 응답을 보내지 않고, 프론트엔드가 컨텍스트를 등록할 수 있도록 **Runtime.executionContextCreated** 이벤트를 보냅니다.

### Runtime.executionContextCreated (이벤트)

- **이벤트:** `{ "method": "Runtime.executionContextCreated", "params": { "context": { "id": number, "origin": string, "name"?: string, "auxData"?: object } } }`. 예: `"context": { "id": 1, "origin": "react-native://" }`.

### Runtime.bindingCalled (이벤트)

- **이벤트:** `{ "method": "Runtime.bindingCalled", "params": { "name": string, "payload": string, "executionContextId": number } }`
- **Payload (React DevTools):** `payload`는 **문자열**입니다. 앱(또는 백엔드)은 `{ "domain": string, "message": any }` 형태의 JSON 문자열을 넘겨야 합니다. DevTools 프론트엔드는 파싱 후 해당 `domain`(예: `"react-devtools"`) 리스너에게 `message`를 전달합니다. 내부 `message` 형식은 [React DevTools Fusebox bridge](https://github.com/facebook/react/tree/main/packages/react-devtools-fusebox)에서 정의하며, 우리는 문자열만 중계합니다.

**예 (앱 → 프론트엔드):** 앱이 바인딩을 `JSON.stringify({ domain: 'react-devtools', message: { event: '...', payload: ... } })`로 호출하면, inspector는 CDP 이벤트 `Runtime.bindingCalled`를 `params.payload`에 그 문자열을 넣어 전송합니다. 프론트엔드는 파싱 후 `message`를 React DevTools UI로 전달합니다.

## React Native (react-native-inspector)

**react-native-inspector** 패키지는 아래 Runtime 명령·이벤트를 구현하여 Inspector(콘솔, React DevTools Components/Profiler)가 앱과 동작할 수 있게 합니다.

**명령 (프론트엔드 → 백엔드):**

- **Runtime.enable** — 백엔드가 `Runtime.executionContextCreated` 전송 (응답 본문 없음).
- **Runtime.evaluate** — 표현식의 **값**을 반환해야 함 (undefined 아님). React DevTools(예: `globalThis.__FUSEBOX_REACT_DEVTOOLS_DISPATCHER__ != undefined` 폴링)에 필요.
- **Runtime.addBinding** — 바인딩 이름 등록; 앱이 해당 이름의 전역 함수를 받음. 앱이 호출하면 inspector가 **Runtime.bindingCalled** 전송.
- **Runtime.getProperties** — 객체 속성 반환 (콘솔 펼치기).
- **Runtime.releaseObject** — `objectId`로 객체 해제.

**이벤트 (백엔드 → 프론트엔드):**

- **Runtime.executionContextCreated** — `Runtime.enable` 수신 시 전송.
- **Runtime.consoleAPICalled** — 콘솔 log/warn/error 등.
- **Runtime.bindingCalled** — 앱이 바인딩 호출 (React DevTools 메시징).

**미구현:** `Runtime.callFunctionOn`.

설정 및 "Implementation status and fixes"는 [React DevTools Components & Profiler](/guide/react-devtools-components-profiler) 참고.
