// Chrome Remote DevTools React Native Inspector Plugin
// Chrome Remote DevTools React Native Inspector 플러그인
// This package provides native Inspector integration via TurboModule
// TurboModule을 통해 네이티브 Inspector 통합을 제공합니다

// IMPORTANT: Import Redux DevTools polyfill FIRST (side-effect import) / 중요: Redux DevTools polyfill을 먼저 import (side-effect import)
// This installs __REDUX_DEVTOOLS_EXTENSION__ synchronously before any store creation
// store 생성 전에 __REDUX_DEVTOOLS_EXTENSION__을 동기적으로 설치합니다
// Works with both Redux Toolkit and Zustand / Redux Toolkit과 Zustand 모두에서 작동
import {
  installReduxDevToolsPolyfill,
  setCDPMessageSender,
  setServerConnection,
} from './redux-devtools-extension';

// Install polyfill immediately to ensure it's available before any store is created / store가 생성되기 전에 사용 가능하도록 즉시 polyfill 설치
// This is a fallback in case Metro's getModulesRunBeforeMainModule doesn't run early enough / Metro의 getModulesRunBeforeMainModule이 충분히 일찍 실행되지 않는 경우를 위한 폴백
if (typeof global !== 'undefined' && !global.__REDUX_DEVTOOLS_EXTENSION__) {
  console.log(
    '[ChromeRemoteDevTools] Installing Redux DevTools polyfill from index.ts / index.ts에서 Redux DevTools polyfill 설치'
  );
  installReduxDevToolsPolyfill();
}

import { NativeModules, TurboModuleRegistry } from 'react-native';
import type { Spec } from './NativeChromeRemoteDevToolsInspector';
import { sendCDPMessage } from './cdp-message';
import { setServerInfo } from './server-info';

// Import middleware setters / 미들웨어 setter import
import { setReduxCDPSender, setReduxConnectionReady } from './redux-middleware';
import { setZustandCDPSender, setZustandConnectionReady } from './zustand-middleware';

// Try to get TurboModule first (New Architecture), fallback to Legacy Module / TurboModule을 먼저 시도 (New Architecture), Legacy Module로 폴백
const TurboModule = TurboModuleRegistry.get<Spec>('ChromeRemoteDevToolsInspector');
const LegacyModule = NativeModules.ChromeRemoteDevToolsInspector;
const ChromeRemoteDevToolsInspector = TurboModule || LegacyModule;

// Note: Module availability is checked but not logged to avoid console issues / 참고: 모듈 사용 가능성은 확인하지만 콘솔 문제를 피하기 위해 로그하지 않음

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

  // Set up CDP message sender for all DevTools integrations / 모든 DevTools 통합을 위한 CDP 메시지 전송자 설정
  const cdpSender = (host: string, port: number, message: string) => {
    // Handle Promise rejection to prevent silent failures / Promise rejection 처리하여 조용한 실패 방지
    const result = ChromeRemoteDevToolsInspector.sendCDPMessage(host, port, message);
    if (result && typeof result.catch === 'function') {
      result.catch((error: unknown) => {
        console.error('[ChromeRemoteDevTools] Failed to send CDP message:', error);
      });
    }
  };

  // Set up polyfill CDP sender / polyfill CDP 전송자 설정
  setCDPMessageSender(cdpSender);

  // Set up middleware CDP senders / 미들웨어 CDP 전송자 설정
  setReduxCDPSender(cdpSender);
  setZustandCDPSender(cdpSender);

  // Connect to server with retry logic / 재시도 로직이 있는 서버 연결
  let connected = false;
  const maxRetries = 3;
  const retryDelay = 1000; // 1 second / 1초

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await ChromeRemoteDevToolsInspector.connect(serverHostParam, serverPortParam);
      connected = true;
      break;
    } catch (error) {
      if (attempt < maxRetries) {
        console.warn(
          `[ChromeRemoteDevTools] Connection attempt ${attempt}/${maxRetries} failed, retrying in ${retryDelay}ms... / 연결 시도 ${attempt}/${maxRetries} 실패, ${retryDelay}ms 후 재시도...`
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      } else {
        // Last attempt failed, log warning but don't throw / 마지막 시도 실패, 경고 로그만 출력하고 throw하지 않음
        console.warn(
          '[ChromeRemoteDevTools] Failed to connect to server after all retries. DevTools will work in offline mode. / 모든 재시도 후 서버 연결 실패. DevTools는 오프라인 모드로 작동합니다.'
        );
        console.warn(
          `[ChromeRemoteDevTools] Server should be running on ${serverHostParam}:${serverPortParam} / 서버가 ${serverHostParam}:${serverPortParam}에서 실행 중이어야 합니다`
        );
        // Don't throw error, allow app to continue / 에러를 throw하지 않고 앱이 계속 작동하도록 함
      }
    }
  }

  // Set server connection only if connected / 연결된 경우에만 서버 연결 설정
  if (connected) {
    // Set server connection for Redux DevTools polyfill / Redux DevTools polyfill을 위한 서버 연결 설정
    // This will flush any pending actions / 대기 중인 액션들이 전송됩니다
    setServerConnection(serverHostParam, serverPortParam);
  }

  // Set middleware connections ready / 미들웨어 연결 준비 완료 설정
  setReduxConnectionReady();
  setZustandConnectionReady();

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

/**
 * Check if console hook is enabled / console 훅이 활성화되어 있는지 확인
 * @returns Promise that resolves to true if enabled / 활성화되어 있으면 true로 resolve되는 Promise
 */
export async function isConsoleHookEnabled(): Promise<boolean> {
  if (!ChromeRemoteDevToolsInspector) {
    return false;
  }
  return ChromeRemoteDevToolsInspector.isConsoleHookEnabled();
}

/**
 * Check if network hook is enabled / 네트워크 훅이 활성화되어 있는지 확인
 * @returns Promise that resolves to true if enabled / 활성화되어 있으면 true로 resolve되는 Promise
 */
export async function isNetworkHookEnabled(): Promise<boolean> {
  if (!ChromeRemoteDevToolsInspector) {
    return false;
  }
  return ChromeRemoteDevToolsInspector.isNetworkHookEnabled();
}

// Re-export from separate files to avoid circular dependency / 순환 참조를 피하기 위해 별도 파일에서 re-export
export { sendCDPMessage } from './cdp-message';
export { setServerInfo, getServerInfo } from './server-info';
export { getGlobalObj, getExtensionStatus } from './utils';
export { ChromeRemoteDevToolsInspectorProvider } from './Provider';
export type { ChromeRemoteDevToolsInspectorProviderProps } from './Provider';

// Export Redux DevTools middleware / Redux DevTools 미들웨어 export
export { createReduxDevToolsMiddleware, createReduxDevToolsEnhancer } from './redux-middleware';

// Export Zustand DevTools middleware / Zustand DevTools 미들웨어 export
export { chromeDevtools, namedAction } from './zustand-middleware';

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
  isConsoleHookEnabled,
  isNetworkHookEnabled,
};
