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
import { getUniqueId } from 'react-native-device-info';

// Connect to Chrome Remote DevTools server (deviceId required for Inspector list) / Chrome Remote DevTools 서버에 연결 (Inspector 목록용 deviceId 필수)
const deviceId = await getUniqueId();
ChromeRemoteDevToolsInspector.connect('localhost', 8080, { deviceId })
  .then(() => {
    console.log('✅ Connected to Chrome Remote DevTools');
  })
  .catch((error) => {
    console.error('❌ Failed to connect:', error);
  });
```

### API / API

#### `connect(serverHost: string, serverPort: number, options: ConnectOptions): Promise<void>`

Connect to Chrome Remote DevTools server / Chrome Remote DevTools 서버에 연결

- `serverHost`: Server host (e.g., "localhost" or "192.168.1.100") / 서버 호스트 (예: "localhost" 또는 "192.168.1.100")
- `serverPort`: Server port (e.g., 8080) / 서버 포트 (예: 8080)
- `options.deviceId`: **Required** device identifier shown in the Inspector connection list. For a **stable ID across app reloads**, pass a persistent value (e.g. from [react-native-device-info](https://www.npmjs.com/package/react-native-device-info) `getUniqueId()`). / **필수** Inspector 연결 목록에 표시되는 기기 식별자. **앱 리로드 후에도 동일 ID**를 쓰려면 [react-native-device-info](https://www.npmjs.com/package/react-native-device-info)의 `getUniqueId()` 등으로 얻은 값을 넘기면 됩니다.

#### `disableDebugger(): Promise<void>`

Disable debugger / 디버거 비활성화

#### `isPackagerDisconnected(): Promise<boolean>`

Check if packager is disconnected / Packager 연결이 끊어졌는지 확인

#### `openDebugger(serverHost: string, serverPort: number, errorMessage: string): Promise<void>`

Open debugger / 디버거 열기

## Troubleshooting: Connection fails with "localhost" / 연결 문제: localhost로 연결 실패

**Why "Connection attempt 1/3 failed" and then "Connected to server"?**
**왜 "Connection attempt 1/3 failed" 후 "Connected to server"가 뜨나요?**

Previously, `connect()` resolved even when all retries failed, so the Provider showed "Connected" incorrectly. This is now fixed: `connect()` **rejects** when all retries fail, so you will see the real error in `.catch()` and no false "Connected to server". / 이전에는 재시도가 모두 실패해도 `connect()`가 resolve되어 Provider가 잘못 "연결됨"으로 표시했습니다. 이제 수정되었습니다: 재시도가 모두 실패하면 `connect()`가 **reject**되므로 `.catch()`에서 실제 에러를 보게 되고, 잘못된 "Connected to server"는 표시되지 않습니다.

**Recommended: use `adb reverse` (same as Reactotron) / 권장: adb reverse 사용 (Reactotron과 동일)**

On Android emulator or device (USB), you can keep using **localhost** in the app by port-forwarding once (Android 5.x+): / Android 에뮬레이터 또는 USB 연결 기기에서는 포트 포워딩을 한 번 설정하면 앱에서 **localhost**를 그대로 쓸 수 있습니다 (Android 5.x+):

```bash
adb reverse tcp:8080 tcp:8080
```

Then reload the app. The app's `localhost:8080` will reach the host PC's port 8080. No need to change `serverHost` in code. / 그 다음 앱을 다시 로드하세요. 앱의 `localhost:8080`이 호스트 PC의 8080 포트로 연결됩니다. 코드에서 `serverHost`를 바꿀 필요 없습니다.

| Run target / 실행 대상              | How to use localhost / localhost 사용 방법                                                                                        |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **iOS Simulator**                   | Use `localhost` as-is (same machine as server). / 그대로 `localhost` 사용 (서버와 같은 Mac).                                      |
| **Android Emulator / USB device**   | Run `adb reverse tcp:8080 tcp:8080` once, then use `localhost`. / `adb reverse tcp:8080 tcp:8080` 한 번 실행 후 `localhost` 사용. |
| **Physical device (Wi‑Fi, no adb)** | Use PC's LAN IP (e.g. `serverHost="192.168.1.100"`). / PC의 LAN IP 사용 (예: `serverHost="192.168.1.100"`).                       |

**Stable device ID across reloads / 리로드 후에도 동일 device ID**

`deviceId` is **required** and is shown in the Tauri/Inspector connection list. To keep the **same device** label across reloads, pass a stable identifier. Installing [react-native-device-info](https://www.npmjs.com/package/react-native-device-info) and passing `getUniqueId()` is recommended: / `deviceId`는 **필수**이며 Tauri/Inspector 연결 목록에 표시됩니다. 리로드 후에도 **같은 기기**로 보이게 하려면 안정적인 식별자를 넘기세요. [react-native-device-info](https://www.npmjs.com/package/react-native-device-info)를 설치해 `getUniqueId()`를 넘기는 것을 권장합니다:

- **Programmatic**: `import { getUniqueId } from 'react-native-device-info';` then `connect(host, port, { deviceId: await getUniqueId() })`
- **Provider**: `<ChromeRemoteDevToolsInspectorProvider serverHost="localhost" serverPort={8080} deviceId={deviceId} />` (e.g. `deviceId` from `getUniqueId()`)

**Page.getResourceTree and Console init / Page.getResourceTree와 콘솔 초기화**

DevTools sends **Page.getResourceTree** once when it connects (ResourceTreeModel creation). The client must respond with a CDP result `{ id, result: { frameTree } }` so that DevTools fires CachedResourcesLoaded and initializes the Console immediately. This package responds automatically with a minimal frame tree (`react-native://`). If the client does not respond, DevTools still initializes the Console after a 2-second fallback (see devtools-frontend ConsoleModel). / DevTools는 연결 시 **Page.getResourceTree**를 한 번 보냅니다(ResourceTreeModel 생성). 클라이언트는 CDP 결과 `{ id, result: { frameTree } }`로 응답해야 DevTools가 CachedResourcesLoaded를 발생시키고 콘솔을 즉시 초기화합니다. 이 패키지는 최소 프레임 트리(`react-native://`)로 자동 응답합니다. 응답하지 않으면 DevTools는 2초 폴백 후에 콘솔을 초기화합니다(devtools-frontend ConsoleModel 참고).

**Console empty in Inspector / Inspector에서 콘솔이 비어 있을 때**

If `Runtime.consoleAPICalled` events appear in Network > Messages or server logs but the Console tab is empty: / Network > Messages나 서버 로그에는 `Runtime.consoleAPICalled`가 보이는데 Console 탭이 비어 있으면:

1. In the Console tab, open the **context dropdown** (e.g. "React Native ▼") and **uncheck "Selected context only"** so messages from all execution contexts are shown. / Console 탭에서 **컨텍스트 드롭다운**(예: "React Native ▼")을 열고 **"Selected context only"를 끄면** 모든 실행 컨텍스트의 메시지가 표시됩니다.
2. Or select the **"React Native"** execution context from that dropdown if it is listed. / 또는 해당 드롭다운에서 **"React Native"** 실행 컨텍스트를 선택하세요.

**Alternative without adb reverse / adb reverse 없이 사용**

If you prefer not to use adb reverse: on Android use `serverHost="10.0.2.2"` (emulator only; for physical device use PC IP). / adb reverse를 쓰지 않으려면: Android에서는 `serverHost="10.0.2.2"` 사용 (에뮬 전용; 실기는 PC IP).

Ensure the server is bound to `0.0.0.0` (not only `127.0.0.1`) so that the emulator/device can reach it. The Tauri/standalone server uses `0.0.0.0` by default. / 에뮬레이터/기기가 접근할 수 있도록 서버가 `0.0.0.0`(또는 해당 인터페이스)에 바인딩되어 있는지 확인하세요. Tauri/독립 실행형 서버는 기본적으로 `0.0.0.0`을 사용합니다.

## JS-only (no native build) / JS 전용 (네이티브 빌드 없음)

Console and network hooks run in JavaScript only; the main flow uses a JS WebSocket. Native code is in `android.disabled/`, `ios.disabled/`, and `*.podspec.disabled` so **autolinking does not pick it up** — no Kotlin/Swift is built for this package. / 콘솔·네트워크 훅은 JavaScript만 사용하며, 메인 흐름은 JS WebSocket을 사용합니다. 네이티브 코드는 `android.disabled/`, `ios.disabled/`, `*.podspec.disabled`에 있어 **autolinking에서 제외**되며, 이 패키지에 대한 Kotlin/Swift 빌드는 수행되지 않습니다.

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
