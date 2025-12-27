# Server API

The server provides HTTP endpoints and WebSocket connections for client discovery and CDP message relay.

## HTTP Endpoints

### Get All Clients (Legacy Format)

```http
GET /json
```

Returns a list of all connected clients in legacy format.

**Response:**

```json
{
  "targets": [
    {
      "id": "client-123",
      "url": "http://localhost:3000",
      "title": "My Page",
      "favicon": "data:image/png;base64,..."
    }
  ]
}
```

### Get All Clients (Detailed)

```http
GET /json/clients
```

Returns detailed information about all connected clients.

**Response:**

```json
{
  "clients": [
    {
      "id": "client-123",
      "url": "http://localhost:3000",
      "title": "My Page",
      "favicon": "data:image/png;base64,...",
      "ua": "Mozilla/5.0...",
      "time": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Get All Inspectors

```http
GET /json/inspectors
```

Returns a list of all connected inspectors.

**Response:**

```json
{
  "inspectors": [
    {
      "id": "devtools-123",
      "clientId": "client-456"
    }
  ]
}
```

### Get Specific Client

```http
GET /json/client/:id
```

Returns information about a specific client.

### Serve Client Script

```http
GET /client.js
```

Serves the built client script for embedding in web pages.

## WebSocket Protocol

### Client Connection

Clients connect to the server via WebSocket:

```
ws://localhost:8080/remote/debug/client/:id
```

### Inspector Connection

Inspectors connect to the server via WebSocket:

```
ws://localhost:8080/remote/debug/devtools/:id?clientId=:clientId
```

### Message Format

All messages use the Chrome DevTools Protocol (CDP) format:

```json
{
  "id": 1,
  "method": "Runtime.evaluate",
  "params": {
    "expression": "console.log('Hello')"
  }
}
```
