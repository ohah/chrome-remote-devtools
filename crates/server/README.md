# Chrome Remote DevTools Server (Rust)

Chrome Remote DevTools WebSocket relay server implemented in Rust.

## Features

- WebSocket relay server for CDP messages
- HTTP API endpoints
- React Native Inspector support
- SSL/TLS support
- Configurable logging

## Usage

### As a standalone server

```bash
cargo run --bin chrome-remote-devtools-server -- --port 8080
```

### As a library (for Tauri integration)

```rust
use chrome_remote_devtools_server::{ServerHandle, ServerConfig};

let handle = ServerHandle::new();
let config = ServerConfig::default();
handle.start(config).await?;
```

## Development

```bash
# Build
cargo build

# Run
cargo run --bin chrome-remote-devtools-server

# Format
cargo fmt

# Lint
cargo clippy
```
