// Shared utilities for Redux DevTools plugin / Redux DevTools 플러그인용 공유 유틸리티

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
