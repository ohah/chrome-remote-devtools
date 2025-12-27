// Client initialization utilities / 클라이언트 초기화 유틸리티

/**
 * Navigator with wakeLock API / wakeLock API가 있는 Navigator
 */
interface NavigatorWithWakeLock {
  wakeLock?: {
    request(type: 'screen'): Promise<WakeLockSentinel>;
  };
}

/**
 * Keep screen display active / 화면 표시 활성 상태 유지
 */
export function keepScreenDisplay(): void {
  const nav = navigator as NavigatorWithWakeLock;
  if (!nav.wakeLock) {
    return;
  }

  nav.wakeLock.request('screen').catch(() => {
    // Ignore
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      nav.wakeLock?.request('screen').catch(() => {
        // Ignore
      });
    }
  });
}
