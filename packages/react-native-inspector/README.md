# Chrome Remote DevTools React Native Inspector

Chrome Remote DevTools Inspector Plugin for React Native / React Native용 Chrome Remote DevTools Inspector 플러그인

## Installation / 설치

```bash
npm install @ohah/chrome-remote-devtools-inspector-react-native
# or
yarn add @ohah/chrome-remote-devtools-inspector-react-native
# or
bun add @ohah/chrome-remote-devtools-inspector-react-native
```

## Usage / 사용법

### Basic Usage / 기본 사용법

```typescript
import ChromeRemoteDevToolsInspector from '@ohah/chrome-remote-devtools-inspector-react-native';

// Connect to Chrome Remote DevTools server / Chrome Remote DevTools 서버에 연결
ChromeRemoteDevToolsInspector.connect('localhost', 8080)
  .then(() => {
    console.log('✅ Connected to Chrome Remote DevTools');
  })
  .catch((error) => {
    console.error('❌ Failed to connect:', error);
  });
```

### API / API

#### `connect(serverHost: string, serverPort: number): Promise<void>`

Connect to Chrome Remote DevTools server / Chrome Remote DevTools 서버에 연결

- `serverHost`: Server host (e.g., "localhost" or "192.168.1.100") / 서버 호스트 (예: "localhost" 또는 "192.168.1.100")
- `serverPort`: Server port (e.g., 8080) / 서버 포트 (예: 8080)

#### `disableDebugger(): Promise<void>`

Disable debugger / 디버거 비활성화

#### `isPackagerDisconnected(): Promise<boolean>`

Check if packager is disconnected / Packager 연결이 끊어졌는지 확인

#### `openDebugger(serverHost: string, serverPort: number, errorMessage: string): Promise<void>`

Open debugger / 디버거 열기

## TurboModule Support / TurboModule 지원

This package supports both Legacy Modules and TurboModules (New Architecture) / 이 패키지는 Legacy Module과 TurboModule (New Architecture)을 모두 지원합니다.

- **Legacy Architecture**: Uses `NativeModules` / `NativeModules` 사용
- **New Architecture**: Uses `TurboModuleRegistry` / `TurboModuleRegistry` 사용

The package automatically detects and uses the appropriate module system / 패키지는 자동으로 적절한 모듈 시스템을 감지하고 사용합니다.

## Development / 개발

### Build / 빌드

```bash
cd packages/react-native-inspector
bun install
bun run build
```

This will generate:

- `dist/index.js` (CommonJS)
- `dist/index.mjs` (ESM)
- `dist/index.d.ts` (TypeScript types)

### Testing / 테스트

```bash
cd examples/react-native
bun install
react-native run-ios
```

## Auto-initialization / 자동 초기화

This package has `sideEffects: true` in `package.json`, which means it will auto-initialize when imported. / 이 패키지는 `package.json`에 `sideEffects: true`가 설정되어 있어 import 시 자동으로 초기화됩니다.

### Redux DevTools Extension / Redux DevTools Extension

The package automatically injects `__REDUX_DEVTOOLS_EXTENSION__` via JSI (JavaScript Interface) before any JavaScript code runs. This ensures the extension is always available, similar to browser extensions. / 패키지는 JSI(JavaScript Interface)를 통해 JavaScript 코드가 실행되기 전에 `__REDUX_DEVTOOLS_EXTENSION__`을 자동으로 주입합니다. 이를 통해 브라우저 확장 프로그램과 유사하게 extension이 항상 사용 가능합니다.

**Important**: The extension is injected at the native level, so it's available immediately when your app starts. You don't need to call any setup function. / **중요**: Extension은 네이티브 레벨에서 주입되므로 앱이 시작되면 즉시 사용 가능합니다. 설정 함수를 호출할 필요가 없습니다.

The server host and port are set when you call `connect()`. / 서버 호스트와 포트는 `connect()`를 호출할 때 설정됩니다.

## Requirements / 요구사항

- React Native >= 0.83.0
- iOS >= 15.1
- Android (placeholder implementation) / Android (플레이스홀더 구현)

## License / 라이선스

MIT
