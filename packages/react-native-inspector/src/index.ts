// Chrome Remote DevTools React Native Inspector Plugin
// Chrome Remote DevTools React Native Inspector 플러그인
// This package provides native Inspector integration via TurboModule
// TurboModule을 통해 네이티브 Inspector 통합을 제공합니다

import { NativeModules, TurboModuleRegistry } from 'react-native';
import type { Spec } from './NativeChromeRemoteDevToolsInspector';
import { sendCDPMessage } from './cdp-message';
import { setServerInfo } from './server-info';

// Try to get TurboModule first (New Architecture), fallback to Legacy Module / TurboModule을 먼저 시도 (New Architecture), Legacy Module로 폴백
const TurboModule = TurboModuleRegistry.get<Spec>('ChromeRemoteDevToolsInspector');
const LegacyModule = NativeModules.ChromeRemoteDevToolsInspector;
const ChromeRemoteDevToolsInspector = TurboModule || LegacyModule;

// Debug: Log module availability / 디버그: 모듈 사용 가능성 로그
if (__DEV__) {
  console.log(
    '[ChromeRemoteDevToolsInspector] TurboModule:',
    TurboModule ? '✅ Available' : '❌ Not available'
  );
  console.log(
    '[ChromeRemoteDevToolsInspector] LegacyModule:',
    LegacyModule ? '✅ Available' : '❌ Not available'
  );
  console.log(
    '[ChromeRemoteDevToolsInspector] Using:',
    TurboModule ? 'TurboModule' : LegacyModule ? 'LegacyModule' : 'None'
  );
}

// Note: Console message interception is handled at native level (RCTSetLogFunction) and JSI level (C++ console hook) / 참고: 콘솔 메시지 가로채기는 네이티브 레벨(RCTSetLogFunction)과 JSI 레벨(C++ console 훅)에서 처리됩니다

/**
 * Connect to Chrome Remote DevTools server / Chrome Remote DevTools 서버에 연결
 * @param serverHost Server host (e.g., "localhost" or "192.168.1.100") / 서버 호스트 (예: "localhost" 또는 "192.168.1.100")
 * @param serverPort Server port (e.g., 8080) / 서버 포트 (예: 8080)
 * @returns Promise that resolves when connection is established / 연결이 설정되면 resolve되는 Promise
 */
export async function connect(serverHostParam: string, serverPortParam: number): Promise<void> {
  if (!ChromeRemoteDevToolsInspector) {
    throw new Error(
      'ChromeRemoteDevToolsInspector native module is not available / ChromeRemoteDevToolsInspector 네이티브 모듈을 사용할 수 없습니다'
    );
  }

  // Store server info in global for JSI access / JSI 접근을 위해 서버 정보를 전역에 저장
  setServerInfo(serverHostParam, serverPortParam);

  // Connect to server / 서버에 연결
  await ChromeRemoteDevToolsInspector.connect(serverHostParam, serverPortParam);

  // Note: Console hooking is handled at native level (JSI C++ hook) / 참고: Console 훅은 네이티브 레벨(JSI C++ 훅)에서 처리됩니다
}

/**
 * Disable debugger / 디버거 비활성화
 * @returns Promise that resolves when debugger is disabled / 디버거가 비활성화되면 resolve되는 Promise
 */
export async function disableDebugger(): Promise<void> {
  if (!ChromeRemoteDevToolsInspector) {
    throw new Error(
      'ChromeRemoteDevToolsInspector native module is not available / ChromeRemoteDevToolsInspector 네이티브 모듈을 사용할 수 없습니다'
    );
  }
  return ChromeRemoteDevToolsInspector.disableDebugger();
}

/**
 * Check if packager is disconnected / Packager 연결이 끊어졌는지 확인
 * @returns Promise that resolves to true if disconnected / 연결이 끊어졌으면 true로 resolve되는 Promise
 */
export async function isPackagerDisconnected(): Promise<boolean> {
  if (!ChromeRemoteDevToolsInspector) {
    throw new Error(
      'ChromeRemoteDevToolsInspector native module is not available / ChromeRemoteDevToolsInspector 네이티브 모듈을 사용할 수 없습니다'
    );
  }
  return ChromeRemoteDevToolsInspector.isPackagerDisconnected();
}

/**
 * Open debugger / 디버거 열기
 * @param serverHost Server host / 서버 호스트
 * @param serverPort Server port / 서버 포트
 * @param errorMessage Error message to show if failed / 실패 시 표시할 에러 메시지
 * @returns Promise that resolves when debugger is opened / 디버거가 열리면 resolve되는 Promise
 */
export async function openDebugger(
  serverHost: string,
  serverPort: number,
  errorMessage: string
): Promise<void> {
  if (!ChromeRemoteDevToolsInspector) {
    throw new Error(
      'ChromeRemoteDevToolsInspector native module is not available / ChromeRemoteDevToolsInspector 네이티브 모듈을 사용할 수 없습니다'
    );
  }
  return ChromeRemoteDevToolsInspector.openDebugger(serverHost, serverPort, errorMessage);
}

/**
 * Enable console hook / console 훅 활성화
 * @returns Promise that resolves to true if enabling succeeded / 활성화가 성공하면 true로 resolve되는 Promise
 */
export async function enableConsoleHook(): Promise<boolean> {
  if (!ChromeRemoteDevToolsInspector) {
    throw new Error(
      'ChromeRemoteDevToolsInspector native module is not available / ChromeRemoteDevToolsInspector 네이티브 모듈을 사용할 수 없습니다'
    );
  }
  return ChromeRemoteDevToolsInspector.enableConsoleHook();
}

/**
 * Disable console hook / console 훅 비활성화
 * @returns Promise that resolves to true if disabling succeeded / 비활성화가 성공하면 true로 resolve되는 Promise
 */
export async function disableConsoleHook(): Promise<boolean> {
  if (!ChromeRemoteDevToolsInspector) {
    throw new Error(
      'ChromeRemoteDevToolsInspector native module is not available / ChromeRemoteDevToolsInspector 네이티브 모듈을 사용할 수 없습니다'
    );
  }
  return ChromeRemoteDevToolsInspector.disableConsoleHook();
}

/**
 * Enable network hook / 네트워크 훅 활성화
 * @returns Promise that resolves to true if enabling succeeded / 활성화가 성공하면 true로 resolve되는 Promise
 */
export async function enableNetworkHook(): Promise<boolean> {
  if (!ChromeRemoteDevToolsInspector) {
    throw new Error(
      'ChromeRemoteDevToolsInspector native module is not available / ChromeRemoteDevToolsInspector 네이티브 모듈을 사용할 수 없습니다'
    );
  }
  return ChromeRemoteDevToolsInspector.enableNetworkHook();
}

/**
 * Disable network hook / 네트워크 훅 비활성화
 * @returns Promise that resolves to true if disabling succeeded / 비활성화가 성공하면 true로 resolve되는 Promise
 */
export async function disableNetworkHook(): Promise<boolean> {
  if (!ChromeRemoteDevToolsInspector) {
    throw new Error(
      'ChromeRemoteDevToolsInspector native module is not available / ChromeRemoteDevToolsInspector 네이티브 모듈을 사용할 수 없습니다'
    );
  }
  return ChromeRemoteDevToolsInspector.disableNetworkHook();
}

// Import devtools-hook to trigger auto-initialization / devtools-hook를 import하여 자동 초기화 트리거
// This must be imported before exporting to ensure auto-initialization runs / 자동 초기화가 실행되도록 export 전에 import해야 함
import './devtools-hook';
export { setupReduxDevToolsExtension } from './devtools-hook';

// Auto-connect to server if not already connected / 아직 연결되지 않았으면 서버에 자동 연결
// Default values from environment variables or fallback to localhost:8080 / 환경 변수에서 기본값 가져오거나 localhost:8080으로 폴백
const DEFAULT_HOST =
  (typeof process !== 'undefined' && process.env?.CHROME_REMOTE_DEVTOOLS_HOST) ||
  (typeof global !== 'undefined' &&
    (global as any).__ChromeRemoteDevToolsServerHost) ||
  'localhost';
const DEFAULT_PORT =
  (typeof process !== 'undefined' &&
    process.env?.CHROME_REMOTE_DEVTOOLS_PORT &&
    parseInt(process.env.CHROME_REMOTE_DEVTOOLS_PORT, 10)) ||
  (typeof global !== 'undefined' &&
    (global as any).__ChromeRemoteDevToolsServerPort) ||
  8080;

// Auto-connect in development mode / 개발 모드에서 자동 연결
if (__DEV__ && ChromeRemoteDevToolsInspector) {
  // Connect asynchronously to avoid blocking module initialization / 모듈 초기화를 막지 않기 위해 비동기로 연결
  setTimeout(() => {
    ChromeRemoteDevToolsInspector.connect(DEFAULT_HOST, DEFAULT_PORT)
      .then(() => {
        console.log(
          `[ChromeRemoteDevTools] Auto-connected to ${DEFAULT_HOST}:${DEFAULT_PORT}`
        );
      })
      .catch((error: unknown) => {
        // Silently fail - connection will be retried when needed / 조용히 실패 - 필요할 때 재시도됨
        if (__DEV__) {
          console.warn(
            `[ChromeRemoteDevTools] Auto-connect failed (server may not be running):`,
            error
          );
        }
      });
  }, 100);
}

// Re-export from separate files to avoid circular dependency / 순환 참조를 피하기 위해 별도 파일에서 re-export
export { sendCDPMessage } from './cdp-message';
export { setServerInfo } from './server-info';

export default {
  connect,
  disableDebugger,
  isPackagerDisconnected,
  openDebugger,
  sendCDPMessage,
  setServerInfo,
  enableConsoleHook,
  disableConsoleHook,
  enableNetworkHook,
  disableNetworkHook,
};
