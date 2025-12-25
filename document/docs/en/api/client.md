# Client API

The client API allows you to initialize and interact with the CDP client in your web pages.

## Initialization

### Automatic Initialization

Load the client script with data attributes:

```html
<script
  src="http://localhost:8080/client.js"
  data-server-url="http://localhost:8080"
  data-enable-rrweb="true"
></script>
```

**Attributes:**

- `data-server-url`: Server WebSocket URL
- `data-enable-rrweb`: Enable rrweb session recording (optional)

### Manual Initialization

```typescript
import { initCDPClient } from '@ohah/chrome-remote-devtools-client';

await initCDPClient('http://localhost:8080', {
  enable: true, // Enable rrweb
});
```

## CDP Domains

The client implements the following CDP domains:

- **Runtime**: JavaScript execution and evaluation
- **Page**: Page navigation and information
- **DOM**: DOM inspection and page structure viewing
- **Network**: Network request monitoring
- **Console**: Console message handling
- **DOMStorage**: Local and session storage
- **Storage**: Storage key management
- **SessionReplay**: Session recording and replay

## Usage

Once initialized, the client automatically:

- Connects to the server via WebSocket
- Registers all CDP domains
- Handles CDP commands from inspectors
- Emits CDP events to inspectors

No additional code is required for basic usage.
