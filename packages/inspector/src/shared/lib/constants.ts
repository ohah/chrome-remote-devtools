// Shared constants / 공유 상수
export const SERVER_URL = 'http://localhost:8080';
export const CLIENT_REFRESH_INTERVAL = 2000; // 2 seconds / 2초
export const GITHUB_REPO_URL = 'https://github.com/ohah/chrome-remote-devtools';

/**
 * DevTools frontend path / DevTools 프론트엔드 경로
 */
export const DEVTOOLS_FRONTEND_PATH = '/devtools-frontend/devtools_app.html';

/**
 * DevTools configuration parameters / DevTools 설정 파라미터
 */
export const DEVTOOLS_CONFIG = {
  experiments: 'true',
  improvedChromeReloads: 'true',
  experimental: 'true',
  enableConsole: 'true',
  enableRuntime: 'true',
  enableNetwork: 'true',
  enableDebugger: 'true',
} as const;
