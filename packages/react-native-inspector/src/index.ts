// Chrome Remote DevTools React Native Inspector Plugin (JavaScript layer only)
// Chrome Remote DevTools React Native Inspector 플러그인 (JavaScript 레이어만)

import { sendCDPMessage, setCDPEventSender, setCDPConnectionReady } from './cdp-message';
import { setServerInfo, getServerInfo } from './server-info';
import {
  setCDPMessageSender as setReduxCDPMessageSender,
  setServerConnection as setReduxServerConnection,
} from './redux-devtools-extension';
import { setMMKVCDPSender, setMMKVConnectionReady } from './mmkv';
import { setAsyncStorageCDPSender, setAsyncStorageConnectionReady } from './async-storage';
import {
  enableConsoleHook as enableConsoleHookImpl,
  disableConsoleHook as disableConsoleHookImpl,
  isConsoleHookEnabled as isConsoleHookEnabledImpl,
} from './console';
import {
  enableNetworkHook as enableNetworkHookImpl,
  disableNetworkHook as disableNetworkHookImpl,
  isNetworkHookEnabled as isNetworkHookEnabledImpl,
} from './network';
import {
  connectWebSocket,
  disconnectWebSocket,
  getCDPSender,
  isWebSocketConnected,
} from './websocket-client';
import { resolveDeviceId } from './device-id';

/** Last deviceId passed to connect(); used by reconnect() when not passed / connect()에 마지막으로 넘긴 deviceId; reconnect()에서 미지정 시 사용 */
let lastConnectDeviceId: string | null = null;
/** Last enableHooks from connect(); used by reconnect() so Metro mode stays hook-free / connect()의 마지막 enableHooks; reconnect()에서 Metro 모드 유지 */
let lastConnectEnableHooks = true;

/**
 * Connect options: deviceId is required for inspector list / 연결 옵션: Inspector 목록용 deviceId 필수
 */
export interface ConnectOptions {
  /** Device identifier shown in Inspector list (required, e.g. from getUniqueId()) / Inspector 목록에 표시되는 기기 식별자 (필수, 예: getUniqueId() 결과) */
  deviceId: string;
  /** Called on each failed attempt (e.g. to show failed UI from first failure) / 각 연결 실패 시 호출 (예: 첫 실패부터 실패 UI 표시) */
  onFailureAttempt?: (attempt: number, maxRetries: number) => void;
  /** When false, do not enable console/network hooks (e.g. Metro mode uses Metro CDP instead) / false면 콘솔·네트워크 훅 미활성화 (예: Metro 모드는 Metro CDP 사용) */
  enableHooks?: boolean;
}

/**
 * Connect to Chrome Remote DevTools server via WebSocket (JavaScript) / WebSocket(JavaScript)으로 Chrome Remote DevTools 서버에 연결
 * @param serverHostParam Server host (e.g., "localhost" or "192.168.1.100") / 서버 호스트
 * @param serverPortParam Server port (e.g., 8080) / 서버 포트
 * @param options Must include deviceId for Inspector list / options에 Inspector 목록용 deviceId 필수
 * @returns Promise that resolves when connection is established / 연결이 설정되면 resolve되는 Promise
 */
export async function connect(
  serverHostParam: string,
  serverPortParam: number,
  options: ConnectOptions
): Promise<void> {
  setServerInfo(serverHostParam, serverPortParam);

  const deviceId = resolveDeviceId(options);
  lastConnectDeviceId = deviceId;
  const { onFailureAttempt, enableHooks = true } = options;
  lastConnectEnableHooks = enableHooks;

  // Clear any previous connection so reconnect works / 재연결이 되도록 이전 연결 정리
  disconnectWebSocket();

  try {
    await connectWebSocket(serverHostParam, serverPortParam, deviceId, { maxRetries: 1 });
  } catch (err) {
    onFailureAttempt?.(1, 1);
    console.warn('[ChromeRemoteDevTools] Failed to connect to server. Tap Connect to try again.');
    console.warn(
      `[ChromeRemoteDevTools] Server should be running on ${serverHostParam}:${serverPortParam}`,
      err
    );
    throw new Error(
      `Failed to connect to server. Server should be running on ${serverHostParam}:${serverPortParam}. ` +
        'On device/emulator use the host PC IP (e.g. 192.168.x.x) instead of localhost.'
    );
  }

  const cdpSender = getCDPSender();
  const sender =
    cdpSender != null
      ? (host: string, port: number, message: string) => cdpSender(host, port, message)
      : (_host: string, _port: number, _message: string) => {};

  setReduxCDPMessageSender(sender);
  setMMKVCDPSender(sender);
  setAsyncStorageCDPSender(sender);
  setCDPEventSender(sender);
  setCDPConnectionReady();
  setReduxServerConnection(serverHostParam, serverPortParam);
  setMMKVConnectionReady();
  setAsyncStorageConnectionReady();

  // Enable console and network hooks only when not Metro (Metro uses its own CDP for console/network) / Metro가 아닐 때만 콘솔·네트워크 훅 활성화 (Metro는 자체 CDP 사용)
  if (enableHooks) {
    enableConsoleHookImpl();
    enableNetworkHookImpl();
  }

  // Runtime.executionContextCreated is sent when DevTools activates (on Runtime.enable), not on connect / Runtime.executionContextCreated는 연결 시가 아니라 DevTools 활성화 시(Runtime.enable 수신 시) 전송됨
}

/**
 * Reconnect options (optional) / 재연결 옵션 (선택)
 */
export interface ReconnectOptions {
  /** Device identifier; if omitted, uses the last deviceId from connect() / 기기 식별자; 생략 시 마지막 connect()의 deviceId 사용 */
  deviceId?: string;
}

/**
 * Reconnect to the server using stored server info and deviceId / 저장된 서버 정보와 deviceId로 재연결
 * No-op if already connected (safe to call anytime, e.g. from DevTools eval) / 이미 연결된 경우 아무것도 하지 않음 (eval 등에서 무조건 호출해도 안전)
 * @param options Optional deviceId; if omitted, last connect() deviceId is used / 옵션 deviceId; 생략 시 마지막 connect()의 deviceId 사용
 * @returns Promise that resolves when reconnected or when already connected (no-op) / 재연결 완료 시 또는 이미 연결된 경우(no-op) resolve
 */
export async function reconnect(options?: ReconnectOptions): Promise<void> {
  if (isWebSocketConnected()) {
    return;
  }
  const serverInfo = getServerInfo();
  if (!serverInfo) {
    return;
  }
  const deviceId = options?.deviceId ?? lastConnectDeviceId;
  if (!deviceId) {
    return;
  }
  await connect(serverInfo.host, serverInfo.port, {
    deviceId,
    enableHooks: lastConnectEnableHooks,
  });
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
export type { MMKVEntry, MMKVEntryType, MMKVEntryValue, MMKVStorageInput } from './mmkv/types';

export { registerAsyncStorageDevTools, unregisterAsyncStorageDevTools } from './async-storage';
export type {
  AsyncStorageType,
  AsyncStorageEntry,
  AsyncStorageEntryType,
  AsyncStorageEntryValue,
} from './async-storage/types';

// Unused by example app; for README Vanilla Redux and polyfill / 예제 앱에서는 미사용; README Vanilla Redux 및 polyfill용
export {
  composeWithDevTools,
  reduxDevToolsExtension,
  installReduxDevToolsPolyfill,
} from './redux-devtools-extension';

export default {
  connect,
  reconnect,
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

// Install console and network hooks when package loads so user code (e.g. button handlers) uses wrapped console/network; connect() sets the sender later / 패키지 로드 시 훅 설치하여 버튼 등 사용자 코드가 래핑된 console·network 사용; connect()에서 sender 설정
enableConsoleHookImpl();
enableNetworkHookImpl();

// Expose reconnect on global so DevTools Console can call it without require path (e.g. __ChromeRemoteDevToolsReconnect()) / DevTools Console에서 require 경로 없이 호출할 수 있도록 global에 노출
declare const global: typeof globalThis;
if (typeof global !== 'undefined') {
  (global as any).__ChromeRemoteDevToolsReconnect = reconnect;
}
