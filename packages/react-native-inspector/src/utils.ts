// Shared utilities for React Native Inspector / React Native Inspector용 공유 유틸리티

import { setupReduxDevToolsExtension } from './devtools-hook';

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

  console.log(`[Zustand ${storeName}] __REDUX_DEVTOOLS_EXTENSION__ check BEFORE store creation:`, {
    exists: hasExtension,
    hasConnect,
    hasGlobal: typeof global !== 'undefined',
    hasWindow: typeof window !== 'undefined',
    extensionType: typeof extension,
    extensionKeys: extension ? Object.keys(extension) : [],
  });

  if (!hasExtension) {
    console.log(`[Zustand ${storeName}] Extension not found, initializing...`);
    setupReduxDevToolsExtension(serverHost, serverPort);

    // Check again after initialization / 초기화 후 다시 확인
    const extensionAfter = globalObj.__REDUX_DEVTOOLS_EXTENSION__;
    console.log(`[Zustand ${storeName}] __REDUX_DEVTOOLS_EXTENSION__ check AFTER initialization:`, {
      exists: !!extensionAfter,
      hasConnect: typeof extensionAfter?.connect === 'function',
    });
  }
}

