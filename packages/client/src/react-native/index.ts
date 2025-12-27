import { ReactNativeWebSocketClient } from './websocket-client';
// console.log('test');
// const init = () => {
//   console.log('init');
// }
// export { init }
// // React Native specific CDP client for rrweb / React Native 전용 rrweb용 CDP 클라이언트

import { SessionReplayDomain } from './session-replay';
import type { ChromeRemoteDevToolsOptions, RrwebConfig } from './config';

// Global instances / 전역 인스턴스
let websocketClient: ReactNativeWebSocketClient | null = null;

/**
 * Initialize Chrome Remote DevTools for React Native / React Native용 Chrome Remote DevTools 초기화
 * @param options - Configuration options / 설정 옵션
 */
export async function init(options: ChromeRemoteDevToolsOptions): Promise<void> {
  const { serverUrl, rrweb = { enable: false } } = options;

  if (!serverUrl) {
    throw new Error('serverUrl is required / serverUrl이 필요합니다');
  }

  // Cleanup existing connection / 기존 연결 정리
  if (websocketClient) {
    websocketClient.cleanup();
    websocketClient = null;
  }

  // Create WebSocket client / WebSocket 클라이언트 생성
  websocketClient = new ReactNativeWebSocketClient(serverUrl);

  // Initialize WebSocket connection / WebSocket 연결 초기화
  await websocketClient.initialize();

  // Initialize rrweb recording if enabled / 활성화된 경우 rrweb 녹화 초기화
  if (rrweb.enable) {
    const sessionReplay = websocketClient.getSessionReplay();
    if (sessionReplay) {
      sessionReplay.enable();
      await initRrwebRecording(rrweb, sessionReplay);
    }
  }
}

/**
 * Initialize rrweb recording for React Native / React Native용 rrweb 녹화 초기화
 * This will be implemented separately for React Native View hierarchy / React Native View 계층을 위해 별도로 구현됨
 */
async function initRrwebRecording(
  config: RrwebConfig,
  sessionReplay: SessionReplayDomain
): Promise<void> {
  // TODO: Implement React Native specific rrweb recorder / React Native 전용 rrweb 레코더 구현
  // This should record React Native View hierarchy instead of DOM / DOM 대신 React Native View 계층을 기록해야 함
  console.log('[React Native] rrweb recording initialization / [React Native] rrweb 녹화 초기화');
  console.log('[React Native] Config:', config);

  // For now, just enable SessionReplay domain / 지금은 SessionReplay 도메인만 활성화
  // The actual recording implementation will be added later / 실제 녹화 구현은 나중에 추가됨
}

/**
 * Get WebSocket client instance / WebSocket 클라이언트 인스턴스 가져오기
 */
export function getWebSocketClient(): ReactNativeWebSocketClient | null {
  return websocketClient;
}

/**
 * Get SessionReplay domain / SessionReplay 도메인 가져오기
 */
export function getSessionReplayDomain(): SessionReplayDomain | null {
  if (!websocketClient) {
    return null;
  }
  return websocketClient.getSessionReplay();
}

/**
 * Send rrweb events to SessionReplay domain / SessionReplay 도메인으로 rrweb 이벤트 전송
 * @param events - Array of rrweb events / rrweb 이벤트 배열
 */
export function sendRrwebEvents(events: unknown[]): boolean {
  const sessionReplay = getSessionReplayDomain();
  if (!sessionReplay) {
    return false;
  }

  const result = sessionReplay.sendEvent({ events });
  return result.success;
}

/**
 * Enable SessionReplay recording / SessionReplay 녹화 활성화
 */
export function enableRecording(): void {
  const sessionReplay = getSessionReplayDomain();
  if (sessionReplay) {
    sessionReplay.enable();
  }
}

/**
 * Disable SessionReplay recording / SessionReplay 녹화 비활성화
 */
export function disableRecording(): void {
  const sessionReplay = getSessionReplayDomain();
  if (sessionReplay) {
    sessionReplay.disable();
  }
}

/**
 * Destroy client and cleanup resources / 클라이언트 제거 및 리소스 정리
 */
export function destroy(): void {
  if (websocketClient) {
    websocketClient.cleanup();
    websocketClient = null;
  }
}

// Export types / 타입 export
export type { ChromeRemoteDevToolsOptions, RrwebConfig } from './config';
