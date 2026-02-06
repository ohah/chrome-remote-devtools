// Shared constants / 공유 상수
export const DEFAULT_SERVER_URL = 'http://localhost:8080';
/** Default Metro bundler URL for /json/list (React Native) / React Native용 /json/list 기본 Metro URL */
export const DEFAULT_METRO_URL = 'http://localhost:8081';
export const CLIENT_REFRESH_INTERVAL = 5000; // 5 seconds
export const GITHUB_REPO_URL = 'https://github.com/ohah/chrome-remote-devtools';

/**
 * DevTools frontend path / DevTools 프론트엔드 경로
 */
export const DEVTOOLS_FRONTEND_PATH = '/devtools-frontend/devtools_app.html';

/**
 * iframe sandbox attribute for DevTools iframes (scripts, same-origin, forms, popups, modals) /
 * DevTools iframe용 sandbox 속성 (scripts, same-origin, forms, popups, modals)
 */
export const IFRAME_SANDBOX_DEVTOOLS =
  'allow-scripts allow-same-origin allow-forms allow-popups allow-modals';

/**
 * iframe allow attribute: grant all Permissions Policy features (for DevTools iframes).
 * iframe allow 속성: 모든 Permissions Policy 기능 허용 (DevTools iframe용)
 */
export const IFRAME_ALLOW_ALL_PERMISSIONS =
  'accelerometer *; ambient-light-sensor *; autoplay *; bluetooth *; camera *; display-capture *; encrypted-media *; fullscreen *; gamepad *; geolocation *; gyroscope *; hid *; identity-credentials-get *; idle-detection *; local-fonts *; magnetometer *; microphone *; midi *; payment *; picture-in-picture *; publickey-credentials-create *; publickey-credentials-get *; screen-wake-lock *; serial *; usb *; web-share *; window-management *; xr-spatial-tracking *; clipboard-read *; clipboard-write *; storage-access *';

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
