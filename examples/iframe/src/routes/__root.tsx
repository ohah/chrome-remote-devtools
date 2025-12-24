// Root route / 루트 라우트
import { createRootRoute, Outlet } from '@tanstack/react-router';
import Navigation from '../components/Navigation';
import DevToolsIframe from '../components/DevToolsIframe';
import { useState, useEffect } from 'react';
import { getClientId } from '../utils/devtools';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const [clientId, setClientId] = useState<string | null>(null);

  // Check for client ID periodically / 클라이언트 ID를 주기적으로 확인
  useEffect(() => {
    // Initial check / 초기 확인
    const id = getClientId();
    if (id) {
      setClientId(id);
      return;
    }

    // Poll for client ID (client script may load later) / 클라이언트 ID 폴링 (클라이언트 스크립트가 나중에 로드될 수 있음)
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
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden w-screen m-0 p-0">
      <Navigation />
      <main className="flex-1 bg-gray-900 w-full max-w-none m-0 p-0 flex flex-col overflow-x-hidden relative pb-0 mb-0">
        <Outlet />
      </main>
      {/* DevTools iframe / DevTools iframe */}
      <DevToolsIframe clientId={clientId} />
    </div>
  );
}
