// Chrome Remote DevTools React Native Inspector Plugin (JavaScript layer only)
// Chrome Remote DevTools React Native Inspector 플러그인 (JavaScript 레이어만)

import { sendCDPMessage } from './cdp-message';
import { setServerInfo } from './server-info';
import {
  setCDPMessageSender as setReduxCDPMessageSender,
  setServerConnection as setReduxServerConnection,
} from './redux-devtools-extension';
import { setMMKVCDPSender, setMMKVConnectionReady } from './mmkv';
import { setAsyncStorageCDPSender, setAsyncStorageConnectionReady } from './async-storage';
import {
  setConsoleCDPSender,
  setConsoleConnectionReady,
  enableConsoleHook as enableConsoleHookImpl,
  disableConsoleHook as disableConsoleHookImpl,
  isConsoleHookEnabled as isConsoleHookEnabledImpl,
} from './console';
import {
  setNetworkCDPSender,
  setNetworkConnectionReady,
  enableNetworkHook as enableNetworkHookImpl,
  disableNetworkHook as disableNetworkHookImpl,
  isNetworkHookEnabled as isNetworkHookEnabledImpl,
} from './network';
import { connectWebSocket, getCDPSender } from './websocket-client';

/**
 * Connect to Chrome Remote DevTools server via WebSocket (JavaScript) / WebSocket(JavaScript)으로 Chrome Remote DevTools 서버에 연결
 * @param serverHostParam Server host (e.g., "localhost" or "192.168.1.100") / 서버 호스트
 * @param serverPortParam Server port (e.g., 8080) / 서버 포트
 * @returns Promise that resolves when connection is established / 연결이 설정되면 resolve되는 Promise
 */
export async function connect(serverHostParam: string, serverPortParam: number): Promise<void> {
  setServerInfo(serverHostParam, serverPortParam);

  const maxRetries = 3;
  const retryDelay = 1000;
  let connected = false;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await connectWebSocket(serverHostParam, serverPortParam);
      connected = true;
      break;
    } catch (_err) {
      if (attempt < maxRetries) {
        console.warn(
          `[ChromeRemoteDevTools] Connection attempt ${attempt}/${maxRetries} failed, retrying in ${retryDelay}ms...`
        );
        await new Promise((r) => setTimeout(r, retryDelay));
      } else {
        console.warn(
          '[ChromeRemoteDevTools] Failed to connect to server after all retries. DevTools will work in offline mode.'
        );
        console.warn(
          `[ChromeRemoteDevTools] Server should be running on ${serverHostParam}:${serverPortParam}`
        );
      }
    }
  }

  if (!connected) return;

  const cdpSender = getCDPSender();
  const sender =
    cdpSender != null
      ? (host: string, port: number, message: string) => cdpSender(host, port, message)
      : (_host: string, _port: number, _message: string) => {};

  setReduxCDPMessageSender(sender);
  setMMKVCDPSender(sender);
  setAsyncStorageCDPSender(sender);
  setConsoleCDPSender(sender);
  setNetworkCDPSender(sender);
  setReduxServerConnection(serverHostParam, serverPortParam);
  setMMKVConnectionReady();
  setAsyncStorageConnectionReady();
  setConsoleConnectionReady();
  setNetworkConnectionReady();
}

/**
 * Disable debugger / 디버거 비활성화
 * @returns Promise that resolves when debugger is disabled / 디버거가 비활성화되면 resolve되는 Promise
 */
export async function disableDebugger(): Promise<void> {}

/**
 * Check if packager is disconnected / Packager 연결이 끊어졌는지 확인
 * @returns Promise that resolves to true if disconnected / 연결이 끊어졌으면 true로 resolve되는 Promise
 */
export async function isPackagerDisconnected(): Promise<boolean> {
  return false;
}

/**
 * Open debugger / 디버거 열기
 * @param _serverHost Server host / 서버 호스트
 * @param _serverPort Server port / 서버 포트
 * @param _errorMessage Error message to show if failed / 실패 시 표시할 에러 메시지
 * @returns Promise that resolves when debugger is opened / 디버거가 열리면 resolve되는 Promise
 */
export async function openDebugger(
  _serverHost: string,
  _serverPort: number,
  _errorMessage: string
): Promise<void> {}

/**
 * Enable console hook (JavaScript layer) / console 훅 활성화 (JavaScript 레이어)
 * @returns Promise that resolves to true if enabling succeeded / 활성화가 성공하면 true로 resolve되는 Promise
 */
export async function enableConsoleHook(): Promise<boolean> {
  return enableConsoleHookImpl();
}

/**
 * Disable console hook / console 훅 비활성화
 * @returns Promise that resolves to true if disabling succeeded / 비활성화가 성공하면 true로 resolve되는 Promise
 */
export async function disableConsoleHook(): Promise<boolean> {
  return disableConsoleHookImpl();
}

/**
 * Enable network hook (JavaScript layer) / 네트워크 훅 활성화 (JavaScript 레이어)
 * @returns Promise that resolves to true if enabling succeeded / 활성화가 성공하면 true로 resolve되는 Promise
 */
export async function enableNetworkHook(): Promise<boolean> {
  return enableNetworkHookImpl();
}

/**
 * Disable network hook / 네트워크 훅 비활성화
 * @returns Promise that resolves to true if disabling succeeded / 비활성화가 성공하면 true로 resolve되는 Promise
 */
export async function disableNetworkHook(): Promise<boolean> {
  return disableNetworkHookImpl();
}

/**
 * Check if console hook is enabled / console 훅이 활성화되어 있는지 확인
 * @returns Promise that resolves to true if enabled / 활성화되어 있으면 true로 resolve되는 Promise
 */
export async function isConsoleHookEnabled(): Promise<boolean> {
  return isConsoleHookEnabledImpl();
}

/**
 * Check if network hook is enabled / 네트워크 훅이 활성화되어 있는지 확인
 * @returns Promise that resolves to true if enabled / 활성화되어 있으면 true로 resolve되는 Promise
 */
export async function isNetworkHookEnabled(): Promise<boolean> {
  return isNetworkHookEnabledImpl();
}

export { sendCDPMessage } from './cdp-message';
export { setServerInfo, getServerInfo } from './server-info';
export { getGlobalObj, getExtensionStatus } from './utils';
export { ChromeRemoteDevToolsInspectorProvider } from './Provider';
export type { ChromeRemoteDevToolsInspectorProviderProps } from './Provider';

export { registerMMKVDevTools, unregisterMMKVDevTools } from './mmkv';
export type { MMKVEntry, MMKVEntryType, MMKVEntryValue } from './mmkv/types';

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
