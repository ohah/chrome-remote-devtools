# Client Architecture

The client implements the Chrome DevTools Protocol (CDP) on the client side, allowing web pages to be debugged remotely.

## CDP Client Structure

```mermaid
graph TB
    CDP[CDP Client] --> WS[WebSocket Client]
    CDP --> PM[PostMessage Handler]
    CDP --> DM[Domain Manager]
    DM --> RT[Runtime Domain]
    DM --> PG[Page Domain]
    DM --> DOM[DOM Domain]
    DM --> NW[Network Domain]
    DM --> CN[Console Domain]
```

## Domain Implementation

The client implements multiple CDP domains:

```mermaid
graph LR
    CDP[ChromeDomain] --> D1[Runtime]
    CDP --> D2[Page]
    CDP --> D3[DOM]
    CDP --> D4[Network]
    CDP --> D5[Console]
    CDP --> D6[DOMStorage]
    CDP --> D7[Storage]
    CDP --> D8[SessionReplay]
```

## Message Flow

```mermaid
sequenceDiagram
    participant I as Inspector
    participant S as Server
    participant C as Client
    participant D as Domain

    I->>S: CDP Command
    S->>C: Forward Command
    C->>D: Execute Command
    D->>C: Return Result
    C->>S: Send Response
    S->>I: Forward Response

    D->>C: CDP Event
    C->>S: Send Event
    S->>I: Forward Event
```

## Connection Methods

The client supports two connection methods:

1. **WebSocket**: Remote debugging via server (general use case)
2. **PostMessage**: Communication via postMessage API (for local DevTools scenarios)

```mermaid
graph TB
    C[Client] --> WS[WebSocket]
    C --> PM[PostMessage]
    WS --> S[Server]
    PM --> I[Inspector Window]

    style WS fill:#e1f5ff
    style PM fill:#fff4e1
```

## Features

- **CDP Protocol Implementation**: Full client-side CDP implementation
- **Domain Support**: Multiple CDP domains (Runtime, Page, DOM, Network, etc.)
- **Event Handling**: Automatic event emission and storage
- **Dual Connection**: WebSocket and PostMessage support
- **Session Replay**: Optional rrweb integration for session recording

## Initialization

The client is initialized using the `init()` function:

```typescript
import { init } from '@ohah/chrome-remote-devtools-client';

init({
  serverUrl: 'ws://localhost:8080',
  rrweb: {
    enable: true,
  },
});
```

For vanilla JavaScript (IIFE), use the global API:

```html
<script src="./client.js"></script>
<script>
  ChromeRemoteDevTools.init({
    serverUrl: 'ws://localhost:8080',
    rrweb: {
      enable: true,
    },
  });
</script>
```
