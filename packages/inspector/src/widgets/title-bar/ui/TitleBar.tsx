/**
 * Title bar widget (Tauri) / 타이틀바 위젯 (Tauri)
 * Composite: home, tabs visibility, adb reverse, settings, window controls
 */
import * as Toast from '@radix-ui/react-toast';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { RefreshCw, Minus, Maximize2, X, Home, Settings, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TabVisibilityToggle } from '@/features/tabs-visibility';
import { useOpenSettings } from '@/shared/lib';
import { getServerUrl, getMetroPort, parseServerUrlToBind } from '@/shared/lib';

/** Toast state for adb reverse result / adb reverse 결과용 토스트 상태 */
type ToastState = { message: string; type: 'success' | 'error' } | null;

export function TitleBar() {
  const openSettings = useOpenSettings();
  const [toast, setToast] = useState<ToastState>(null);
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
  }, [isTauri]);

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

  const serverPort = parseServerUrlToBind(getServerUrl()).port;
  const metroPort = getMetroPort();
  const handleAdbReverse = useCallback(() => {
    if (!isTauri) return;
    const ports = serverPort === metroPort ? [serverPort] : [serverPort, metroPort];
    import('@tauri-apps/api/core')
      .then(({ invoke }) =>
        Promise.all(
          ports.map((port) =>
            invoke<{ success: boolean; message: string }>('adb_reverse_port', { port })
          )
        )
      )
      .then((results) => {
        const allOk = results.every((r) => r.success);
        const summary =
          ports.length === 1
            ? (results[0]?.message ?? `adb reverse tcp:${serverPort} succeeded.`)
            : allOk
              ? `adb reverse tcp:${serverPort}, tcp:${metroPort} succeeded.`
              : results
                  .filter((r) => !r.success)
                  .map((r) => r.message)
                  .join(' ') || 'adb reverse failed.';
        setToast({ message: summary, type: allOk ? 'success' : 'error' });
      })
      .catch((err) => {
        const msg = typeof err === 'string' ? err : (err?.message ?? String(err));
        setToast({ message: msg, type: 'error' });
      });
  }, [isTauri, serverPort, metroPort]);

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-[1000] h-[35px] bg-gray-700 border-b border-gray-600 select-none grid grid-cols-[1fr_max-content]">
        <div
          className="titlebar-drag-region flex items-center"
          data-tauri-drag-region={isTauri ? true : undefined}
        >
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
          {isTauri && <TabVisibilityToggle />}
        </div>
        {isTauri && (
          <div className="flex items-center gap-2">
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleAdbReverse}
                  className="titlebar-nav-button cursor-pointer h-auto px-2.5 py-1.5 rounded text-xs transition-all text-gray-400 hover:text-gray-200 hover:bg-gray-600/50"
                  aria-label={`Run adb reverse for ports ${serverPort}, ${metroPort}`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="z-[1001]">
                <p>
                  Run adb reverse for tcp:{serverPort} (Server), tcp:{metroPort} (Metro)
                </p>
              </TooltipContent>
            </Tooltip>
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
      {/* Radix Toast for adb reverse result / adb reverse 결과 토스트 */}
      {toast && (
        <Toast.Root
          type="foreground"
          duration={3000}
          open={!!toast}
          onOpenChange={(open) => !open && setToast(null)}
          className="rounded-lg shadow-lg px-4 py-2 text-sm text-white max-w-[90vw] line-clamp-2 data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-bottom-full"
          style={{
            backgroundColor: toast.type === 'success' ? '#22c55e' : '#ef4444',
          }}
        >
          <Toast.Description>
            {toast.type === 'success' ? '✓ ' : '✗ '}
            {toast.message}
          </Toast.Description>
        </Toast.Root>
      )}
    </>
  );
}
