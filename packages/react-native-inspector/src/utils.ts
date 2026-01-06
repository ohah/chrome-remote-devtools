// Shared utilities for React Native Inspector / React Native Inspector용 공유 유틸리티

import { setupReduxDevToolsExtension, getConnectCallInfo } from './devtools-hook';

// Export getConnectCallInfo for direct access / 직접 접근을 위한 getConnectCallInfo 내보내기
export { getConnectCallInfo } from './devtools-hook';

// Type declarations for React Native environment / React Native 환경용 타입 선언
declare const global: typeof globalThis;
declare const window: any;

/**
 * Get global object / 전역 객체 가져오기
 * @returns Global object (global or window) / 전역 객체 (global 또는 window)
 */
export function getGlobalObj(): any {
  return typeof global !== 'undefined'
    ? (global as any)
    : typeof window !== 'undefined'
      ? window
      : {};
}

/**
 * Check and setup Redux DevTools Extension before store creation / store 생성 전에 Redux DevTools Extension 확인 및 설정
 * @param serverHost Server host (default: 'localhost') / 서버 호스트 (기본값: 'localhost')
 * @param serverPort Server port (default: 8080) / 서버 포트 (기본값: 8080)
 * @param storeName Store name for logging / 로깅용 store 이름
 */
export function checkExtensionBeforeStore(
  serverHost: string = 'localhost',
  serverPort: number = 8080,
  storeName: string = 'Store'
): void {
  const globalObj = getGlobalObj();
  const extension = globalObj.__REDUX_DEVTOOLS_EXTENSION__;
  const hasExtension = !!extension;
  const hasConnect = typeof extension?.connect === 'function';

  if (!hasExtension) {
    setupReduxDevToolsExtension(serverHost, serverPort);
  }
}

/**
 * Get extension status information / extension 상태 정보 가져오기
 * @param storeName Store name to check / 확인할 store 이름
 * @returns Extension status information / extension 상태 정보
 */
export function getExtensionStatus(storeName?: string) {
  const globalObj = getGlobalObj();
  const extension = globalObj.__REDUX_DEVTOOLS_EXTENSION__;
  const windowExtension =
    typeof window !== 'undefined' ? (window as any).__REDUX_DEVTOOLS_EXTENSION__ : undefined;

  // Check if zustand can detect extension / zustand가 extension을 감지할 수 있는지 확인
  // Zustand checks: (enabled ?? import.meta.env?.MODE !== 'production') && window.__REDUX_DEVTOOLS_EXTENSION__
  // In React Native, import.meta.env?.MODE is undefined, so enabled must be true
  // React Native에서는 import.meta.env?.MODE가 undefined이므로 enabled가 true여야 함
  const zustandCanDetect =
    typeof window !== 'undefined' &&
    !!windowExtension &&
    typeof windowExtension.connect === 'function' &&
    // Check if window is accessible (zustand uses try-catch) / window 접근 가능 여부 확인 (zustand는 try-catch 사용)
    (() => {
      try {
        return !!window.__REDUX_DEVTOOLS_EXTENSION__;
      } catch {
        return false;
      }
    })();

  // Get connect call info if store name provided / store 이름이 제공되면 connect 호출 정보 가져오기
  const connectInfo = storeName ? getConnectCallInfo(storeName) : null;

  return {
    extensionExists: !!extension,
    hasConnect: typeof extension?.connect === 'function',
    isFunction: typeof extension === 'function',
    hasCompose: !!(globalObj as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__,
    windowExtensionExists: typeof window !== 'undefined' && !!windowExtension,
    windowHasConnect:
      typeof window !== 'undefined' && typeof windowExtension?.connect === 'function',
    zustandCanDetect,
    hasGlobal: typeof global !== 'undefined',
    hasWindow: typeof window !== 'undefined',
    connectCalled: !!connectInfo,
    connectInfo: connectInfo
      ? {
          storeName: connectInfo.storeName,
          timestamp: connectInfo.timestamp,
          instanceId: connectInfo.instanceId,
          initCalled: connectInfo.initCalled,
          initTimestamp: connectInfo.initTimestamp,
        }
      : null,
  };
}
