// Root route
import { createRootRoute, Outlet, useLocation, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw, Minus, Maximize2, X, Globe, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Mode type / 모드 타입
type InspectorMode = 'web' | 'react-native';

// Mode selector component / 모드 선택 컴포넌트
function ModeSelector({
  mode,
  onModeChange,
}: {
  mode: InspectorMode;
  onModeChange: (mode: InspectorMode) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 px-0.5 py-0.5 bg-gray-700/30 rounded titlebar-nav-button">
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onModeChange('react-native')}
            className={`cursor-pointer h-auto px-2.5 py-1.5 rounded text-xs transition-all ${
              mode === 'react-native'
                ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-600/50'
            }`}
            aria-label="React Native Mode"
          >
            <Smartphone className="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="z-[1001]">
          <p>React Native</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onModeChange('web')}
            className={`cursor-pointer h-auto px-2.5 py-1.5 rounded text-xs transition-all ${
              mode === 'web'
                ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-600/50'
            }`}
            aria-label="Web Remote Mode"
          >
            <Globe className="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="z-[1001]">
          <p>Web</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

// Title bar component
function TitleBar({ showBack = false }: { showBack?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [appWindow, setAppWindow] = useState<ReturnType<
    typeof import('@tauri-apps/api/window').getCurrentWindow
  > | null>(null);
  const [mode, setMode] = useState<InspectorMode>(() => {
    // Load mode from localStorage / localStorage에서 모드 로드
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('inspector-mode');
      return (saved === 'web' || saved === 'react-native' ? saved : 'web') as InspectorMode;
    }
    return 'web';
  });

  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  const isTauriPage = location.pathname === '/tauri';

  useEffect(() => {
    if (isTauri) {
      import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
        setAppWindow(getCurrentWindow());
      });
    }
  }, []);

  useEffect(() => {
    // Save mode to localStorage / 모드를 localStorage에 저장
    if (typeof window !== 'undefined') {
      localStorage.setItem('inspector-mode', mode);
    }
  }, [mode]);

  const handleBack = () => {
    navigate({ to: '/' });
  };

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
        {/* Mode selector (only on Tauri page) / 모드 선택기 (Tauri 페이지에서만) */}
        {isTauri && isTauriPage && <ModeSelector mode={mode} onModeChange={setMode} />}
        {showBack && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="titlebar-nav-button h-6 w-6 bg-transparent text-gray-400 hover:bg-white/10 rounded ml-1"
                onClick={handleBack}
                aria-label="Go back"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="z-[1001]">
              <p>Back</p>
            </TooltipContent>
          </Tooltip>
        )}
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

export const Route = createRootRoute({
  component: () => {
    const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
    const location = useLocation();
    const currentPath = location.pathname;
    const showTitleBar = isTauri;
    // Show back button on routes that are not the root / 루트가 아닌 경로에서 뒤로가기 버튼 표시
    const routesWithBackButton = ['/replay'];
    const isDevtoolsRoute = currentPath.startsWith('/devtools/');
    const showBack = routesWithBackButton.includes(currentPath) || isDevtoolsRoute;
    return (
      <div className="h-screen flex flex-col bg-gray-900">
        {showTitleBar && <TitleBar showBack={showBack} />}
        <div className={`flex-1 overflow-hidden ${showTitleBar ? 'pt-[35px]' : ''}`}>
          <Outlet />
        </div>
      </div>
    );
  },
});

// Export mode type for use in other components / 다른 컴포넌트에서 사용할 수 있도록 모드 타입 export
export type { InspectorMode };
