# Network Domain

The Network domain provides network request monitoring capabilities.

## Methods

### `Network.enable()`

Enable the Network domain.

### `Network.getCookies()`

Get all cookies.

**Returns:** Array of cookies

### `Network.setCookie(name: string, value: string, options?: object)`

Set a cookie.

**Parameters:**

- `name`: Cookie name
- `value`: Cookie value
- `options`: Optional cookie options

### `Network.deleteCookies(name: string, url?: string)`

Delete cookies.

**Parameters:**

- `name`: Cookie name
- `url`: Optional URL

### `Network.getResponseBody(requestId: string)`

Get the response body of a request.

**Parameters:**

- `requestId`: Request ID

**Returns:** Response body

## Events

### `Network.requestWillBeSent`

Emitted when a request is about to be sent.

### `Network.responseReceived`

Emitted when a response is received.

### `Network.loadingFinished`

Emitted when loading is finished.

### `Network.loadingFailed`

Emitted when loading fails.
