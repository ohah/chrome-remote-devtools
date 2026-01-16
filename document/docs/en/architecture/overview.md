# Architecture Overview

Chrome Remote DevTools uses a 3-tier architecture to enable remote debugging of web pages.

## 3-Tier Structure

```mermaid
graph TB
    subgraph Client["Client (Web Page)"]
        C[CDP Client]
    end

    subgraph Server["Rust WebSocket Server"]
        WS[WebSocket Server]
        RM[Message Router]
        HTTP[HTTP API]
    end

    subgraph Inspector["Inspector"]
        IW[Web Inspector]
        subgraph Desktop["Desktop Inspector (Tauri)"]
            ID[Tauri App]
            ES[Embedded Server]
        end
    end

    C <-->|WebSocket| WS
    WS <--> RM
    RM <-->|WebSocket| IW
    RM <-->|WebSocket| ID
    ID <-->|Tauri Commands| ES
    ES <-->|Internal| WS
    HTTP <--> IW
    HTTP <--> ID
```

## Communication Flow

### Web Inspector

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Rust Server
    participant I as Web Inspector

    C->>S: Connect via WebSocket
    I->>S: Connect via WebSocket
    S->>I: Notify client connected
    I->>S: Select client
    I->>S: Send CDP command
    S->>C: Forward CDP command
    C->>S: Send CDP response/event
    S->>I: Forward CDP response/event
```

### Desktop Inspector (Tauri)

```mermaid
sequenceDiagram
    participant C as Client
    participant T as Tauri App
    participant ES as Embedded Server
    participant I as Inspector UI

    C->>ES: Connect via WebSocket
    I->>T: Tauri Command
    T->>ES: Start/Control Server
    ES->>I: Notify client connected
    I->>ES: Select client via WebSocket
    I->>ES: Send CDP command
    ES->>C: Forward CDP command
    C->>ES: Send CDP response/event
    ES->>I: Forward CDP response/event
```

## Package Structure

- **chrome-remote-devtools-server** (Rust): WebSocket relay server (standalone or embedded in Tauri)
- **@ohah/chrome-remote-devtools-client**: CDP client (JavaScript, loaded in web pages)
- **@ohah/chrome-remote-devtools-inspector**: Inspector UI (React + Vite, shared for web/desktop)
- **src-tauri** (Rust): Tauri desktop app (with embedded server)

## Data Storage

- **IndexedDB**: Used for offline logging and session replay data storage in the browser

## Key Components

### Client

The client implements CDP protocol on the client side, allowing web pages to be debugged remotely. It connects to the server via WebSocket and handles CDP commands and events.

### Server

The server is a Rust-implemented WebSocket relay server. It acts as a relay between clients and inspectors, managing WebSocket connections and routing CDP messages bidirectionally. It can run as a standalone server or be embedded in a Tauri desktop app.

### Inspector

The Inspector provides the DevTools UI for debugging. It can run as a web application or desktop application (using Tauri). In the desktop version, Tauri embeds the Rust server, allowing use without running a separate server.

## Next Steps

- Learn about the [Server Architecture](/architecture/server)
- Understand the [Client Implementation](/architecture/client)
- Explore the [Inspector UI](/architecture/inspector)
