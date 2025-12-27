# @ohah/chrome-remote-devtools-client

Chrome Remote DevTools Protocol (CDP) client for web pages. Supports both ESM (for React/modern bundlers) and IIFE (for direct script tags).

## Installation

```bash
npm install @ohah/chrome-remote-devtools-client
```

## Usage

### React / ESM

```typescript
import { initCDPClient } from '@ohah/chrome-remote-devtools-client';

useEffect(() => {
  initCDPClient('wss://your-server.com', {
    enable: true, // Enable rrweb session recording
  });
}, []);
```

### HTML / IIFE

```html
<script src="node_modules/@ohah/chrome-remote-devtools-client/dist/index.iife.js"></script>
<script>
  ChromeRemoteDevTools.init({
    serverUrl: 'wss://your-server.com',
    rrweb: {
      enable: true, // Enable rrweb session recording
    },
  });
</script>
```

Or load from CDN (when published):

```html
<script src="https://unpkg.com/@ohah/chrome-remote-devtools-client/dist/index.iife.js"></script>
<script>
  ChromeRemoteDevTools.init({
    serverUrl: 'wss://your-server.com',
    rrweb: {
      enable: true,
    },
  });
</script>
```

## API

### `initCDPClient(serverUrl, rrwebConfig?, skipWebSocket?)`

Initialize the CDP client (ESM only).

**Parameters:**

- `serverUrl` (string) - Server WebSocket URL
- `rrwebConfig` (object, optional) - Rrweb configuration
  - `enable` (boolean) - Enable rrweb session recording
- `skipWebSocket` (boolean, optional) - Skip WebSocket connection (use postMessage only)

**Example:**

```typescript
import { initCDPClient } from '@ohah/chrome-remote-devtools-client';

await initCDPClient('wss://your-server.com', {
  enable: true,
});
```

### `ChromeRemoteDevTools.init(options)` (IIFE only)

Initialize the CDP client using the global API.

**Parameters:**

- `options` (object) - Configuration options
  - `serverUrl` (string, optional) - Server WebSocket URL
  - `rrweb` (object, optional) - Rrweb configuration
    - `enable` (boolean) - Enable rrweb session recording
  - `skipWebSocket` (boolean, optional) - Skip WebSocket connection (use postMessage only)

**Example:**

```javascript
ChromeRemoteDevTools.init({
  serverUrl: 'wss://your-server.com',
  rrweb: {
    enable: true,
  },
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

## Global API (IIFE only)

When using the IIFE build, a global `ChromeRemoteDevTools` object is available:

```javascript
// Initialize the client
ChromeRemoteDevTools.init({
  serverUrl: 'wss://your-server.com',
  rrweb: {
    enable: true,
  },
});

// Export recorded events
await ChromeRemoteDevTools.exportEvents();
```

## Build Formats

This package provides multiple build formats:

- **ESM** (`dist/index.esm.js`) - For React, Vite, Webpack, etc.
- **IIFE** (`dist/index.iife.js`) - For direct script tags
- **TypeScript types** (`dist/index.d.ts`) - Type definitions

## License

MIT
