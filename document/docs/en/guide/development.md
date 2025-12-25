# Development

This guide covers the development environment setup and build process for Chrome Remote DevTools.

## Development Commands

```bash
# Unified development environment (server + Inspector web)
bun dev                     # Run server and Inspector web together

# Individual development servers
bun run dev:server          # WebSocket server only
bun run dev:inspector       # Inspector web only
bun run dev:inspector:tauri  # Inspector desktop
bun run dev:docs            # Documentation site

# Code quality
bun run lint                # Run oxlint
bun run format              # Format with oxfmt
bun run format:rust         # Format Rust code with rustfmt

# Build
bun run build               # Build all packages
```

## Building DevTools Frontend

The DevTools UI is based on a fork of Chrome DevTools frontend. To build it, you need to have [depot_tools](https://commondatastorage.googleapis.com/chrome-infra-docs/flat/depot_tools/docs/html/depot_tools_tutorial.html#_setting_up) installed.

### Prerequisites

1. **Install depot_tools**: Follow the [depot_tools setup guide](https://commondatastorage.googleapis.com/chrome-infra-docs/flat/depot_tools/docs/html/depot_tools_tutorial.html#_setting_up).

2. **Ensure depot_tools is in your PATH**: The `gclient`, `gn`, and `autoninja` commands should be available.

### Build Steps

1. **Navigate to devtools directory**:

   ```bash
   cd devtools
   ```

2. **Sync dependencies**:

   ```bash
   gclient sync
   ```

   This will download all required dependencies for devtools-frontend.

3. **Generate build configuration**:

   ```bash
   cd devtools-frontend
   gn gen out/Default
   ```

4. **Build DevTools**:

   ```bash
   autoninja -C out/Default
   ```

   Alternatively, you can use npm:

   ```bash
   npm run build
   ```

5. **Build artifacts location**:
   The built files will be in `devtools/devtools-frontend/out/Default/gen/front_end`.

### Fast Build Options

For faster iteration during development, you can skip type checking and bundling:

```bash
gn gen out/fast-build --args="devtools_skip_typecheck=true devtools_bundle=false"
autoninja -C out/fast-build
```

Or use npm with the fast-build target:

```bash
npm run build -- -t fast-build
```

### Notes

- The first build may take a while as it downloads dependencies and compiles everything.
- Subsequent builds are incremental and much faster.
- The build uses `Default` as the target by default. You can specify a different target with `-t <name>`.
- For development, you typically don't need to rebuild DevTools unless you're modifying the DevTools frontend code itself.

## Server Log Configuration

Server logs are **disabled by default** to reduce console noise. Enable them using environment variables:

```bash
# Enable all logs
LOG_ENABLED=true bun run dev:server

# Enable and filter logs by specific CDP methods
LOG_ENABLED=true LOG_METHODS=Runtime.consoleAPICalled,Network.requestWillBeSent bun run dev:server
```

**Note**: Logs are automatically disabled in production builds.

