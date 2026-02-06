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

### 연결

```typescript
import ChromeRemoteDevToolsInspector from '@ohah/chrome-remote-devtools-inspector-react-native';
import { getUniqueId } from 'react-native-device-info';

const deviceId = await getUniqueId();
ChromeRemoteDevToolsInspector.connect('localhost', 8080, { deviceId });
```

### API

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

Vanilla Redux: `import { composeWithDevTools } from '@ohah/chrome-remote-devtools-inspector-react-native/redux-devtools-extension'` 후 `createStore(reducer, composeWithDevTools(applyMiddleware(...)))`.

### 3. Zustand

```javascript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useStore = create(
  devtools((set) => ({ count: 0, increment: () => set((s) => ({ count: s.count + 1 })) }), { name: 'MyStore' })
);
```

## 요구사항

- React Native >= 0.76.0
- iOS >= 15.1
- Android (플레이스홀더)

## 라이선스

MIT
