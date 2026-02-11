/**
 * Tab visibility toggle button / 탭 표시/숨김 토글 버튼
 */
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTabsVisibility } from '../model/use-tabs-visibility';

export function TabVisibilityToggle() {
  const { showTabs, toggle } = useTabsVisibility();

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
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
