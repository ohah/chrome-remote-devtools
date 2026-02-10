# Chrome Remote DevTools

[한국어](README_KO.md) | [English](README.md)

A remote debugging tool that uses Chrome DevTools Protocol (CDP) to control and debug remote Chrome browsers.

## Overview

Chrome Remote DevTools enables remote debugging of web pages by implementing CDP on the client side and relaying messages through a WebSocket server. It provides a full-featured DevTools interface for debugging web applications remotely.

![Demo](images/play.gif)

## React Native

**React Native 앱도 Chrome DevTools로 디버깅할 수 있습니다.**

We provide **@ohah/chrome-remote-devtools-inspector-react-native**, a plug-in that connects your React Native app to the same Inspector (Console, Network, Redux, etc.) over the relay server. No native modules for console/network—everything runs in JavaScript.

### What you get

- **Console**: `console.log` / `warn` / `error` in the DevTools Console tab, with object inspection
- **Network**: `fetch` and `XMLHttpRequest` in the Network panel
- **Redux / Zustand**: Same Redux DevTools UI as the Chrome Extension; works with Redux Toolkit and Zustand
- **MMKV / AsyncStorage**: Optional DevTools panels to view and edit storage

### Quick start (3 steps)

**1. Install the package**

```bash
npm install @ohah/chrome-remote-devtools-inspector-react-native
# or: yarn add / bun add
```

**2. In your app entry file**, import once (so Redux DevTools polyfill runs before any store):

```typescript
import '@ohah/chrome-remote-devtools-inspector-react-native';
```

**3. Wrap your app** with the provider. You need a stable `deviceId` (e.g. from `react-native-device-info`) so the Inspector can list your device.

```typescript
import { ChromeRemoteDevToolsInspectorProvider } from '@ohah/chrome-remote-devtools-inspector-react-native';
import { getUniqueId } from 'react-native-device-info';

// In your root component:
const [deviceId, setDeviceId] = useState<string | null>(null);
useEffect(() => {
  getUniqueId().then(setDeviceId).catch(() => setDeviceId('device-' + Date.now()));
}, []);

if (!deviceId) return <Loading />;

return (
  <ChromeRemoteDevToolsInspectorProvider
    serverHost="localhost"   // use your PC IP if on a physical device
    serverPort={8080}
    deviceId={deviceId}
  >
    {/* Your app */}
  </ChromeRemoteDevToolsInspectorProvider>
);
```

**4. Run the relay server and Inspector**

```bash
# Terminal 1: relay server
cargo run --bin chrome-remote-devtools-server -- --port 8080

# Terminal 2: Inspector (web or desktop)
bun run dev:inspector
# or: bun run dev:inspector:tauri
```

Then open the Inspector in the browser (or Tauri app), start your RN app, and your device will appear in the client list. Click it to open DevTools (Console, Network, Redux, etc.).

### Tips

- **iOS Simulator**: `serverHost="localhost"` is fine.
- **Android Emulator**: run `adb reverse tcp:8080 tcp:8080`, then use `localhost`.
- **Physical device**: set `serverHost` to your computer’s LAN IP (e.g. `192.168.1.100`).
- **Console tab empty?** In DevTools Console, open the context dropdown and uncheck “Selected context only”, or choose the “React Native” context.

### Redux / Zustand

Add the Metro config and use `devTools: true` (Redux Toolkit) or `devtools()` (Zustand). See the [React Native Inspector README](packages/react-native-inspector/README.md) for Metro snippet and examples.

### Full docs and example

- **Package README**: [packages/react-native-inspector/README.md](packages/react-native-inspector/README.md) (installation, Provider, MMKV, AsyncStorage, Metro, Redux/Zustand)
- **Example app**: [examples/react-native](examples/react-native) (full setup in this repo)

**Requirements**: React Native >= 0.76.0, iOS >= 15.1.

### React Native screenshots

| Welcome                                     | Console                                     | Network                                     |
| ------------------------------------------- | ------------------------------------------- | ------------------------------------------- |
| ![Welcome](images/react-native/welcome.png) | ![Console](images/react-native/console.png) | ![Network](images/react-native/network.png) |

| Redux                                   | MMKV                                  | AsyncStorage                                          |
| --------------------------------------- | ------------------------------------- | ----------------------------------------------------- |
| ![Redux](images/react-native/redux.png) | ![MMKV](images/react-native/mmkv.png) | ![AsyncStorage](images/react-native/asyncStorage.png) |

| Components                                        | Performance                                         | Profiler                                      | Source                                    |
| ------------------------------------------------- | --------------------------------------------------- | --------------------------------------------- | ----------------------------------------- |
| ![Components](images/react-native/components.png) | ![Performance](images/react-native/performance.png) | ![Profiler](images/react-native/profiler.png) | ![Source](images/react-native/source.png) |

---

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
- **@ohah/chrome-remote-devtools-inspector-react-native**: React Native plug-in (Console, Network, Redux, MMKV, AsyncStorage via CDP; JavaScript-only hooks)

### Data Storage

- **IndexedDB**: Used for offline logging and session replay data storage in the browser

## Usage

1. **Start the relay server** (default port 8080):

   ```bash
   cargo run --bin chrome-remote-devtools-server -- --port 8080
   ```

2. **Start the Inspector** (web or desktop):

   ```bash
   bun run dev:inspector        # web
   bun run dev:inspector:tauri  # desktop (Tauri)
   ```

3. **Connect your client**:
   - **Web**: Load the client script in your page (e.g. `<script src="http://localhost:8080/client.js" data-server-url="http://localhost:8080"></script>`), then open the Inspector in the browser and select the client.
   - **React Native**: Use the [React Native](#react-native) setup above (Provider + server + Inspector).

For building from source, development setup, and all commands, see [CONTRIBUTING.md](CONTRIBUTING.md).

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

Chrome Remote DevTools includes a Redux DevTools panel that provides the same UI as the official Chrome Extension. The panel uses `@redux-devtools/app` for the UI and communicates via CDP protocol. To build the Redux DevTools plugin and devtools-frontend, see [CONTRIBUTING.md](CONTRIBUTING.md#development-commands-reference) (`bun run build:devtools`).

### Redux Panel

The Redux panel is available in the DevTools panel view. It uses:

- **ReduxExtensionBridge**: Manages CDP message buffering and forwarding to the plugin iframe
- **CDP Events**: Listens for `Redux.message` events (INIT, ACTION, STATE, etc.)
- **@redux-devtools/app**: Provides the Redux DevTools UI

### React Native

For React Native, use the same Redux DevTools UI via **@ohah/chrome-remote-devtools-inspector-react-native**: set up the [Metro config and Provider](packages/react-native-inspector/README.md), then use `devTools: true` (Redux Toolkit) or `devtools()` (Zustand). See the [React Native](#react-native) section above for a full quick start.

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

### React Native - Welcome

![React Native Welcome](images/react-native/welcome.png)

### React Native - Console

![React Native Console](images/react-native/console.png)

### React Native - Network

![React Native Network](images/react-native/network.png)

### React Native - Redux

![React Native Redux](images/react-native/redux.png)

## Links

- [Documentation](https://ohah.github.io/chrome-remote-devtools/)
- [Issues](https://github.com/ohah/chrome-remote-devtools/issues)
- [Discussions](https://github.com/ohah/chrome-remote-devtools/discussions)
