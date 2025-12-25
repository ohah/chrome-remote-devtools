// DevTools URL builder / DevTools URL 빌더
import { SERVER_URL, DEVTOOLS_FRONTEND_PATH, DEVTOOLS_CONFIG } from './constants';

/**
 * Build DevTools iframe URL with WebSocket configuration / WebSocket 설정과 함께 DevTools iframe URL 구성
 * @param clientId - Client identifier / 클라이언트 식별자
 * @param serverUrl - Server URL (default: SERVER_URL) / 서버 URL (기본값: SERVER_URL)
 * @returns DevTools iframe URL / DevTools iframe URL
 */
export function buildDevToolsUrl(clientId: string, serverUrl: string = SERVER_URL): string {
  const url = new URL(DEVTOOLS_FRONTEND_PATH, window.location.origin);
  const params = url.searchParams;

  // WebSocket URL parameter / WebSocket URL 파라미터
  // Use a stable ID instead of Date.now() to avoid iframe reloads / iframe 리로드를 방지하기 위해 Date.now() 대신 안정적인 ID 사용
  const devtoolsId = `devtools-${clientId}`;

  // Remove protocol from server URL for WebSocket URL / WebSocket URL을 위해 서버 URL에서 프로토콜 제거
  const serverHost = serverUrl.replace(/^https?:\/\//, '');
  const wsUrl = `${serverHost}/remote/debug/devtools/${devtoolsId}?clientId=${clientId}`;
  params.append('ws', wsUrl);

  // DevTools configuration parameters / DevTools 설정 파라미터
  Object.entries(DEVTOOLS_CONFIG).forEach(([key, value]) => {
    params.append(key, value);
  });

  return url.toString();
}
