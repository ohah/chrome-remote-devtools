/**
 * Title bar (Electrobun) - same look as inspector, no Tauri APIs / 타이틀바 (Electrobun)
 */
import { Minus, RefreshCw, Settings, Square, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useOpenSettings } from '@/shared/lib/settings-store';

function requestWindow(method: 'closeWindow' | 'minimizeWindow' | 'toggleMaximizeWindow') {
  const rpc = (
    window as Window & {
      __electrobunRpc?: { request: (m: string, p: unknown) => Promise<unknown> };
    }
  ).__electrobunRpc;
  rpc?.request(method, {}).catch(() => {});
}

export function TitleBar() {
  const openSettings = useOpenSettings();

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[1000] h-[35px] bg-gray-700 border-b border-gray-600 select-none grid grid-cols-[1fr_max-content]">
      {/* Draggable region (Electrobun: electrobun-webkit-app-region-drag) / 드래그 영역 */}
      <div className="titlebar-drag-region electrobun-webkit-app-region-drag flex items-center">
        <span className="text-sm text-gray-400 ml-3 font-medium">React Native DevTools</span>
      </div>
      <div className="flex items-center gap-1 pr-1">
        {/* App actions first (same order as Tauri Inspector) / 앱 버튼 먼저 */}
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              className="titlebar-nav-button cursor-pointer h-auto px-2.5 py-1.5 rounded text-xs transition-all text-gray-400 hover:text-gray-200 hover:bg-gray-600/50"
              aria-label="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="z-[1001]">
            <p>Refresh</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={openSettings}
              className="titlebar-nav-button cursor-pointer h-auto px-2.5 py-1.5 rounded text-xs transition-all text-gray-400 hover:text-gray-200 hover:bg-gray-600/50"
              aria-label="Metro settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="z-[1001]">
            <p>Metro URL settings</p>
          </TooltipContent>
        </Tooltip>
        {/* Window controls last (rightmost, same as Tauri) / 창 제어 맨 오른쪽 */}
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => requestWindow('minimizeWindow')}
              className="titlebar-nav-button cursor-pointer h-auto px-2 py-1 rounded text-xs transition-all text-gray-400 hover:text-gray-200 hover:bg-gray-600/50"
              aria-label="Minimize"
            >
              <Minus className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="z-[1001]">
            <p>Minimize</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => requestWindow('toggleMaximizeWindow')}
              className="titlebar-nav-button cursor-pointer h-auto px-2 py-1 rounded text-xs transition-all text-gray-400 hover:text-gray-200 hover:bg-gray-600/50"
              aria-label="Maximize"
            >
              <Square className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="z-[1001]">
            <p>Maximize</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => requestWindow('closeWindow')}
              className="titlebar-nav-button cursor-pointer h-auto px-2 py-1 rounded text-xs transition-all text-gray-400 hover:text-red-400 hover:bg-gray-600/50"
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
    </div>
  );
}
