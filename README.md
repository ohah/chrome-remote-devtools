# Chrome Remote DevTools

A remote debugging tool that uses Chrome DevTools Protocol (CDP) to control and debug remote Chrome browsers.

## Overview

Chrome Remote DevTools enables remote debugging of web pages by implementing CDP on the client side and relaying messages through a WebSocket server. It provides a full-featured DevTools interface for debugging web applications remotely.

## Features

- **Connection Management**: WebSocket connection to remote Chrome instances with automatic reconnection
- **Page Control**: Navigation, page information, and screenshot capture
- **Console & Logging**: Receive and display console messages, execute JavaScript
- **Network Monitoring**: Track network requests/responses, block and modify requests
- **Debugging**: Set breakpoints, step debugging, inspect variables and stack traces
- **Performance Profiling**: CPU profiling, memory heap snapshots, rendering performance analysis

## Architecture

### 3-Tier Structure

```
[Target Web Page] ←→ [Bun Relay Server] ←→ [Inspector (Web/Desktop)]
    (client)            (server)              (inspector)
```

### Package Structure

- **@ohah/chrome-remote-devtools-server**: WebSocket relay server (TypeScript/Bun)
- **@ohah/chrome-remote-devtools-client**: CDP client (JavaScript, loaded in web pages)
- **@ohah/chrome-remote-devtools-inspector**: Inspector UI (React + Vite, shared for web/desktop)

## Tech Stack

- **Backend**: Bun (TypeScript runtime), WebSocket (ws package)
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
- Clone reference repositories (chii, chobitsu, devtools-remote-debugger, devtools-protocol, rrweb)

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
# Start WebSocket relay server
bun run dev:server

# Start Inspector (web version)
bun run dev:inspector

# Start Inspector (desktop version with Tauri)
bun run dev:inspector:desktop

# Start documentation site
bun run dev:docs
```

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
bun run dev:server          # WebSocket server only
bun run dev:inspector       # Inspector web only
bun run dev:inspector:desktop  # Inspector desktop
bun run dev:docs            # Documentation site

# Code quality
bun run lint                # Run oxlint
bun run format              # Format with oxfmt
bun run format:rust         # Format Rust code with rustfmt

# Build
bun run build               # Build all packages
```

## Project Structure

```
chrome-remote-devtools/
├── packages/
│   ├── server/          # WebSocket relay server
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
    └── rrweb/
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

## References

This project is inspired by and references the following projects:

- [devtools-remote-debugger](https://github.com/Nice-PLQ/devtools-remote-debugger) - Client-side CDP implementation
- [chii](https://github.com/liriliri/chii) - Remote debugging tool using chobitsu
- [chobitsu](https://github.com/liriliri/chobitsu) - CDP protocol JavaScript implementation library
- [devtools-protocol](https://github.com/ChromeDevTools/devtools-protocol) - Official CDP definitions

## Links

- [Documentation](https://github.com/ohah/chrome-remote-devtools) (coming soon)
- [Issues](https://github.com/ohah/chrome-remote-devtools/issues)
- [Discussions](https://github.com/ohah/chrome-remote-devtools/discussions)
