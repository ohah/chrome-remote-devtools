/**
 * Reactotron server toggle for Tauri title bar.
 * Use in __root.tsx: {isTauri && <ReactotronToggle />}
 */
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useState, useCallback } from 'react';
import { Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useServerUrl } from '@/shared/lib/server-url';

export function ReactotronToggle() {
  const [reactotronEnabled, setReactotronEnabled] = useState(false);
  const [shutdownStatus, setShutdownStatus] = useState<string | null>(null);
  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  const navigate = useNavigate();
  const { setReactotronMode, setNormalServerUrl, setReactotronServerUrl } = useServerUrl();

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

  useEffect(() => {
    const savedReactotron = localStorage.getItem('reactotron-enabled');
    if (savedReactotron !== null) {
      const isEnabled = savedReactotron === 'true';
      setReactotronEnabled(isEnabled);
      setReactotronMode(isEnabled);
    } else {
      setReactotronMode(false);
    }

    setNormalServerUrl('http://localhost:8080');
    setReactotronServerUrl('http://localhost:9090');

    if (isTauri && savedReactotron === 'true') {
      checkReactotronStatus();
    }
  }, [
    setReactotronMode,
    setNormalServerUrl,
    setReactotronServerUrl,
    checkReactotronStatus,
    isTauri,
  ]);

  const handleReactotronToggle = async () => {
    if (!isTauri) return;

    const newValue = !reactotronEnabled;
    setReactotronEnabled(newValue);
    localStorage.setItem('reactotron-enabled', String(newValue));
    setShutdownStatus(null);

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const port = 9090;
      const host = '0.0.0.0';

      if (newValue) {
        console.log('[Reactotron] Starting Reactotron server...');
        const status = await invoke<string>('start_reactotron_server', { port, host });
        console.log('[Reactotron] ✅ Reactotron server started successfully');
        setShutdownStatus(status);

        setReactotronMode(true);
        setReactotronServerUrl('http://localhost:9090');
        console.log('[Reactotron] ✅ Reactotron mode enabled, server URL: http://localhost:9090');
      } else {
        console.log('[Reactotron] Stopping Reactotron server...');
        const status = await invoke<string>('stop_reactotron_server', { port: 8080, host });
        console.log('[Reactotron] ✅ Reactotron server stopped successfully');
        setShutdownStatus(status);

        setReactotronMode(false);
        setNormalServerUrl('http://localhost:8080');
        console.log('[Reactotron] ✅ Reactotron mode disabled, server URL: http://localhost:8080');
      }

      localStorage.removeItem('closed-tabs');
      window.dispatchEvent(new CustomEvent('reset-tabs-state'));
      const { queryClient } = await import('@/shared/api/query-client');
      const { clientQueries } = await import('@/entities/client');
      queryClient.invalidateQueries({ queryKey: clientQueries.all() });
      navigate({ to: '/' });
    } catch (error) {
      console.error('[Reactotron] ❌ Failed to toggle Reactotron server:', error);
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
