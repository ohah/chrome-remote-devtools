// React Native specific configuration / React Native 전용 설정

/**
 * Configuration options for Chrome Remote DevTools (React Native) / Chrome Remote DevTools 설정 옵션 (React Native)
 */
export interface ChromeRemoteDevToolsOptions {
  /** Server WebSocket URL / 서버 WebSocket URL */
  serverUrl: string;
  /** Intercept React Native native inspector WebSocket / React Native 내장 인스펙터 WebSocket 가로채기 */
  interceptNativeInspector?: boolean;
}
