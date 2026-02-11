// Root route
import { createRootRoute, Outlet, useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Minus, Maximize2, X, Eye, EyeOff, Home, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useClientsListSSE } from '@/entities/client';
import { SettingsModal } from '@/features/settings';
import {
  useSettingsModalStore,
  useOpenSettings,
  getServerUrl,
  parseServerUrlToBind,
} from '@/shared/lib';

// Tab visibility toggle component / 탭 표시/숨김 토글 컴포넌트
function TabVisibilityToggle() {
  const [showTabs, setShowTabs] = useState(true);

  // Load tab visibility state from localStorage / localStorage에서 탭 표시 상태 로드
  useEffect(() => {
    const savedShowTabs = localStorage.getItem('tabs-visible');
    if (savedShowTabs !== null) {
      setShowTabs(savedShowTabs === 'true');
    }
  }, []);

  // Toggle tab visibility / 탭 표시/숨김 토글
  const handleToggle = () => {
    const newValue = !showTabs;
    setShowTabs(newValue);
    localStorage.setItem('tabs-visible', String(newValue));
    // Dispatch custom event to notify other components / 다른 컴포넌트에 알리기 위한 커스텀 이벤트 발생
    window.dispatchEvent(
      new CustomEvent('tabs-visibility-change', { detail: { visible: newValue } })
    );
  };

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggle}
          className="titlebar-nav-button cursor-pointer h-auto px-2.5 py-1.5 rounded text-xs transition-all text-gray-400 hover:text-gray-200 hover:bg-gray-600/50 ml-2"
          aria-label={showTabs ? 'Hide tabs' : 'Show tabs'}
          aria-pressed={showTabs}
        >
          {showTabs ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="z-[1001]">
        <p>{showTabs ? 'Hide tabs' : 'Show tabs'}</p>
      </TooltipContent>
    </Tooltip>
  );
}

// Title bar component
function TitleBar() {
  const openSettings = useOpenSettings();
  const [appWindow, setAppWindow] = useState<ReturnType<
    typeof import('@tauri-apps/api/window').getCurrentWindow
  > | null>(null);
  const navigate = useNavigate();
  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  useEffect(() => {
    if (isTauri) {
      import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
        setAppWindow(getCurrentWindow());
      });
    }
  }, []);

  const handleHome = useCallback(() => {
    navigate({ to: '/' });
  }, [navigate]);

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleMinimize = () => {
    if (appWindow) {
      void appWindow.minimize();
    }
  };

  const handleMaximize = () => {
    if (appWindow) {
      void appWindow.toggleMaximize();
    }
  };

  const handleClose = () => {
    if (appWindow) {
      void appWindow.close();
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[1000] h-[35px] bg-gray-700 border-b border-gray-600 select-none grid grid-cols-[1fr_max-content]">
      <div
        className="titlebar-drag-region flex items-center"
        data-tauri-drag-region={isTauri ? true : undefined}
      >
        {/* Home button / 홈 버튼 */}
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleHome}
              className="titlebar-nav-button cursor-pointer h-auto px-2.5 py-1.5 rounded text-xs transition-all text-gray-400 hover:text-gray-200 hover:bg-gray-600/50 ml-2"
              aria-label="Go to home"
            >
              <Home className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="z-[1001]">
            <p>Go to home</p>
          </TooltipContent>
        </Tooltip>
        {/* Tab visibility toggle (always show in Tauri) / 탭 표시/숨김 토글 (Tauri에서 항상 표시) */}
        {isTauri && <TabVisibilityToggle />}
      </div>
      {isTauri && (
        <div className="flex items-center gap-2">
          {/* Host/Settings button (right side of title bar) / 타이틀바 우측 호스트 설정 버튼 */}
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={openSettings}
                className="titlebar-nav-button cursor-pointer h-auto px-2.5 py-1.5 rounded text-xs transition-all text-gray-400 hover:text-gray-200 hover:bg-gray-600/50"
                aria-label="Host settings"
              >
                <Settings className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="z-[1001]">
              <p>Host settings (Server URL, Metro URL)</p>
            </TooltipContent>
          </Tooltip>
          {appWindow && (
            <div className="titlebar-controls flex">
              {/* Refresh button / 새로고침 버튼 */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-[35px] w-[35px] bg-transparent text-gray-400 hover:bg-white/10"
                    onClick={handleRefresh}
                    aria-label="Refresh"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="z-[1001]">
                  <p>Refresh</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-[35px] w-[35px] bg-transparent text-gray-400 hover:bg-white/10"
                    onClick={handleMinimize}
                    aria-label="Minimize"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="z-[1001]">
                  <p>Minimize</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-[35px] w-[35px] bg-transparent text-gray-400 hover:bg-white/10"
                    onClick={handleMaximize}
                    aria-label="Maximize"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="z-[1001]">
                  <p>Maximize</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-[35px] w-[35px] bg-transparent text-gray-400 hover:bg-red-500 hover:text-white"
                    onClick={handleClose}
                    aria-label="Close"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="z-[1001]">
                  <p>Close</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Root component / 루트 컴포넌트
function RootComponent() {
  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  const showTitleBar = isTauri;
  // Only Root subscribes to isSettingsOpen → only Root re-renders when modal toggles / 모달 토글 시 Root만 리렌더
  const isSettingsOpen = useSettingsModalStore((s) => s.isSettingsOpen);
  const closeSettings = useSettingsModalStore((s) => s.closeSettings);

  // Start embedded server on port from Inspector Server URL when running in Tauri /
  // Tauri 실행 시 인스펙터 Server URL 설정의 포트로 내장 서버 시작
  useEffect(() => {
    if (!isTauri) return;
    const url = getServerUrl();
    const { port, host } = parseServerUrlToBind(url);
    import('@tauri-apps/api/core')
      .then(({ invoke }) => invoke('start_server', { port, host }))
      .catch((e) => console.error('[inspector] Failed to start embedded server:', e));
  }, [isTauri]);

  // Subscribe to client list SSE for live updates / 클라이언트 목록 실시간 갱신을 위한 SSE 구독
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

// Export tab visibility getter function / 탭 표시 상태를 가져오는 함수 export
export function getTabsVisibility(): boolean {
  const visible = localStorage.getItem('tabs-visible');
  return visible !== 'false'; // Default to true / 기본값은 true
}
