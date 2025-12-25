# Inspector Architecture

The Inspector provides the DevTools UI for debugging web pages remotely. It can run as a web application or desktop application (using Tauri).

## Inspector Structure

```mermaid
graph TB
    I[Inspector] --> CL[Client List]
    I --> DT[DevTools Iframe]
    I --> WS[WebSocket Connection]
    CL --> S[Server API]
    DT --> WS
    WS --> S
```

## DevTools Integration

The Inspector integrates with devtools-frontend using an iframe:

```mermaid
graph LR
    I[Inspector UI] --> IF[DevTools Iframe]
    IF --> DTF[devtools-frontend]
    IF --> WS[WebSocket]
    WS --> S[Server]
```

## Client Selection Flow

```mermaid
sequenceDiagram
    participant U as User
    participant I as Inspector
    participant S as Server
    participant C as Client

    U->>I: Select client
    I->>S: Request client list
    S->>I: Return clients
    I->>I: Display client list
    U->>I: Choose client
    I->>S: Connect to client
    S->>C: Establish connection
    I->>I: Load DevTools iframe
```

## Web and Desktop Versions

The Inspector supports both web and desktop versions:

```mermaid
graph TB
    I[Inspector] --> W[Web Version]
    I --> D[Desktop Version]
    W --> R[React + Vite]
    D --> R
    D --> T[Tauri]
```

## Features

- **Client Discovery**: Automatically discover and list connected clients
- **Client Selection**: Switch between different clients
- **DevTools Integration**: Full DevTools UI via iframe
- **WebSocket Communication**: Direct connection to server
- **Auto-refresh**: Automatic client list updates

## Implementation

The Inspector is implemented using:
- **React**: UI framework
- **Vite**: Build tool
- **TanStack Router**: Routing
- **Tailwind CSS**: Styling
- **Tauri**: Desktop app framework (optional)

## DevTools URL Construction

The Inspector builds DevTools URLs with WebSocket configuration:

```typescript
const devtoolsUrl = buildDevToolsUrl(clientId, serverUrl);
// Result: /devtools-frontend/?ws=localhost:8080/remote/debug/devtools/devtools-{clientId}?clientId={clientId}
```

The iframe loads this URL, which initializes devtools-frontend with the WebSocket connection to the server.

