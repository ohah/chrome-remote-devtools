# Chrome Remote DevTools React Native Inspector

**English:** [README.md](./README.md)

## 설치

```bash
npm install @ohah/chrome-remote-devtools-inspector-react-native
# 또는
yarn add @ohah/chrome-remote-devtools-inspector-react-native
# 또는
bun add @ohah/chrome-remote-devtools-inspector-react-native
```

## 사용법

### 1. 앱 진입 시 import (Redux DevTools 자동 초기화)

스토어 생성 전에 Redux DevTools Extension polyfill이 실행되도록 앱 진입부에서 패키지를 import 합니다.

```typescript
import '@ohah/chrome-remote-devtools-inspector-react-native';
```

### 2. Provider와 deviceId

앱을 `ChromeRemoteDevToolsInspectorProvider`로 감싸고, Inspector 기기 목록용으로 안정적인 `deviceId`(예: `react-native-device-info`)를 넘깁니다.

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
    registerMMKVDevTools({ default: myMMKVStorage }); // 선택
  }, []);

  useEffect(() => {
    registerAsyncStorageDevTools(AsyncStorage as unknown as AsyncStorageType); // 선택
  }, []);

  if (deviceId === null) return <Loading />;

  return (
    <ChromeRemoteDevToolsInspectorProvider
      serverHost="localhost"
      serverPort={8080}
      deviceId={deviceId}
    >
      {/* 앱 (Redux Provider, 네비게이션 등) */}
    </ChromeRemoteDevToolsInspectorProvider>
  );
}
```

### 3. 명령형 API (선택)

- `connect(serverHost, serverPort, { deviceId })` — `deviceId` 필수
- `disableDebugger()`
- `isPackagerDisconnected()`
- `openDebugger(serverHost, serverPort, errorMessage)`

### 실행 대상별 localhost

| 대상                   | 방법                                           |
| ---------------------- | ---------------------------------------------- |
| iOS Simulator          | `localhost` 사용                               |
| Android Emulator / USB | `adb reverse tcp:8080 tcp:8080` 후 `localhost` |
| 실기 (Wi‑Fi)           | `serverHost="192.168.1.100"` (PC LAN IP)       |

### Console 탭이 비어 있을 때

Console 탭 → 컨텍스트 드롭다운 → "Selected context only" 해제; 또는 "React Native" 컨텍스트 선택.

## Redux / Zustand

### 1. Metro 설정 (`metro.config.js`)

```javascript
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { withChromeRemoteDevToolsRedux } = require('@ohah/chrome-remote-devtools-inspector-react-native/metro');

const config = mergeConfig(getDefaultConfig(__dirname), { /* 기존 옵션 */ });
module.exports = withChromeRemoteDevToolsRedux(config);
```

### 2. Redux

```javascript
import { configureStore } from '@reduxjs/toolkit';
import rootReducer from './reducers';

const store = configureStore({ reducer: rootReducer, devTools: true });
```

Vanilla Redux: `import { composeWithDevTools } from '@ohah/chrome-remote-devtools-inspector-react-native'` 후 `createStore(reducer, composeWithDevTools(applyMiddleware(...)))`.

### 3. Zustand

```javascript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useStore = create(
  devtools((set) => ({ count: 0, increment: () => set((s) => ({ count: s.count + 1 })) }), { name: 'MyStore' })
);
```

전체 예제 앱(Provider, MMKV, AsyncStorage, Redux, Metro)은 이 레포의 [examples/react-native](https://github.com/ohah/chrome-remote-devtools/tree/main/examples/react-native)에 있습니다.

## 요구사항

- React Native >= 0.76.0
- iOS >= 15.1
- Android (플레이스홀더)

## 라이선스

MIT
