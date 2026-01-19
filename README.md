# Chrome Remote DevTools

[한국어](README_KO.md) | [English](README.md)

A remote debugging tool that uses Chrome DevTools Protocol (CDP) to control and debug remote Chrome browsers.

## Overview

Chrome Remote DevTools enables remote debugging of web pages by implementing CDP on the client side and relaying messages through a WebSocket server. It provides a full-featured DevTools interface for debugging web applications remotely.

![Demo](images/play.gif)

## Features

- **Connection Management**: WebSocket connection to remote Chrome instances with automatic reconnection
- **Page Control**: Navigation and page information
- **Console & Logging**: Receive and display console messages, execute JavaScript
- **Network Monitoring**: Track network requests/responses, block and modify requests
- **Storage Management**: View and manage session storage, local storage, and cookies
- **Session Replay**: Record and replay user interactions and page changes
- **Offline Logging**: Capture and store logs locally for offline analysis
- **Redux DevTools**: Integrated Redux DevTools Extension with identical UI to Chrome Extension

## Architecture

### 3-Tier Structure

```
[Target Web Page] ←→ [Rust WebSocket Relay Server] ←→ [Inspector (Web/Desktop)]
    (client)                    (server)                      (inspector)
```

### Package Structure

- **chrome-remote-devtools-server** (Rust): WebSocket relay server (standalone or embedded in Tauri)
- **@ohah/chrome-remote-devtools-client**: CDP client (JavaScript, loaded in web pages)
- **@ohah/chrome-remote-devtools-inspector**: Inspector UI (React + Vite, shared for web/desktop)

### Data Storage

- **IndexedDB**: Used for offline logging and session replay data storage in the browser

## Tech Stack

- **Backend**: Rust (WebSocket server), TypeScript (client)
- **Frontend**: React + Vite, TypeScript, Tauri (for desktop app)
- **DevTools**: devtools-frontend (Google open source, forked)
- **Tools**: oxlint/oxfmt, rustfmt/clippy, mise (tool version management)

## Prerequisites

- [Bun](https://bun.sh) (latest)
- [Rust](https://www.rust-lang.org/) (stable)
- [mise](https://mise.jdx.dev/) (for tool version management)
- Git

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/ohah/chrome-remote-devtools.git
cd chrome-remote-devtools
```

### 2. Initialize the project

Run the initialization script to set up dependencies and reference repositories:

```bash
# Automatically detects OS and runs appropriate script
bun run init

# Or manually:
# Windows:
scripts\init.bat

# Linux/macOS:
bash scripts/init.sh
```

This will:

- Install Bun dependencies
- Install Rust dependencies
- Clone reference repositories (chii, chobitsu, devtools-remote-debugger, devtools-protocol, rrweb, redux-devtools)

### 3. Verify installation

```bash
# Check Bun version
bun --version

# Check Rust version
rustc --version
```

## Usage

### Development

Start the development servers:

```bash
# Start WebSocket relay server (Rust)
cargo run --bin chrome-remote-devtools-server -- --port 8080

# Start Inspector (web version)
bun run dev:inspector

# Start Inspector (desktop version with Tauri)
bun run dev:inspector:tauri

# Start documentation site
bun run dev:docs
```

### Server Log Configuration

Server logs are **disabled by default** to reduce console noise. Enable them using command-line options:

```bash
# Enable all logs
cargo run --bin chrome-remote-devtools-server -- --log-enabled

# Enable and filter logs by specific CDP methods
cargo run --bin chrome-remote-devtools-server -- --log-enabled --log-methods "Runtime.consoleAPICalled,Network.requestWillBeSent"
```

**Note**: Logs are automatically disabled in production builds. See [CONTRIBUTING.md](CONTRIBUTING.md#server-log-configuration--서버-로그-설정) for details.

### Build

Build all packages:

```bash
# Automatically detects OS
bun run build

# Or manually:
# Windows:
scripts\build.bat

# Linux/macOS:
bash scripts/build.sh
```

## Development Commands

```bash
# Development servers
cargo run --bin chrome-remote-devtools-server  # Rust WebSocket server only
bun run dev:inspector       # Inspector web only
bun run dev:inspector:tauri  # Inspector desktop
bun run dev:docs            # Documentation site

# Code quality
bun run lint                # Run oxlint
bun run format              # Format with oxfmt
bun run format:rust         # Format Rust code with rustfmt

# Build
bun run build               # Build all packages
bun run build:devtools      # Build Redux DevTools plugin and devtools-frontend
```

## Project Structure

```
chrome-remote-devtools/
├── crates/
│   └── server/          # WebSocket relay server (Rust)
├── packages/
│   ├── client/          # CDP client (for web pages)
│   └── inspector/       # Inspector UI (React + Vite, web/desktop)
├── document/            # RSPress documentation site
├── devtools/
│   └── devtools-frontend/  # DevTools frontend
└── reference/           # Reference code (gitignored)
    ├── chii/
    ├── chobitsu/
    ├── devtools-remote-debugger/
    ├── devtools-protocol/
    ├── rrweb/
    └── redux-devtools/  # Redux DevTools Extension source
```

## Communication Flow

1. Client (`client`) connects to server via WebSocket
2. Inspector connects to server via WebSocket
3. Server relays CDP messages bidirectionally (proxy role)
4. Client implements CDP protocol on the client side

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

- [Code of Conduct](CONTRIBUTING.md#code-of-conduct)
- [Development Setup](CONTRIBUTING.md#development-setup)
- [Commit Guidelines](CONTRIBUTING.md#commit-message-guidelines)

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Redux DevTools Integration

Chrome Remote DevTools includes a Redux DevTools panel that provides the same UI as the official Chrome Extension. The panel uses `@redux-devtools/app` for the UI and communicates via CDP protocol.

### Building Redux DevTools

To build the Redux DevTools plugin and devtools-frontend:

```bash
bun run build:devtools
```

This will:

1. Build the `@ohah/redux-devtools-plugin` package
2. Build devtools-frontend with the Redux panel
3. Copy the built files to `devtools/bundled/`

### Redux Panel

The Redux panel is available in the DevTools panel view. It uses:

- **ReduxExtensionBridge**: Manages CDP message buffering and forwarding to the plugin iframe
- **CDP Events**: Listens for `Redux.message` events (INIT, ACTION, STATE, etc.)
- **@redux-devtools/app**: Provides the Redux DevTools UI

### React Native Integration

For React Native apps, use the middleware from `@ohah/chrome-remote-devtools-inspector-react-native`:

```typescript
// Redux middleware
import { createReduxDevToolsMiddleware } from '@ohah/chrome-remote-devtools-inspector-react-native/redux';

const store = createStore(
  rootReducer,
  applyMiddleware(createReduxDevToolsMiddleware({ name: 'MyApp' }))
);

// Zustand middleware
import { chromeDevtools } from '@ohah/chrome-remote-devtools-inspector-react-native/zustand';

const useStore = create(
  chromeDevtools((set) => ({ ... }), { name: 'MyStore' })
);
```

Redux actions and state changes are sent as CDP messages and displayed in the Redux panel.

## References

This project is inspired by and references the following projects:

- [devtools-remote-debugger](https://github.com/Nice-PLQ/devtools-remote-debugger) - Client-side CDP implementation
- [chii](https://github.com/liriliri/chii) - Remote debugging tool using chobitsu
- [chobitsu](https://github.com/liriliri/chobitsu) - CDP protocol JavaScript implementation library
- [devtools-protocol](https://github.com/ChromeDevTools/devtools-protocol) - Official CDP definitions
- [redux-devtools](https://github.com/reduxjs/redux-devtools) - Redux DevTools Extension source code

## Screenshots

### Welcome Screen

![Welcome Screen](images/welcome.png)

### Client List

![Client List](images/list.png)

### Console Panel

![Console Panel](images/console.png)

### Network Panel

![Network Panel](images/network.png)

### Application Panel

![Application Panel](images/application.png)

### Session Replay Panel

![Session Replay Panel](images/sessionReplay.png)

## Links

- [Documentation](https://ohah.github.io/chrome-remote-devtools/)
- [Issues](https://github.com/ohah/chrome-remote-devtools/issues)
- [Discussions](https://github.com/ohah/chrome-remote-devtools/discussions)
