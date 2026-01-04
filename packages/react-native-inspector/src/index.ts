// Chrome Remote DevTools React Native Inspector Plugin
// Chrome Remote DevTools React Native Inspector 플러그인
// This package provides native Inspector integration via TurboModule
// TurboModule을 통해 네이티브 Inspector 통합을 제공합니다

import { NativeModules, TurboModuleRegistry } from 'react-native';
import type { Spec } from './NativeChromeRemoteDevToolsInspector';

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
 * Send CDP message to Inspector WebSocket / Inspector WebSocket으로 CDP 메시지 전송
 * @param serverHost Server host / 서버 호스트
 * @param serverPort Server port / 서버 포트
 * @param message CDP message object / CDP 메시지 객체
 * @returns Promise that resolves when message is sent / 메시지가 전송되면 resolve되는 Promise
 */
export async function sendCDPMessage(
  serverHost: string,
  serverPort: number,
  message: unknown
): Promise<void> {
  if (!ChromeRemoteDevToolsInspector) {
    throw new Error(
      'ChromeRemoteDevToolsInspector native module is not available / ChromeRemoteDevToolsInspector 네이티브 모듈을 사용할 수 없습니다'
    );
  }
  const messageStr = JSON.stringify(message);
  return ChromeRemoteDevToolsInspector.sendCDPMessage(serverHost, serverPort, messageStr);
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

// Store server connection info in global for JSI access / JSI 접근을 위해 서버 연결 정보를 전역에 저장
export function setServerInfo(serverHost: string, serverPort: number): void {
  (global as any).__ChromeRemoteDevToolsServerHost = serverHost;
  (global as any).__ChromeRemoteDevToolsServerPort = serverPort;
}

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
