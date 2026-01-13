// DevTools URL builder / DevTools URL 빌더
import { DEVTOOLS_FRONTEND_PATH, DEVTOOLS_CONFIG } from './constants';
import { getServerUrl } from './server-url';

/**
 * Build DevTools iframe URL with WebSocket configuration / WebSocket 설정과 함께 DevTools iframe URL 구성
 * @param clientId - Client identifier / 클라이언트 식별자
 * @param serverUrl - Server URL (default: getServerUrl()) / 서버 URL (기본값: getServerUrl())
 * @returns DevTools iframe URL / DevTools iframe URL
 * @throws Error if server URL is not set / 서버 URL이 설정되지 않았으면 에러 발생
 */
export function buildDevToolsUrl(clientId: string, serverUrl?: string): string {
  const serverUrlValue = serverUrl ?? getServerUrl();
  if (!serverUrlValue) {
    throw new Error('Server URL is not set');
  }

  const devtoolsUrl = new URL(DEVTOOLS_FRONTEND_PATH, window.location.origin);
  const params = devtoolsUrl.searchParams;

  // WebSocket URL parameter / WebSocket URL 파라미터
  // Use a stable ID instead of Date.now() to avoid iframe reloads / iframe 리로드를 방지하기 위해 Date.now() 대신 안정적인 ID 사용
  const devtoolsId = `devtools-${clientId}`;

  // Remove protocol from server URL for WebSocket URL / WebSocket URL을 위해 서버 URL에서 프로토콜 제거
  const serverHost = serverUrlValue.replace(/^https?:\/\//, '');
  const wsUrl = `${serverHost}/remote/debug/devtools/${devtoolsId}?clientId=${clientId}`;
  params.append('ws', wsUrl);

  // Generate random instance ID for localStorage isolation / localStorage 격리를 위한 랜덤 인스턴스 ID 생성
  // Use random value to ensure each DevTools instance has completely isolated storage
  // / 각 DevTools 인스턴스가 완전히 격리된 스토리지를 가지도록 랜덤 값 사용
  // Generate random string: timestamp + random number / 랜덤 문자열 생성: 타임스탬프 + 랜덤 숫자
  const randomInstance = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}`;
  params.append('instance', randomInstance);

  // DevTools configuration parameters / DevTools 설정 파라미터
  Object.entries(DEVTOOLS_CONFIG).forEach(([key, value]) => {
    params.append(key, value);
  });

  return devtoolsUrl.toString();
}

/**
 * Build DevTools replay mode URL / DevTools replay 모드 URL 구성
 * @returns DevTools replay URL / DevTools replay URL
 */
export function buildDevToolsReplayUrl(): string {
  const url = new URL(DEVTOOLS_FRONTEND_PATH, window.location.origin);
  const params = url.searchParams;

  // Replay mode / Replay 모드
  params.append('replay', 'true');
  // PostMessage mode is required for iframe communication / iframe 통신을 위해 PostMessage 모드 필요
  params.append('postMessage', 'true');

  // DevTools configuration parameters / DevTools 설정 파라미터
  Object.entries(DEVTOOLS_CONFIG).forEach(([key, value]) => {
    params.append(key, value);
  });

  return url.toString();
}
