// React Native specific configuration / React Native 전용 설정

/**
 * Rrweb configuration for React Native / React Native용 Rrweb 설정
 */
export interface RrwebConfig {
  /** Enable rrweb recording / rrweb 녹화 활성화 */
  enable: boolean;
  /** Flush interval in milliseconds / 밀리초 단위 플러시 간격 */
  flushIntervalMs?: number;
  /** Maximum batch size for events / 이벤트 최대 배치 크기 */
  maxBatchSize?: number;
  /** Record options / 녹화 옵션 */
  recordOptions?: Record<string, any>;
}

/**
 * Configuration options for Chrome Remote DevTools (React Native) / Chrome Remote DevTools 설정 옵션 (React Native)
 */
export interface ChromeRemoteDevToolsOptions {
  /** Server WebSocket URL / 서버 WebSocket URL */
  serverUrl: string;
  /** Rrweb configuration / Rrweb 설정 */
  rrweb?: RrwebConfig;
}
