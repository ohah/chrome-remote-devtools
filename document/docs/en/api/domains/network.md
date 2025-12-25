# Network Domain

The Network domain handles network request monitoring.

## Methods

### Network.enable

Enables the Network domain.

### Network.disable

Disables the Network domain.

## Events

### Network.requestWillBeSent

Emitted before a network request is sent.

**Parameters:**

- `requestId`: Request ID
- `request`: Request information
- `timestamp`: Timestamp

### Network.responseReceived

Emitted when a network response is received.

**Parameters:**

- `requestId`: Request ID
- `response`: Response information
- `timestamp`: Timestamp

### Network.loadingFinished

Emitted when network loading is finished.

**Parameters:**

- `requestId`: Request ID
- `timestamp`: Timestamp
