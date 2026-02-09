# Chrome Remote DevTools React Native Inspector

**한국어:** [README_KO.md](./README_KO.md)

## Installation

```bash
npm install @ohah/chrome-remote-devtools-inspector-react-native
# or
yarn add @ohah/chrome-remote-devtools-inspector-react-native
# or
bun add @ohah/chrome-remote-devtools-inspector-react-native
```

## Usage

### 1. Early import (Redux DevTools auto-init)

Import the package at app entry so the Redux DevTools Extension polyfill runs before any store is created.

```typescript
import '@ohah/chrome-remote-devtools-inspector-react-native';
```

### 2. Provider and device ID

Wrap your app with `ChromeRemoteDevToolsInspectorProvider`. A stable `deviceId` (e.g. from `react-native-device-info`) is required so the Inspector can list devices.

```typescript
import React, { useEffect, useState } from 'react';
import {
  ChromeRemoteDevToolsInspectorProvider,
  registerMMKVDevTools,
  registerAsyncStorageDevTools,
  type AsyncStorageType,
} from '@ohah/chrome-remote-devtools-inspector-react-native';
import { getUniqueId } from 'react-native-device-info';
import AsyncStorage from '@react-native-async-storage/async-storage';

function App() {
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    getUniqueId().then(setDeviceId).catch(() => setDeviceId('demo-' + Date.now()));
  }, []);

  useEffect(() => {
    registerMMKVDevTools({ default: myMMKVStorage }); // optional
  }, []);

  useEffect(() => {
    registerAsyncStorageDevTools(AsyncStorage as unknown as AsyncStorageType); // optional
  }, []);

  if (deviceId === null) return <Loading />;

  return (
    <ChromeRemoteDevToolsInspectorProvider
      serverHost="localhost"
      serverPort={8080}
      deviceId={deviceId}
    >
      {/* Your app (e.g. Redux Provider, navigation) */}
    </ChromeRemoteDevToolsInspectorProvider>
  );
}
```

### 3. Imperative API (optional)

- `connect(serverHost, serverPort, { deviceId })` — `deviceId` required
- `disableDebugger()`
- `isPackagerDisconnected()`
- `openDebugger(serverHost, serverPort, errorMessage)`

### localhost by target

| Target                  | Action                                           |
| ----------------------- | ------------------------------------------------ |
| iOS Simulator           | Use `localhost`                                  |
| Android Emulator / USB  | `adb reverse tcp:8080 tcp:8080` then `localhost` |
| Physical device (Wi‑Fi) | `serverHost="192.168.1.100"` (PC LAN IP)         |

### Console tab empty

Console tab → context dropdown → uncheck "Selected context only"; or select "React Native" context.

## Redux / Zustand

### 1. Metro config (`metro.config.js`)

```javascript
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { withChromeRemoteDevToolsRedux } = require('@ohah/chrome-remote-devtools-inspector-react-native/metro');

const config = mergeConfig(getDefaultConfig(__dirname), { /* your options */ });
module.exports = withChromeRemoteDevToolsRedux(config);
```

### 2. Redux

```javascript
import { configureStore } from '@reduxjs/toolkit';
import rootReducer from './reducers';

const store = configureStore({ reducer: rootReducer, devTools: true });
```

Vanilla Redux: `import { composeWithDevTools } from '@ohah/chrome-remote-devtools-inspector-react-native'` then `createStore(reducer, composeWithDevTools(applyMiddleware(...)))`.

### 3. Zustand

```javascript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useStore = create(
  devtools((set) => ({ count: 0, increment: () => set((s) => ({ count: s.count + 1 })) }), { name: 'MyStore' })
);
```

A full example app (Provider, MMKV, AsyncStorage, Redux, Metro) is in this repo: [examples/react-native](https://github.com/ohah/chrome-remote-devtools/tree/main/examples/react-native).

## Requirements

- React Native >= 0.76.0
- iOS >= 15.1
- Android (placeholder)

## License

MIT
