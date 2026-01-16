# Inspector Architecture

The Inspector provides the DevTools UI for debugging web pages remotely. It can run as a web application or desktop application (using Tauri). In the desktop version, Tauri embeds the Rust server, allowing use without running a separate server.

## Inspector Structure

### Web Inspector

```mermaid
graph TB
    I[Web Inspector] --> CL[Client List]
    I --> DT[DevTools Iframe]
    I --> WS[WebSocket Connection]
    CL --> S[External Rust Server]
    DT --> WS
    WS --> S
```

### Desktop Inspector (Tauri)

```mermaid
graph TB
    I[Tauri Inspector] --> CL[Client List]
    I --> DT[DevTools Iframe]
    I --> WS[WebSocket Connection]
    I --> TC[Tauri Commands]
    CL --> ES[Embedded Rust Server]
    DT --> WS
    WS --> ES
    TC --> ES
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

### Web Inspector

```mermaid
sequenceDiagram
    participant U as User
    participant I as Web Inspector
    participant S as External Server
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

### Desktop Inspector (Tauri)

```mermaid
sequenceDiagram
    participant U as User
    participant I as Inspector UI
    participant T as Tauri
    participant ES as Embedded Server
    participant C as Client

    U->>I: Start server
    I->>T: Tauri Command (start_server)
    T->>ES: Start server
    ES->>ES: Server running
    U->>I: Select client
    I->>ES: Request client list
    ES->>I: Return clients
    I->>I: Display client list
    U->>I: Choose client
    I->>ES: Connect to client
    ES->>C: Establish connection
    I->>I: Load DevTools iframe
```

## Web and Desktop Versions

The Inspector supports both web and desktop versions:

```mermaid
graph TB
    I[Inspector] --> W[Web Version]
    I --> D[Desktop Version]
    W --> R[React + Vite]
    W --> ES[External Rust Server]
    D --> R
    D --> T[Tauri]
    D --> ES2[Embedded Rust Server]
    T --> ES2
```

## Features

- **Client Discovery**: Automatically discover and list connected clients
- **Client Selection**: Switch between different clients
- **DevTools Integration**: Full DevTools UI via iframe
- **WebSocket Communication**: Direct connection to server
- **Auto-refresh**: Automatic client list updates
- **Embedded Server** (Desktop): Tauri app embeds Rust server, no separate server needed

## Implementation

The Inspector is implemented using:

- **React**: UI framework
- **Vite**: Build tool
- **TanStack Router**: Routing
- **Tailwind CSS**: Styling
- **Tauri**: Desktop app framework (desktop version)
- **Rust Server Library**: WebSocket server embedded in Tauri

## DevTools URL Construction

The Inspector builds DevTools URLs with WebSocket configuration:

```typescript
const devtoolsUrl = buildDevToolsUrl(clientId, serverUrl);
// Result: /devtools-frontend/?ws=localhost:8080/remote/debug/devtools/devtools-{clientId}?clientId={clientId}
```

The iframe loads this URL, which initializes devtools-frontend with the WebSocket connection to the server.
