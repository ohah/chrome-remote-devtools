// Chrome Remote DevTools React Native Inspector Plugin
// Chrome Remote DevTools React Native Inspector 플러그인
// WebSocket, console, network are implemented in JavaScript layer / WebSocket, 콘솔, 네트워크는 JavaScript 레이어에서 구현됨

// Note: Redux DevTools functionality is now provided by @ohah/redux-devtools-plugin / 참고: Redux DevTools 기능은 이제 @ohah/redux-devtools-plugin에서 제공됩니다
// Import Redux DevTools polyfill from plugin if needed / 필요시 플러그인에서 Redux DevTools polyfill import
// This is optional - users can install the plugin separately / 선택사항 - 사용자는 플러그인을 별도로 설치할 수 있습니다

import ChromeRemoteDevToolsInspector from './NativeChromeRemoteDevToolsInspector';
import { sendCDPMessage } from './cdp-message';
import { setServerInfo } from './server-info';

// Import Redux DevTools Extension setters / Redux DevTools Extension setter import
import {
  setCDPMessageSender as setReduxCDPMessageSender,
  setServerConnection as setReduxServerConnection,
} from './redux-devtools-extension';
// Import MMKV DevTools setters / MMKV DevTools setter import
import { setMMKVCDPSender, setMMKVConnectionReady } from './mmkv';
// Import AsyncStorage DevTools setters / AsyncStorage DevTools setter import
import { setAsyncStorageCDPSender, setAsyncStorageConnectionReady } from './async-storage';

// Native module is not loaded; WebSocket/console/network will be in JavaScript layer / 네이티브 모듈은 로드하지 않음, WebSocket/콘솔/네트워크는 JavaScript 레이어에서 구현 예정

/**
 * Connect to Chrome Remote DevTools server / Chrome Remote DevTools 서버에 연결
 * @param serverHost Server host (e.g., "localhost" or "192.168.1.100") / 서버 호스트 (예: "localhost" 또는 "192.168.1.100")
 * @param serverPort Server port (e.g., 8080) / 서버 포트 (예: 8080)
 * @returns Promise that resolves when connection is established / 연결이 설정되면 resolve되는 Promise
 */
export async function connect(serverHostParam: string, serverPortParam: number): Promise<void> {
  // Store server info for JS layer (e.g. WebSocket) / JS 레이어(예: WebSocket)를 위해 서버 정보 저장
  setServerInfo(serverHostParam, serverPortParam);

  // Set up CDP message sender for all DevTools integrations / 모든 DevTools 통합을 위한 CDP 메시지 전송자 설정
  const cdpSender =
    ChromeRemoteDevToolsInspector != null
      ? (host: string, port: number, message: string) => {
          const result = (
            ChromeRemoteDevToolsInspector as {
              sendCDPMessage(h: string, p: number, m: string): Promise<void>;
            }
          ).sendCDPMessage(host, port, message);
          if (result && typeof result.catch === 'function') {
            result.catch((error: unknown) => {
              console.error('[ChromeRemoteDevTools] Failed to send CDP message:', error);
            });
          }
        }
      : (_host: string, _port: number, _message: string) => {
          // No-op when native module not loaded; JS WebSocket layer will provide sender later / 네이티브 미로드 시 no-op, JS WebSocket 레이어에서 전송자 제공 예정
        };

  setReduxCDPMessageSender(cdpSender);
  setMMKVCDPSender(cdpSender);
  setAsyncStorageCDPSender(cdpSender);
  setReduxServerConnection(serverHostParam, serverPortParam);
  setMMKVConnectionReady();
  setAsyncStorageConnectionReady();

  if (ChromeRemoteDevToolsInspector == null) {
    // Native module not loaded; WebSocket/console/network will be in JavaScript layer / 네이티브 미로드, WebSocket/콘솔/네트워크는 JavaScript 레이어에서 구현 예정
    return;
  }

  // Connect to server with retry logic (native WebSocket) / 재시도 로직으로 서버 연결 (네이티브 WebSocket)
  const maxRetries = 3;
  const retryDelay = 1000; // 1 second / 1초

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await ChromeRemoteDevToolsInspector.connect(serverHostParam, serverPortParam);
      break;
    } catch (_error) {
      if (attempt < maxRetries) {
        console.warn(
          `[ChromeRemoteDevTools] Connection attempt ${attempt}/${maxRetries} failed, retrying in ${retryDelay}ms... / 연결 시도 ${attempt}/${maxRetries} 실패, ${retryDelay}ms 후 재시도...`
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      } else {
        console.warn(
          '[ChromeRemoteDevTools] Failed to connect to server after all retries. DevTools will work in offline mode. / 모든 재시도 후 서버 연결 실패. DevTools는 오프라인 모드로 작동합니다.'
        );
        console.warn(
          `[ChromeRemoteDevTools] Server should be running on ${serverHostParam}:${serverPortParam} / 서버가 ${serverHostParam}:${serverPortParam}에서 실행 중이어야 합니다`
        );
      }
    }
  }
}

/**
 * Disable debugger / 디버거 비활성화
 * @returns Promise that resolves when debugger is disabled / 디버거가 비활성화되면 resolve되는 Promise
 */
export async function disableDebugger(): Promise<void> {
  if (ChromeRemoteDevToolsInspector == null) return;
  return ChromeRemoteDevToolsInspector.disableDebugger();
}

/**
 * Check if packager is disconnected / Packager 연결이 끊어졌는지 확인
 * @returns Promise that resolves to true if disconnected / 연결이 끊어졌으면 true로 resolve되는 Promise
 */
export async function isPackagerDisconnected(): Promise<boolean> {
  if (ChromeRemoteDevToolsInspector == null) return false;
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
  if (ChromeRemoteDevToolsInspector == null) return;
  return ChromeRemoteDevToolsInspector.openDebugger(serverHost, serverPort, errorMessage);
}

/**
 * Enable console hook / console 훅 활성화
 * @returns Promise that resolves to true if enabling succeeded / 활성화가 성공하면 true로 resolve되는 Promise
 */
export async function enableConsoleHook(): Promise<boolean> {
  if (ChromeRemoteDevToolsInspector == null) return false;
  return ChromeRemoteDevToolsInspector.enableConsoleHook();
}

/**
 * Disable console hook / console 훅 비활성화
 * @returns Promise that resolves to true if disabling succeeded / 비활성화가 성공하면 true로 resolve되는 Promise
 */
export async function disableConsoleHook(): Promise<boolean> {
  if (ChromeRemoteDevToolsInspector == null) return false;
  return ChromeRemoteDevToolsInspector.disableConsoleHook();
}

/**
 * Enable network hook / 네트워크 훅 활성화
 * @returns Promise that resolves to true if enabling succeeded / 활성화가 성공하면 true로 resolve되는 Promise
 */
export async function enableNetworkHook(): Promise<boolean> {
  if (ChromeRemoteDevToolsInspector == null) return false;
  return ChromeRemoteDevToolsInspector.enableNetworkHook();
}

/**
 * Disable network hook / 네트워크 훅 비활성화
 * @returns Promise that resolves to true if disabling succeeded / 비활성화가 성공하면 true로 resolve되는 Promise
 */
export async function disableNetworkHook(): Promise<boolean> {
  if (ChromeRemoteDevToolsInspector == null) return false;
  return ChromeRemoteDevToolsInspector.disableNetworkHook();
}

/**
 * Check if console hook is enabled / console 훅이 활성화되어 있는지 확인
 * @returns Promise that resolves to true if enabled / 활성화되어 있으면 true로 resolve되는 Promise
 */
export async function isConsoleHookEnabled(): Promise<boolean> {
  if (ChromeRemoteDevToolsInspector == null) return false;
  return ChromeRemoteDevToolsInspector.isConsoleHookEnabled();
}

/**
 * Check if network hook is enabled / 네트워크 훅이 활성화되어 있는지 확인
 * @returns Promise that resolves to true if enabled / 활성화되어 있으면 true로 resolve되는 Promise
 */
export async function isNetworkHookEnabled(): Promise<boolean> {
  if (ChromeRemoteDevToolsInspector == null) return false;
  return ChromeRemoteDevToolsInspector.isNetworkHookEnabled();
}

// Re-export from separate files to avoid circular dependency / 순환 참조를 피하기 위해 별도 파일에서 re-export
export { sendCDPMessage } from './cdp-message';
export { setServerInfo, getServerInfo } from './server-info';
export { getGlobalObj, getExtensionStatus } from './utils';
export { ChromeRemoteDevToolsInspectorProvider } from './Provider';
export type { ChromeRemoteDevToolsInspectorProviderProps } from './Provider';

// Note: Redux DevTools functionality is now provided by @ohah/redux-devtools-plugin / 참고: Redux DevTools 기능은 이제 @ohah/redux-devtools-plugin에서 제공됩니다
// Users should import from the plugin directly / 사용자는 플러그인에서 직접 import해야 합니다

// Export MMKV DevTools / MMKV DevTools export
export { registerMMKVDevTools, unregisterMMKVDevTools } from './mmkv';
export type { MMKVEntry, MMKVEntryType, MMKVEntryValue } from './mmkv/types';

// Export AsyncStorage DevTools / AsyncStorage DevTools export
export { registerAsyncStorageDevTools, unregisterAsyncStorageDevTools } from './async-storage';
export type {
  AsyncStorageEntry,
  AsyncStorageEntryType,
  AsyncStorageEntryValue,
} from './async-storage/types';

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
