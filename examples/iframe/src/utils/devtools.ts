// DevTools URL utility functions / DevTools URL 유틸리티 함수

// Get client ID from sessionStorage or localStorage / sessionStorage 또는 localStorage에서 클라이언트 ID 가져오기
export function getClientId(): string | null {
  // Client script stores debug_id in sessionStorage or localStorage / 클라이언트 스크립트가 sessionStorage 또는 localStorage에 debug_id 저장
  // In iframe mode, localStorage is used (shared with iframe) / iframe 모드에서는 localStorage 사용 (iframe과 공유)
  return sessionStorage.getItem('debug_id') || localStorage.getItem('debug_id');
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
  _clientId: string,
  _serverUrl: string = 'http://localhost:8080'
): string {
  const baseUrl = new URL('/devtools-frontend/devtools_app.html', window.location.origin);
  const params = baseUrl.searchParams;

  // Use postMessage instead of WebSocket / WebSocket 대신 postMessage 사용
  params.append('postMessage', 'true');

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
