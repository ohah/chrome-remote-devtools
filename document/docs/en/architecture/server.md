# Server Architecture

The server acts as a WebSocket relay between clients and inspectors, routing CDP messages bidirectionally.

## WebSocket Relay Server

```mermaid
graph LR
    C1[Client 1] -->|WebSocket| WS[WebSocket Server]
    C2[Client 2] -->|WebSocket| WS
    WS --> RM[Message Router]
    RM -->|WebSocket| I1[Inspector 1]
    RM -->|WebSocket| I2[Inspector 2]
```

## Connection Management

```mermaid
stateDiagram-v2
    [*] --> Disconnected
    Disconnected --> Connecting: Client connects
    Connecting --> Connected: WebSocket established
    Connected --> Disconnected: Connection closed
    Connected --> Connected: Message relay
```

## Message Routing

The server routes messages based on the connection type:

1. **Client to Inspector**: When a client sends a CDP event or response, the server forwards it to all connected inspectors that have selected that client.

2. **Inspector to Client**: When an inspector sends a CDP command, the server forwards it to the selected client.

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    participant I1 as Inspector 1
    participant I2 as Inspector 2

    C->>S: CDP Event
    S->>I1: Forward to selected inspector
    S->>I2: Forward to selected inspector

    I1->>S: CDP Command
    S->>C: Forward to client
    C->>S: CDP Response
    S->>I1: Forward response
```

## HTTP Endpoints

The server provides HTTP endpoints for client discovery:

- `GET /json` - Get all clients (legacy format)
- `GET /json/clients` - Get all clients with details
- `GET /json/inspectors` - Get all inspectors
- `GET /json/client/:id` - Get specific client
- `GET /client.js` - Serve built client script

## Features

- **Multiple Client Support**: Handle multiple client connections simultaneously
- **Multiple Inspector Support**: Support multiple inspectors connecting to the same or different clients
- **Client Switching**: Inspectors can switch between different clients
- **Message Relay**: Bidirectional message routing between clients and inspectors
- **Connection State Management**: Track and manage connection states

## Implementation

The server is implemented using:

- **Bun**: TypeScript runtime
- **ws**: WebSocket library
- **HTTP Server**: For serving static files and API endpoints
