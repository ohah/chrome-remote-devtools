// DevTools URL utility functions / DevTools URL 유틸리티 함수

// Get client ID from sessionStorage / sessionStorage에서 클라이언트 ID 가져오기
export function getClientId(): string | null {
  // Client script stores debug_id in sessionStorage / 클라이언트 스크립트가 sessionStorage에 debug_id 저장
  return sessionStorage.getItem('debug_id');
}

// Get server URL from script tag or default / 스크립트 태그에서 서버 URL 가져오기 또는 기본값
export function getServerUrl(): string {
  const script = document.querySelector('script[data-server-url]') as HTMLScriptElement | null;
  return (
    script?.dataset.serverUrl || script?.getAttribute('data-server-url') || 'http://localhost:8080'
  );
}

// Get origin for embedded mode / embedded 모드를 위한 origin 가져오기
export function getHostOrigin(): string {
  let protocol = location.protocol;
  let host = location.host;
  if (protocol === 'about:' || protocol === 'blob:') {
    protocol = window.parent.location.protocol;
    host = window.parent.location.host;
  }
  return `${protocol}//${host}`;
}

// Build DevTools iframe URL / DevTools iframe URL 구성
export function buildDevToolsUrl(
  clientId: string,
  serverUrl: string = 'http://localhost:8080'
): string {
  const baseUrl = new URL('/devtools-frontend/devtools_app.html', window.location.origin);
  const params = baseUrl.searchParams;

  // WebSocket URL parameter / WebSocket URL 파라미터
  // Use a stable ID instead of Date.now() to avoid iframe reloads / iframe 리로드를 방지하기 위해 Date.now() 대신 안정적인 ID 사용
  const devtoolsId = `devtools-${clientId}`;
  // Extract host from serverUrl (DevTools frontend will add protocol automatically) / serverUrl에서 host 추출 (DevTools frontend가 프로토콜을 자동으로 추가함)
  const serverHost = serverUrl
    .replace(/^https?:\/\//, '')
    .replace(/^ws:\/\//, '')
    .replace(/^wss:\/\//, '');
  const wsUrl = `${serverHost}/remote/debug/devtools/${devtoolsId}?clientId=${clientId}`;
  params.append('ws', wsUrl);

  // DevTools configuration parameters / DevTools 설정 파라미터
  params.append('experiments', 'true');
  params.append('improvedChromeReloads', 'true');
  params.append('experimental', 'true');

  // Enable panels / 패널 활성화
  params.append('enableConsole', 'true');
  params.append('enableRuntime', 'true');
  params.append('enableNetwork', 'true');
  params.append('enableDebugger', 'true');

  // Embedded mode / embedded 모드
  const hostOrigin = getHostOrigin();
  baseUrl.hash = `?embedded=${encodeURIComponent(hostOrigin)}`;

  return baseUrl.toString();
}
