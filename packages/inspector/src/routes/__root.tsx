// Root route / 루트 라우트
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useClientsListSSE } from '@/entities/client';
import { SettingsModal } from '@/features/settings';
import { getServerUrl, parseServerUrlToBind, useSettingsModalStore } from '@/shared/lib';
import { TitleBar } from '@/widgets/title-bar';

function RootComponent() {
  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  const showTitleBar = isTauri;
  const isSettingsOpen = useSettingsModalStore((s) => s.isSettingsOpen);
  const closeSettings = useSettingsModalStore((s) => s.closeSettings);

  // Start embedded server on port from Inspector Server URL when running in Tauri /
  // Tauri 실행 시 인스펙터 Server URL 설정의 포트로 내장 서버 시작
  // Only start if not already running so refresh does not restart server and break Metro proxy WS /
  // 이미 실행 중이면 시작하지 않아 새로고침 시 서버 재시작으로 Metro proxy WS 끊김 방지
  useEffect(() => {
    if (!isTauri) return;
    const url = getServerUrl();
    const { port, host } = parseServerUrlToBind(url);
    import('@tauri-apps/api/core')
      .then(({ invoke }) =>
        invoke<boolean>('is_server_running').then((running) => {
          if (running) return;
          return invoke('start_server', { port, host });
        })
      )
      .catch((e) => console.error('[inspector] Failed to start embedded server:', e));
  }, [isTauri]);

  useClientsListSSE();

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {showTitleBar && <TitleBar />}
      <div className={`flex-1 overflow-hidden ${showTitleBar ? 'pt-[35px]' : ''}`}>
        <Outlet />
      </div>
      <SettingsModal isOpen={isSettingsOpen} onClose={closeSettings} />
    </div>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});
