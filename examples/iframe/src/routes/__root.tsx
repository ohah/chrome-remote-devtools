// Root route / 루트 라우트
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import DevToolsIframe from '@/components/DevToolsIframe';
import DevToolsPopup from '@/components/DevToolsPopup';
import { getClientId } from '@/utils/devtools';
import Navigation from '@/components/Navigation';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const [clientId, setClientId] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [showIframe, setShowIframe] = useState(true);

  // Check for client ID periodically / 클라이언트 ID를 주기적으로 확인
  useEffect(() => {
    // Initial check / 초기 확인
    const id = getClientId();
    if (id) {
      setClientId(id);
    }

    // Listen for SET_DEBUG_ID message from client script (iframe mode) / 클라이언트 스크립트로부터 SET_DEBUG_ID 메시지 수신 (iframe 모드)
    const handleMessage = (event: MessageEvent<{ type: string; debugId?: string }>) => {
      // Only accept messages from same origin / 같은 origin으로부터의 메시지만 수락
      if (event.origin !== window.location.origin) {
        return;
      }

      // Only handle SET_DEBUG_ID messages / SET_DEBUG_ID 메시지만 처리
      if (event.data?.type === 'SET_DEBUG_ID' && event.data.debugId) {
        // Avoid duplicate storage / 중복 저장 방지
        const currentId = sessionStorage.getItem('debug_id');
        if (currentId === event.data.debugId) {
          return;
        }

        // Store in sessionStorage for consistency / 일관성을 위해 sessionStorage에 저장
        sessionStorage.setItem('debug_id', event.data.debugId);
        setClientId(event.data.debugId);
      }
    };

    window.addEventListener('message', handleMessage);

    // Poll for client ID (client script may load later) / 클라이언트 ID 폴링 (클라이언트 스크립트가 나중에 로드될 수 있음)
    // In iframe mode, client script creates debug_id immediately / iframe 모드에서는 클라이언트 스크립트가 즉시 debug_id 생성
    const interval = setInterval(() => {
      const id = getClientId();
      if (id) {
        setClientId(id);
        clearInterval(interval);
      }
    }, 200);

    // Cleanup after 30 seconds / 30초 후 정리
    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 30000);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation clientId={clientId} showIframe={showIframe} showPopup={showPopup} onToggleIframe={() => {
        setShowIframe(!showIframe);
        if (showIframe) {
          setShowPopup(false);
        }
      }} onTogglePopup={() => {
        setShowPopup(!showPopup);
        if (showPopup) {
          setShowIframe(false);
        }
      }} />

      <div className="flex-1 pb-0 mb-0">
        <main className="max-w-5xl mx-auto p-8">
          <Outlet />
        </main>
      </div>

      {/* DevTools iframe / DevTools iframe */}
      {showIframe && <DevToolsIframe clientId={clientId} />}

      {/* DevTools popup / DevTools 팝업 */}
      {showPopup && (
        <DevToolsPopup
          clientId={clientId}
          onClose={() => {
            setShowPopup(false);
            setShowIframe(true);
          }}
        />
      )}
    </div>
  );
}

