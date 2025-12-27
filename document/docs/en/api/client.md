# Client API

The client API allows you to initialize and interact with the CDP client in your web pages.

## Initialization

Initialize the client using the `init()` function:

```typescript
import { init } from '@ohah/chrome-remote-devtools-client';

init({
  serverUrl: 'ws://localhost:8080',
  rrweb: {
    enable: true,
    enableExportButton: true,
  },
});
```

**Options:**

- `serverUrl`: Server WebSocket URL (use `wss://` for HTTPS, `ws://` for HTTP)
- `rrweb.enable`: Enable rrweb session recording (optional, default: `false`)
- `rrweb.enableExportButton`: Show export button in the page (optional, default: `false`)
- `skipWebSocket`: Skip WebSocket connection and use postMessage only (optional, default: `false`)

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
