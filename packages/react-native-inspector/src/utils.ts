// Shared utilities for React Native Inspector / React Native Inspector용 공유 유틸리티

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
  };
}
