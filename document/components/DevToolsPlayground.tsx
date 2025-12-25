import React, { useState, useEffect } from 'react';

/**
 * Get origin for embedded mode / embedded 모드를 위한 origin 가져오기
 */
function getHostOrigin(): string {
  let protocol = location.protocol;
  let host = location.host;
  if (protocol === 'about:' || protocol === 'blob:') {
    protocol = window.parent.location.protocol;
    host = window.parent.location.host;
  }
  return `${protocol}//${host}`;
}

/**
 * Build DevTools popup URL / DevTools 팝업 URL 구성
 * Same as popup example / 팝업 예제와 동일
 */
function buildDevToolsUrl(): string {
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

/**
 * Load client script dynamically / 동적으로 클라이언트 스크립트 로드
 * Same as popup example / 팝업 예제와 동일
 * Uses built client.js from document build / 문서 빌드의 빌드된 client.js 사용
 */
function loadClientScript(): void {
  // Check if script is already loaded / 스크립트가 이미 로드되었는지 확인
  if (document.querySelector('script[data-chrome-remote-devtools-client]')) {
    return;
  }

  // Use built client.js from document build / 문서 빌드의 빌드된 client.js 사용
  const script = document.createElement('script');
  script.src = '/client.js';
  script.setAttribute('data-enable-rrweb', 'true');
  script.setAttribute('data-chrome-remote-devtools-client', 'true');
  // Popup mode uses postMessage (no data-server-url needed) / 팝업 모드는 postMessage 사용 (data-server-url 불필요)
  document.head.appendChild(script);
}

/**
 * DevTools Playground Component / DevTools 플레이그라운드 컴포넌트
 * Opens DevTools in a popup window / 팝업 창에서 DevTools를 엽니다
 */
export function DevToolsPlayground({ buttonText = 'Open DevTools' }: { buttonText?: string }) {
  const [popupWindow, setPopupWindow] = useState<Window | null>(null);

  // Load client script on mount / 마운트 시 클라이언트 스크립트 로드
  useEffect(() => {
    loadClientScript();
  }, []);

  const handleOpenDevTools = () => {
    const devToolsUrl = buildDevToolsUrl();

    if (popupWindow && !popupWindow.closed) {
      popupWindow.focus();
    } else {
      const newWindow = window.open(
        devToolsUrl,
        'devtools',
        'width=1200,height=800,resizable=yes,scrollbars=yes'
      );
      setPopupWindow(newWindow);
    }
  };

  return (
    <button
      onClick={handleOpenDevTools}
      style={{
        padding: '12px 24px',
        background: '#3b82f6',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: 500,
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.background = '#2563eb';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.background = '#3b82f6';
      }}
    >
      {buttonText}
    </button>
  );
}
