// DevTools URL utility functions / DevTools URL 유틸리티 함수

// Get client ID from sessionStorage / sessionStorage에서 클라이언트 ID 가져오기
export function getClientId(): string | null {
  // Client script stores debug_id in sessionStorage / 클라이언트 스크립트가 sessionStorage에 debug_id 저장
  return sessionStorage.getItem('debug_id');
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

// Build DevTools popup URL / DevTools 팝업 URL 구성
// Note: _clientId is currently unused because popup mode uses postMessage transport
// instead of client-specific WebSocket URLs. It is kept in the signature for potential
// future use (e.g., client-scoped URLs) and to avoid breaking existing callers.
// 참고: _clientId는 현재 사용되지 않습니다. 팝업 모드는 클라이언트별 WebSocket URL 대신
// postMessage transport를 사용하기 때문입니다. 향후 사용 가능성(예: 클라이언트 범위 URL)과
// 기존 호출자와의 호환성을 위해 시그니처에 유지됩니다.
export function buildDevToolsUrl(_clientId: string): string {
  const baseUrl = new URL('/devtools-frontend/devtools_app.html', window.location.origin);
  const params = baseUrl.searchParams;

  // Use postMessage transport for popup mode / 팝업 모드에서는 postMessage transport 사용
  // No WebSocket URL needed / WebSocket URL 불필요
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
