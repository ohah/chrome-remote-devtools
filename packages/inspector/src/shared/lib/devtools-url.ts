// DevTools URL builder / DevTools URL 빌더
import { DEVTOOLS_FRONTEND_PATH, DEVTOOLS_CONFIG } from './constants';
import { getServerUrl } from './server-url';

/**
 * Options for building DevTools URL / DevTools URL 구성 옵션
 */
export interface BuildDevToolsUrlOptions {
  /** Client identifier / 클라이언트 식별자 */
  clientId: string;
  /** Server URL (default: getServerUrl()) / 서버 URL (기본값: getServerUrl()) */
  serverUrl?: string;
  /** Client type ('web' | 'react-native' | 'reactotron') / 클라이언트 타입 */
  clientType?: 'web' | 'react-native' | 'reactotron';
}

/**
 * Build DevTools iframe URL with WebSocket configuration / WebSocket 설정과 함께 DevTools iframe URL 구성
 * @param options - Build options / 구성 옵션
 * @returns DevTools iframe URL / DevTools iframe URL
 * @throws Error if server URL is not set / 서버 URL이 설정되지 않았으면 에러 발생
 */
export function buildDevToolsUrl(options: BuildDevToolsUrlOptions): string {
  const { clientId, serverUrl, clientType } = options;
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

  // Stable instance ID per clientId so iframe src never changes on re-render (no reload) / clientId당 고정 instance로 리렌더 시 src 변경·리로드 방지
  const stableInstance = `stable-${clientId}`;
  params.append('instance', stableInstance);

  // Client type parameter / 클라이언트 타입 파라미터
  if (clientType) {
    params.append('clientType', clientType);
  }
  // Client ID (used by DevTools for RN panel condition fallback) / 클라이언트 ID (DevTools RN 패널 조건 fallback용)
  params.append('clientId', clientId);

  // DevTools configuration parameters / DevTools 설정 파라미터
  Object.entries(DEVTOOLS_CONFIG).forEach(([key, value]) => {
    params.append(key, value);
  });

  return devtoolsUrl.toString();
}

/**
 * Options for building DevTools URL with direct WebSocket (e.g. Metro) /
 * 직접 WebSocket URL로 DevTools URL 구성 옵션 (예: Metro)
 */
export interface BuildDevToolsUrlDirectOptions {
  /** Full WebSocket URL (e.g. Metro webSocketDebuggerUrl) / 전체 WebSocket URL (예: Metro webSocketDebuggerUrl) */
  webSocketUrl: string;
  /** Stable id for iframe instance (e.g. metro-{targetId}) / iframe instance용 안정 id (예: metro-{targetId}) */
  instanceId: string;
  /** Client type for DevTools UI / DevTools UI용 클라이언트 타입 */
  clientType?: 'web' | 'react-native' | 'reactotron';
}

/**
 * Strip protocol from WebSocket URL for DevTools frontend /
 * DevTools 프론트엔드는 ws/wss 파라미터에 프로토콜 없이 host+path만 기대하고 자체적으로 ws:// 또는 wss:// 를 붙임
 * @see devtools-frontend Connections.ts: ws = wsParam ? `ws://${wsParam}` : `wss://${wssParam}`
 */
function webSocketUrlWithoutProtocol(fullUrl: string): { param: 'ws' | 'wss'; value: string } {
  const u = fullUrl.trim();
  if (u.startsWith('wss://')) {
    return { param: 'wss', value: u.slice('wss://'.length) };
  }
  if (u.startsWith('ws://')) {
    return { param: 'ws', value: u.slice('ws://'.length) };
  }
  return { param: 'ws', value: u };
}

/**
 * Build DevTools iframe URL with direct WebSocket URL (no server relay) /
 * 직접 WebSocket URL로 DevTools iframe URL 구성 (서버 경유 없음)
 * Used for Metro targets: connect our Inspector directly to Metro's CDP WebSocket. /
 * Metro 타깃용: 우리 인스펙터가 Metro CDP WebSocket에 직접 연결
 */
export function buildDevToolsUrlDirect(options: BuildDevToolsUrlDirectOptions): string {
  const { webSocketUrl, instanceId, clientType } = options;
  const devtoolsUrl = new URL(DEVTOOLS_FRONTEND_PATH, window.location.origin);
  const params = devtoolsUrl.searchParams;

  const { param, value } = webSocketUrlWithoutProtocol(webSocketUrl);
  params.append(param, value);
  params.append('instance', `stable-${instanceId}`);
  params.append('clientId', instanceId);
  if (clientType) {
    params.append('clientType', clientType);
  }
  Object.entries(DEVTOOLS_CONFIG).forEach(([key, value]) => {
    params.append(key, value);
  });
  return devtoolsUrl.toString();
}

/**
 * Options for building DevTools URL with Metro WebSocket proxy /
 * Metro WebSocket 프록시로 DevTools URL 구성 옵션
 */
export interface BuildDevToolsUrlMetroProxyOptions {
  /** Metro WebSocket URL (e.g. ws://localhost:8081/page/abc) / Metro WebSocket URL */
  metroWebSocketUrl: string;
  /** Our server URL (e.g. http://localhost:8080) / 우리 서버 URL */
  serverUrl: string;
  /** Stable id for iframe instance (e.g. metro-{targetId}) / iframe instance용 안정 id */
  instanceId: string;
  /** Client type for DevTools UI / DevTools UI용 클라이언트 타입 */
  clientType?: 'web' | 'react-native' | 'reactotron';
}

/**
 * Build DevTools iframe URL with Metro WebSocket proxy through our server /
 * 우리 서버를 통한 Metro WebSocket 프록시로 DevTools iframe URL 구성
 *
 * Instead of connecting directly to Metro's WS (which causes CORS issues for sourcemaps),
 * routes through our server's metro/proxy endpoint which rewrites sourcemap URLs. /
 * Metro WS에 직접 연결하는 대신 (소스맵 CORS 문제), 서버의 metro/proxy 엔드포인트를 통해 소스맵 URL을 재작성
 */
export function buildDevToolsUrlMetroProxy(options: BuildDevToolsUrlMetroProxyOptions): string {
  const { metroWebSocketUrl, serverUrl, instanceId, clientType } = options;
  const devtoolsUrl = new URL(DEVTOOLS_FRONTEND_PATH, window.location.origin);
  const params = devtoolsUrl.searchParams;

  // Build proxy WebSocket URL through our server; use host only so path/trailing slash in serverUrl don't break URL / 우리 서버 경유 프록시 WebSocket URL; serverUrl의 경로·슬래시가 있어도 host만 사용
  let serverHost: string;
  try {
    serverHost = new URL(serverUrl).host;
  } catch {
    serverHost = serverUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  }
  const proxyWsUrl = `${serverHost}/remote/debug/metro/proxy?target=${encodeURIComponent(metroWebSocketUrl)}&serverOrigin=${encodeURIComponent(serverUrl)}`;

  params.append('ws', proxyWsUrl);
  params.append('instance', `stable-${instanceId}`);
  params.append('clientId', instanceId);
  if (clientType) {
    params.append('clientType', clientType);
  }
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
