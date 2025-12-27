# Quick Start

This guide will help you get started with Chrome Remote DevTools in just a few minutes.

## Start the Development Servers

### 1. Start the WebSocket Relay Server

```bash
bun run dev:server
```

The server will start on `http://localhost:8080` by default.

### 2. Start the Inspector (Web Version)

In a new terminal:

```bash
bun run dev:inspector
```

The Inspector will be available at `http://localhost:5173` (or the port shown in the terminal).

### 3. Initialize the Client in Your Web Page

**Using npm package (ESM):**

```bash
npm install @ohah/chrome-remote-devtools-client
```

```typescript
import { init } from '@ohah/chrome-remote-devtools-client';

init({
  serverUrl: 'ws://localhost:8080',
});
```

**Using script tag (IIFE):**

```html
<script src="http://localhost:8080/client.js"></script>
<script>
  ChromeRemoteDevTools.init({
    serverUrl: 'ws://localhost:8080',
  });
</script>
```

## Your First Debugging Session

1. Open your web page with the client script loaded
2. Open the Inspector in your browser (`http://localhost:5173`)
3. Select your client from the list
4. Start debugging!

The Inspector will connect to your page and you can use all DevTools features:

- View and interact with the console
- Inspect the DOM
- Monitor network requests
- Debug JavaScript
- And much more!

## Next Steps

- Learn about the [Architecture](/architecture/overview)
- Try the [Playground](/examples/)
- Read the [API Documentation](/api/server)
