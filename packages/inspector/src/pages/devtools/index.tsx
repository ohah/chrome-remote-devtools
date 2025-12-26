// DevTools page / 데브툴 페이지
import { useEffect, useRef } from 'react';
import { useParams } from '@tanstack/react-router';
import { buildDevToolsUrl } from '@/shared/lib/devtools-url';

// Export component for route / 라우트용 컴포넌트 export
export { DevToolsPage as component };

function DevToolsPage() {
  // Get clientId from route params / 라우트 파라미터에서 clientId 가져오기
  const { clientId } = useParams({ from: '/devtools/$clientId' });
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Setup DevTools iframe with WebSocket URL parameter / WebSocket URL 파라미터와 함께 DevTools iframe 설정
  useEffect(() => {
    if (!iframeRef.current || !clientId) return;

    const devtoolsUrl = buildDevToolsUrl(clientId);
    iframeRef.current.src = devtoolsUrl;
  }, [clientId]);

  return (
    <div className="w-full h-screen">
        {/* DevTools iframe / DevTools iframe */}
        <iframe
          ref={iframeRef}
          className="w-full h-full border-none"
          title="DevTools"
        />
    </div>
  );
}

