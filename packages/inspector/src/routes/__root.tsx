// Root route
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { RefreshCw, Minus, Maximize2, X, Globe, Smartphone, Eye, EyeOff, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useServerUrl } from '@/shared/lib/server-url';

// Client type filter component / 클라이언트 타입 필터 컴포넌트
function ClientTypeFilter() {
  const [showWeb, setShowWeb] = useState(true);
  const [showReactNative, setShowReactNative] = useState(true);
  const [reactotronEnabled, setReactotronEnabled] = useState(false);
  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  const { setServerUrl } = useServerUrl(); // Get setServerUrl function / setServerUrl 함수 가져오기

  // Load filter state from localStorage / localStorage에서 필터 상태 로드
  useEffect(() => {
    const savedShowWeb = localStorage.getItem('client-filter-web');
    const savedShowRN = localStorage.getItem('client-filter-react-native');
    const savedReactotron = localStorage.getItem('reactotron-enabled');
    if (savedShowWeb !== null) {
      setShowWeb(savedShowWeb === 'true');
    }
    if (savedShowRN !== null) {
      setShowReactNative(savedShowRN === 'true');
    }
    if (savedReactotron !== null) {
      const isEnabled = savedReactotron === 'true';
      setReactotronEnabled(isEnabled);

      // Set server URL based on Reactotron state / Reactotron 상태에 따라 서버 URL 설정
      if (isEnabled) {
        setServerUrl('http://localhost:9090');
      } else {
        setServerUrl('http://localhost:8080');
      }
    } else {
      // Default to 8080 if not set / 설정되지 않았으면 기본값 8080
      setServerUrl('http://localhost:8080');
    }

    // Check Reactotron server status on mount / 마운트 시 Reactotron 서버 상태 확인
    if (isTauri && savedReactotron === 'true') {
      checkReactotronStatus();
    }
  }, [setServerUrl]);

  // Check Reactotron server status / Reactotron 서버 상태 확인
  const checkReactotronStatus = async () => {
    if (!isTauri) return;
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const isRunning = await invoke<boolean>('is_reactotron_server_running');
      setReactotronEnabled(isRunning);
      if (isRunning !== (localStorage.getItem('reactotron-enabled') === 'true')) {
        localStorage.setItem('reactotron-enabled', String(isRunning));
      }
    } catch (error) {
      console.error('Failed to check Reactotron server status:', error);
    }
  };

  // Save filter state to localStorage / 필터 상태를 localStorage에 저장
  const handleWebToggle = () => {
    const newValue = !showWeb;
    setShowWeb(newValue);
    localStorage.setItem('client-filter-web', String(newValue));
    // Dispatch custom event to notify other components / 다른 컴포넌트에 알리기 위한 커스텀 이벤트 발생
    window.dispatchEvent(
      new CustomEvent('client-filter-change', {
        detail: { web: newValue, reactNative: showReactNative },
      })
    );
  };

  const handleReactNativeToggle = () => {
    const newValue = !showReactNative;
    setShowReactNative(newValue);
    localStorage.setItem('client-filter-react-native', String(newValue));
    // Dispatch custom event to notify other components / 다른 컴포넌트에 알리기 위한 커스텀 이벤트 발생
    window.dispatchEvent(
      new CustomEvent('client-filter-change', { detail: { web: showWeb, reactNative: newValue } })
    );
  };

  // Handle Reactotron toggle / Reactotron 토글 처리
  const handleReactotronToggle = async () => {
    if (!isTauri) return;

    const newValue = !reactotronEnabled;
    setReactotronEnabled(newValue);
    localStorage.setItem('reactotron-enabled', String(newValue));

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const port = 9090; // Reactotron default port / Reactotron 기본 포트
      const host = '0.0.0.0';

      if (newValue) {
        console.log('[Reactotron] Starting Reactotron server...');
        await invoke('start_reactotron_server', { port, host });
        console.log('[Reactotron] ✅ Reactotron server started successfully');

        // Update server URL to 9090 / 서버 URL을 9090으로 변경
        setServerUrl('http://localhost:9090');
        console.log('[Reactotron] ✅ Server URL updated to http://localhost:9090');
      } else {
        console.log('[Reactotron] Stopping Reactotron server...');
        await invoke('stop_reactotron_server', { port, host });
        console.log('[Reactotron] ✅ Reactotron server stopped successfully');

        // Update server URL back to 8080 / 서버 URL을 8080으로 되돌림
        setServerUrl('http://localhost:8080');
        console.log('[Reactotron] ✅ Server URL updated to http://localhost:8080');
      }
    } catch (error) {
      console.error('[Reactotron] ❌ Failed to toggle Reactotron server:', error);
      // Revert state on error / 에러 시 상태 되돌리기
      setReactotronEnabled(!newValue);
      localStorage.setItem('reactotron-enabled', String(!newValue));
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
            <p>Reactotron {reactotronEnabled ? '(enabled)' : '(disabled)'}</p>
          </TooltipContent>
        </Tooltip>
      )}
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReactNativeToggle}
            className={`cursor-pointer h-auto px-2.5 py-1.5 rounded text-xs transition-all ${
              showReactNative
                ? 'bg-gray-600 text-gray-100 shadow-sm hover:bg-gray-500'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-600/50 opacity-50'
            }`}
            aria-label="React Native Filter"
            aria-pressed={showReactNative}
          >
            <Smartphone className="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="z-[1001]">
          <p>React Native {showReactNative ? '(shown)' : '(hidden)'}</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleWebToggle}
            className={`cursor-pointer h-auto px-2.5 py-1.5 rounded text-xs transition-all ${
              showWeb
                ? 'bg-gray-600 text-gray-100 shadow-sm hover:bg-gray-500'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-600/50 opacity-50'
            }`}
            aria-label="Web Filter"
            aria-pressed={showWeb}
          >
            <Globe className="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="z-[1001]">
          <p>Web {showWeb ? '(shown)' : '(hidden)'}</p>
        </TooltipContent>
      </Tooltip>
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

  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  useEffect(() => {
    if (isTauri) {
      import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
        setAppWindow(getCurrentWindow());
      });
    }
  }, []);

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
        {/* Client type filter (always show in Tauri) / 클라이언트 타입 필터 (Tauri에서 항상 표시) */}
        {isTauri && <ClientTypeFilter />}
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

// Export filter state getter function / 필터 상태를 가져오는 함수 export
export function getClientTypeFilter(): { web: boolean; reactNative: boolean; reactotron: boolean } {
  const showWeb = localStorage.getItem('client-filter-web') !== 'false';
  const showReactNative = localStorage.getItem('client-filter-react-native') !== 'false';
  const showReactotron = localStorage.getItem('reactotron-enabled') === 'true';
  return { web: showWeb, reactNative: showReactNative, reactotron: showReactotron };
}

// Export tab visibility getter function / 탭 표시 상태를 가져오는 함수 export
export function getTabsVisibility(): boolean {
  const visible = localStorage.getItem('tabs-visible');
  return visible !== 'false'; // Default to true / 기본값은 true
}
