# Chrome Remote DevTools React Native Inspector

Chrome Remote DevTools Inspector Plugin for React Native / React Native용 Chrome Remote DevTools Inspector 플러그인

## Installation / 설치

```bash
npm install @ohah/chrome-remote-devtools-react-native
# or
yarn add @ohah/chrome-remote-devtools-react-native
# or
bun add @ohah/chrome-remote-devtools-react-native
```

## Usage / 사용법

### Basic Usage / 기본 사용법

```typescript
import ChromeRemoteDevToolsInspector from '@ohah/chrome-remote-devtools-react-native';

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

The package automatically sets up `__REDUX_DEVTOOLS_EXTENSION__` on import with default values (localhost:8080) or from environment variables. / 패키지는 import 시 기본값(localhost:8080) 또는 환경 변수에서 값을 가져와 `__REDUX_DEVTOOLS_EXTENSION__`을 자동으로 설정합니다.

**Important**: If you need to use a different host/port, call `setupReduxDevToolsExtension()` explicitly before creating your stores. / **중요**: 다른 호스트/포트를 사용해야 하는 경우, store를 생성하기 전에 `setupReduxDevToolsExtension()`을 명시적으로 호출하세요.

```typescript
import { setupReduxDevToolsExtension } from '@ohah/chrome-remote-devtools-react-native';

// Setup with custom host/port / 커스텀 호스트/포트로 설정
setupReduxDevToolsExtension('192.168.1.100', 8080);
```

### Environment Variables / 환경 변수

You can configure the default host/port using environment variables: / 환경 변수를 사용하여 기본 호스트/포트를 설정할 수 있습니다:

- `CHROME_REMOTE_DEVTOOLS_HOST`: Server host (default: 'localhost') / 서버 호스트 (기본값: 'localhost')
- `CHROME_REMOTE_DEVTOOLS_PORT`: Server port (default: 8080) / 서버 포트 (기본값: 8080)

Or set them on the global object: / 또는 전역 객체에 설정할 수 있습니다:

```typescript
(global as any).__ChromeRemoteDevToolsServerHost = '192.168.1.100';
(global as any).__ChromeRemoteDevToolsServerPort = 8080;
```

**Note**: Auto-initialization uses default values if the extension is not already set. If you need specific host/port, always call `setupReduxDevToolsExtension()` explicitly. / **참고**: 자동 초기화는 extension이 아직 설정되지 않은 경우 기본값을 사용합니다. 특정 호스트/포트가 필요한 경우 항상 `setupReduxDevToolsExtension()`을 명시적으로 호출하세요.

## Requirements / 요구사항

- React Native >= 0.83.0
- iOS >= 15.1
- Android (placeholder implementation) / Android (플레이스홀더 구현)

## License / 라이선스

MIT
