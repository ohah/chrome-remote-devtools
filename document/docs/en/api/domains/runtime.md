# Runtime Domain

The Runtime domain handles JavaScript execution and evaluation.

## Methods

### Runtime.evaluate

Evaluates a JavaScript expression.

**Parameters:**

- `expression` (string): JavaScript expression to evaluate
- `returnByValue` (boolean, optional): Whether to return the value

**Returns:**

- `result`: Evaluation result

### Runtime.callFunctionOn

Calls a function.

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
