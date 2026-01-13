// Tabs component / 탭 컴포넌트
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTabId: string | null;
  onTabChange: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTabId, onTabChange, onTabClose, className }: TabsProps) {
  if (tabs.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-end bg-gray-800 border-b border-gray-700 overflow-x-auto',
        className
      )}
    >
      <div className="flex items-end min-w-full">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'group relative flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors',
                'border-b-2 border-transparent hover:bg-gray-700/50',
                isActive && 'bg-gray-900 border-b-2 border-blue-500 text-gray-100',
                !isActive && 'text-gray-400 hover:text-gray-200'
              )}
              aria-selected={isActive}
              role="tab"
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span className="whitespace-nowrap">{tab.label}</span>
              {onTabClose && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTabClose(tab.id);
                  }}
                  className={cn(
                    'ml-1 p-0.5 rounded hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity',
                    isActive && 'opacity-100'
                  )}
                  aria-label={`Close ${tab.label}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
