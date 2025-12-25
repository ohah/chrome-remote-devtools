# Runtime Domain

The Runtime domain provides JavaScript execution and evaluation capabilities.

## Methods

### `Runtime.enable()`

Enable the Runtime domain.

### `Runtime.evaluate(expression: string)`

Evaluate a JavaScript expression in the page context.

**Parameters:**

- `expression`: JavaScript expression to evaluate

**Returns:** Evaluation result

### `Runtime.getProperties(objectId: string)`

Get properties of a JavaScript object.

**Parameters:**

- `objectId`: Object ID

**Returns:** Object properties

### `Runtime.releaseObject(objectId: string)`

Release an object reference.

**Parameters:**

- `objectId`: Object ID to release

### `Runtime.callFunctionOn(functionDeclaration: string, objectId?: string)`

Call a function on a JavaScript object.

**Parameters:**

- `functionDeclaration`: Function declaration string
- `objectId`: Optional object ID

**Returns:** Function call result

## Events

### `Runtime.executionContextCreated`

Emitted when a new execution context is created.

### `Runtime.consoleAPICalled`

Emitted when a console API is called.

### `Runtime.exceptionThrown`

Emitted when a JavaScript exception is thrown.
