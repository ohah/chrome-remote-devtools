// DevTools page / 데브툴 페이지
import { useEffect, useRef } from 'react';
import { useParams } from '@tanstack/react-router';

// Export component for route / 라우트용 컴포넌트 export
export { DevToolsPage as component };

function DevToolsPage() {
  // Get clientId from route params / 라우트 파라미터에서 clientId 가져오기
  const { clientId } = useParams({ from: '/devtools/$clientId' });
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Setup DevTools iframe with WebSocket URL parameter / WebSocket URL 파라미터와 함께 DevTools iframe 설정
  useEffect(() => {
    if (!iframeRef.current || !clientId) return;

    const url = new URL('/devtools-frontend/devtools_app.html', window.location.origin);
    const params = url.searchParams;

    // WebSocket URL parameter / WebSocket URL 파라미터
    // Use a stable ID instead of Date.now() to avoid iframe reloads / iframe 리로드를 방지하기 위해 Date.now() 대신 안정적인 ID 사용
    const devtoolsId = `devtools-${clientId}`;
    const wsUrl = `localhost:8080/remote/debug/devtools/${devtoolsId}?clientId=${clientId}`;
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

    iframeRef.current.src = url.toString();
  }, [clientId]);

  return (
    <div className="w-full h-screen flex flex-col">
      {/* DevTools iframe / DevTools iframe */}
      <iframe
        ref={iframeRef}
        className="flex-1 w-full border-none"
        title="DevTools"
      />
    </div>
  );
}

