// Root route
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { RefreshCw, Minus, Maximize2, X, Globe, Smartphone, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Client type filter component / 클라이언트 타입 필터 컴포넌트
function ClientTypeFilter() {
  const [showWeb, setShowWeb] = useState(true);
  const [showReactNative, setShowReactNative] = useState(true);

  // Load filter state from localStorage / localStorage에서 필터 상태 로드
  useEffect(() => {
    const savedShowWeb = localStorage.getItem('client-filter-web');
    const savedShowRN = localStorage.getItem('client-filter-react-native');
    if (savedShowWeb !== null) {
      setShowWeb(savedShowWeb === 'true');
    }
    if (savedShowRN !== null) {
      setShowReactNative(savedShowRN === 'true');
    }
  }, []);

  // Save filter state to localStorage / 필터 상태를 localStorage에 저장
  const handleWebToggle = () => {
    const newValue = !showWeb;
    setShowWeb(newValue);
    localStorage.setItem('client-filter-web', String(newValue));
    // Dispatch custom event to notify other components / 다른 컴포넌트에 알리기 위한 커스텀 이벤트 발생
    window.dispatchEvent(new CustomEvent('client-filter-change', { detail: { web: newValue, reactNative: showReactNative } }));
  };

  const handleReactNativeToggle = () => {
    const newValue = !showReactNative;
    setShowReactNative(newValue);
    localStorage.setItem('client-filter-react-native', String(newValue));
    // Dispatch custom event to notify other components / 다른 컴포넌트에 알리기 위한 커스텀 이벤트 발생
    window.dispatchEvent(new CustomEvent('client-filter-change', { detail: { web: showWeb, reactNative: newValue } }));
  };

  return (
    <div className="flex items-center gap-0.5 px-0.5 py-0.5 bg-gray-700/30 rounded titlebar-nav-button ml-2">
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
        <TooltipContent side="bottom" className="z-1001">
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
        <TooltipContent side="bottom" className="z-1001">
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
    window.dispatchEvent(new CustomEvent('tabs-visibility-change', { detail: { visible: newValue } }));
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
      <TooltipContent side="bottom" className="z-1001">
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
    <div className="fixed top-0 left-0 right-0 z-1000 h-[35px] bg-gray-800 select-none grid grid-cols-[1fr_max-content]">
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
            <TooltipContent side="bottom" className="z-1001">
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
            <TooltipContent side="bottom" className="z-1001">
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
            <TooltipContent side="bottom" className="z-1001">
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
            <TooltipContent side="bottom" className="z-1001">
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
export function getClientTypeFilter(): { web: boolean; reactNative: boolean } {
  const showWeb = localStorage.getItem('client-filter-web') !== 'false';
  const showReactNative = localStorage.getItem('client-filter-react-native') !== 'false';
  return { web: showWeb, reactNative: showReactNative };
}

// Export tab visibility getter function / 탭 표시 상태를 가져오는 함수 export
export function getTabsVisibility(): boolean {
  const visible = localStorage.getItem('tabs-visible');
  return visible !== 'false'; // Default to true / 기본값은 true
}
