# Runtime Domain

The Runtime domain handles JavaScript execution and evaluation.

## Methods

### Runtime.evaluate

Evaluates a JavaScript expression.

**Parameters:**

- `expression` (string): JavaScript expression to evaluate
- `returnByValue` (boolean, optional): Whether to return the value

**Returns:**

- `result`: Evaluation result (must be the **value** of the expression; e.g. `1+2` → 3, `globalThis.x != undefined` → true/false). Required for React DevTools frontend initialization when used from React Native.

### Runtime.addBinding

Registers a binding name. When the client (e.g. app) later invokes that binding, the backend sends a `Runtime.bindingCalled` event. Used by React DevTools (Fusebox) for messaging between the DevTools frontend and the React Native app.

**Parameters:**

- `name` (string): Binding name (e.g. `"react-devtools"`)

**Returns:**

- (empty on success)

### Runtime.getProperties

Returns properties of an object (by `objectId`). Used when the user expands an object in the Console. Implemented in react-native-inspector.

**Parameters:**

- `objectId` (string): Object ID (from a RemoteObject)

**Returns:**

- `result`: Array of `PropertyDescriptor` (each has `name`, `value` as RemoteObject, etc.)

### Runtime.releaseObject

Releases an object so the backend can drop its reference. DevTools calls this when an object is no longer needed. Implemented in react-native-inspector.

**Parameters:**

- `objectId` (string): Object ID to release

**Returns:**

- (empty on success)

### Runtime.enable

Enables the Runtime domain. When the frontend sends this (e.g. when DevTools connects), the backend should send `Runtime.executionContextCreated` so the frontend can associate console messages with a context. Implemented in react-native-inspector (no response body; backend sends the event).

### Runtime.callFunctionOn

Calls a function. **Not implemented in react-native-inspector.**

**Parameters:**

- `functionDeclaration` (string): Function declaration to call
- `objectId` (string, optional): Object ID to call the function on

**Returns:**

- `result`: Call result

## Events

### Runtime.consoleAPICalled

Emitted when a console API is called.

**Parameters:**

- `type`: Console message type (log, error, warn, info, debug)
- `args`: Console arguments
- `timestamp`: Timestamp

### Runtime.executionContextCreated

Emitted when a JavaScript execution context is created. The backend sends this when it receives `Runtime.enable` so the frontend can register the context before console messages arrive. Implemented in react-native-inspector.

**Parameters:**

- `context`: `{ id: number, origin: string, name?: string, auxData?: object }` — at least `id` and `origin` (e.g. `"react-native://"`).

### Runtime.bindingCalled

Emitted when the client invokes a binding previously registered with `Runtime.addBinding`. Used by React DevTools: the app calls the binding with a serialized message; the frontend receives this event and forwards it to the React DevTools UI.

**Parameters:**

- `name` (string): Binding name
- `payload` (string): Serialized message (e.g. JSON)
- `executionContextId` (number): Execution context ID

## Protocol details (wire format)

CDP messages are JSON. Commands: `{ "id": number, "method": "Domain.method", "params": object }`. Responses: `{ "id": number, "result": object }` or `{ "id": number, "error": { "code": number, "message": string } }`. Events: `{ "method": "Domain.event", "params": object }`. Full spec: [Chrome DevTools Protocol — Runtime](https://chromedevtools.github.io/devtools-protocol/tot/Runtime/).

### Runtime.evaluate

- **Request:** `{ "id": number, "method": "Runtime.evaluate", "params": { "expression": string, "returnByValue": boolean? } }`
- **Response:** `{ "id": number, "result": { "result": RemoteObject, "exceptionDetails"?: ExceptionDetails } }` or `{ "id": number, "error": { "code", "message" } }`
- **RemoteObject:** `{ "type": "string"|"number"|"boolean"|"object"|"undefined"|..., "value"?: any, "subtype"?: string, "description"?: string }`. For React Native, the backend must return the **evaluated value** (e.g. `true`/`false` for expressions like `globalThis.x != undefined`).

### Runtime.addBinding

- **Request:** `{ "id": number, "method": "Runtime.addBinding", "params": { "name": string } }`
- **Response:** `{ "id": number, "result": {} }`

### Runtime.getProperties

- **Request:** `{ "id": number, "method": "Runtime.getProperties", "params": { "objectId": string } }`
- **Response:** `{ "id": number, "result": { "result": PropertyDescriptor[] } }`. Each descriptor has `name`, `value` (RemoteObject), and optionally `configurable`, `enumerable`, `writable`, `get`, `set`.

### Runtime.releaseObject

- **Request:** `{ "id": number, "method": "Runtime.releaseObject", "params": { "objectId": string } }`
- **Response:** `{ "id": number, "result": {} }`

### Runtime.enable

- **Request:** `{ "id"?: number, "method": "Runtime.enable", "params"?: {} }` (often no `id`). Backend does not send a CDP response; it sends **Runtime.executionContextCreated** as an event so the frontend can register the context.

### Runtime.executionContextCreated (event)

- **Event:** `{ "method": "Runtime.executionContextCreated", "params": { "context": { "id": number, "origin": string, "name"?: string, "auxData"?: object } } }`. Example: `"context": { "id": 1, "origin": "react-native://" }`.

### Runtime.bindingCalled (event)

- **Event:** `{ "method": "Runtime.bindingCalled", "params": { "name": string, "payload": string, "executionContextId": number } }`
- **Payload (React DevTools):** The `payload` is a **string**. The app (or backend) must pass a JSON string of shape `{ "domain": string, "message": any }`. The DevTools frontend parses it and dispatches `message` to listeners for that `domain` (e.g. `"react-devtools"`). The inner `message` format is defined by the [React DevTools Fusebox bridge](https://github.com/facebook/react/tree/main/packages/react-devtools-fusebox); we only relay the string.

**Example (app → frontend):** App calls the binding with `JSON.stringify({ domain: 'react-devtools', message: { event: '...', payload: ... } })`. The inspector sends a CDP event `Runtime.bindingCalled` with `params.payload` equal to that string. The frontend parses it and forwards `message` to the React DevTools UI.

## React Native (react-native-inspector)

The **react-native-inspector** package implements the following Runtime commands and events so that the Inspector (Console, React DevTools Components/Profiler) can work with the app:

**Commands (frontend → backend):**

- **Runtime.enable** — Backend sends `Runtime.executionContextCreated` (no response body).
- **Runtime.evaluate** — Must return the **expression value** (not `undefined`). Required for React DevTools (e.g. polling `globalThis.__FUSEBOX_REACT_DEVTOOLS_DISPATCHER__ != undefined`).
- **Runtime.addBinding** — Registers the binding name; the app receives a global function. When the app calls it, the inspector sends **Runtime.bindingCalled**.
- **Runtime.getProperties** — Returns properties for an object (Console expand).
- **Runtime.releaseObject** — Releases an object by `objectId`.

**Events (backend → frontend):**

- **Runtime.executionContextCreated** — Sent when `Runtime.enable` is received.
- **Runtime.consoleAPICalled** — Console log/warn/error etc.
- **Runtime.bindingCalled** — App invoked a binding (React DevTools messaging).

**Not implemented:** `Runtime.callFunctionOn`.

See [React DevTools Components & Profiler](/guide/react-devtools-components-profiler) for setup and "Implementation status and fixes."
