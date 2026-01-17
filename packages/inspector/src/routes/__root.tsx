// Root route
import { createRootRoute, Outlet, useNavigate } from '@tanstack/react-router';
import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Minus, Maximize2, X, Eye, EyeOff, Zap, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useServerUrl } from '@/shared/lib/server-url';

// Reactotron server toggle component / Reactotron 서버 토글 컴포넌트
function ReactotronToggle() {
  const [reactotronEnabled, setReactotronEnabled] = useState(false);
  const [shutdownStatus, setShutdownStatus] = useState<string | null>(null);
  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  const navigate = useNavigate();
  const { setReactotronMode, setNormalServerUrl, setReactotronServerUrl } = useServerUrl(); // Get server URL functions / 서버 URL 함수 가져오기

  // Check Reactotron server status / Reactotron 서버 상태 확인
  const checkReactotronStatus = useCallback(async () => {
    if (!isTauri) return;
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const isRunning = await invoke<boolean>('is_reactotron_server_running');
      setReactotronEnabled(isRunning);
      setReactotronMode(isRunning);
      if (isRunning !== (localStorage.getItem('reactotron-enabled') === 'true')) {
        localStorage.setItem('reactotron-enabled', String(isRunning));
      }
    } catch (error) {
      console.error('Failed to check Reactotron server status:', error);
    }
  }, [isTauri, setReactotronMode]);

  // Load Reactotron state from localStorage / localStorage에서 Reactotron 상태 로드
  useEffect(() => {
    const savedReactotron = localStorage.getItem('reactotron-enabled');
    if (savedReactotron !== null) {
      const isEnabled = savedReactotron === 'true';
      setReactotronEnabled(isEnabled);
      // Set Reactotron mode in store / store에 Reactotron 모드 설정
      setReactotronMode(isEnabled);
    } else {
      // Default to false if not set / 설정되지 않았으면 기본값 false
      setReactotronMode(false);
    }

    // Set default server URLs if not set / 설정되지 않았으면 기본 서버 URL 설정
    // These will be used when switching modes / 모드 전환 시 사용됨
    setNormalServerUrl('http://localhost:8080');
    setReactotronServerUrl('http://localhost:9090');

    // Check Reactotron server status on mount / 마운트 시 Reactotron 서버 상태 확인
    if (isTauri && savedReactotron === 'true') {
      checkReactotronStatus();
    }
  }, [setReactotronMode, setNormalServerUrl, setReactotronServerUrl, checkReactotronStatus, isTauri]);


  // Handle Reactotron toggle / Reactotron 토글 처리
  const handleReactotronToggle = async () => {
    if (!isTauri) return;

    const newValue = !reactotronEnabled;
    setReactotronEnabled(newValue);
    localStorage.setItem('reactotron-enabled', String(newValue));
    setShutdownStatus(null); // Clear previous status / 이전 상태 클리어

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const port = 9090; // Reactotron default port / Reactotron 기본 포트
      const host = '0.0.0.0';

      if (newValue) {
        console.log('[Reactotron] Starting Reactotron server...');
        const status = await invoke<string>('start_reactotron_server', { port, host });
        console.log('[Reactotron] ✅ Reactotron server started successfully');
        setShutdownStatus(status);

        // Set Reactotron mode and server URL / Reactotron 모드 및 서버 URL 설정
        setReactotronMode(true);
        setReactotronServerUrl('http://localhost:9090');
        console.log('[Reactotron] ✅ Reactotron mode enabled, server URL: http://localhost:9090');
      } else {
        console.log('[Reactotron] Stopping Reactotron server...');
        // Use port 8080 for normal server / 일반 서버를 위해 8080 포트 사용
        const status = await invoke<string>('stop_reactotron_server', { port: 8080, host });
        console.log('[Reactotron] ✅ Reactotron server stopped successfully');
        setShutdownStatus(status);

        // Set normal mode and server URL / 일반 모드 및 서버 URL 설정
        setReactotronMode(false);
        setNormalServerUrl('http://localhost:8080');
        console.log('[Reactotron] ✅ Reactotron mode disabled, server URL: http://localhost:8080');
      }

      // Clear tab information and navigate to home page / 탭 정보 초기화 후 홈 페이지로 이동
      // Clear closed tabs from localStorage / localStorage에서 닫힌 탭 클리어
      localStorage.removeItem('closed-tabs');
      // Dispatch event to reset tab state and invalidate client queries / 탭 상태 초기화 및 클라이언트 쿼리 무효화를 위한 이벤트 발생
      window.dispatchEvent(new CustomEvent('reset-tabs-state'));
      // Invalidate client queries to clear cached data / 캐시된 데이터를 지우기 위해 클라이언트 쿼리 무효화
      const { queryClient } = await import('@/shared/api/query-client');
      const { clientQueries } = await import('@/entities/client');
      queryClient.invalidateQueries({ queryKey: clientQueries.all() });
      navigate({ to: '/' });
    } catch (error) {
      console.error('[Reactotron] ❌ Failed to toggle Reactotron server:', error);
      // Revert state on error / 에러 시 상태 되돌리기
      setReactotronEnabled(!newValue);
      localStorage.setItem('reactotron-enabled', String(!newValue));
      setShutdownStatus(null);
    }
  };

  return (
    <div className="flex items-center gap-0.5 px-0.5 py-0.5 bg-gray-700/30 rounded titlebar-nav-button ml-2">
      {isTauri && (
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleReactotronToggle}
              className={`cursor-pointer h-auto px-2.5 py-1.5 rounded text-xs transition-all ${
                reactotronEnabled
                  ? 'bg-gray-600 text-gray-100 shadow-sm hover:bg-gray-500'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-600/50 opacity-50'
              }`}
              aria-label="Reactotron Server"
              aria-pressed={reactotronEnabled}
            >
              <Zap className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="z-[1001]">
            <div className="space-y-1">
              <p>Reactotron {reactotronEnabled ? '(enabled)' : '(disabled)'}</p>
              {shutdownStatus && (
                <p
                  className={`text-xs ${
                    shutdownStatus === 'Graceful'
                      ? 'text-green-400'
                      : shutdownStatus === 'WithIssues' || shutdownStatus === 'Timeout'
                        ? 'text-yellow-400'
                        : 'text-gray-400'
                  }`}
                >
                  Shutdown: {shutdownStatus}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

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
    <div className="fixed top-0 left-0 right-0 z-[1000] h-[35px] bg-gray-800 select-none grid grid-cols-[1fr_max-content]">
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
        {/* Reactotron toggle (always show in Tauri) / Reactotron 토글 (Tauri에서 항상 표시) */}
        {isTauri && <ReactotronToggle />}
        {/* Tab visibility toggle (always show in Tauri) / 탭 표시/숨김 토글 (Tauri에서 항상 표시) */}
        {isTauri && <TabVisibilityToggle />}
      </div>
      {isTauri && appWindow && (
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
  );
}

// Root component / 루트 컴포넌트
function RootComponent() {
  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  const showTitleBar = isTauri;

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {showTitleBar && <TitleBar />}
      <div className={`flex-1 overflow-hidden ${showTitleBar ? 'pt-[35px]' : ''}`}>
        <Outlet />
      </div>
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
