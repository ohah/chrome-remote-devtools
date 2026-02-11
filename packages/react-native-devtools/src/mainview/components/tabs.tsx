import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disconnected?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  activeTabId: string | null;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTabId, onTabChange, className }: TabsProps) {
  if (tabs.length === 0) return null;

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
          const isDisconnected = tab.disconnected;
          return (
            <div
              key={tab.id}
              role="tab"
              tabIndex={isActive ? 0 : -1}
              onClick={() => onTabChange(tab.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onTabChange(tab.id);
                }
              }}
              title={isDisconnected ? 'Disconnected' : undefined}
              className={cn(
                'group relative flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors cursor-pointer',
                'border-b-2 border-transparent hover:bg-gray-700/50',
                isActive && 'bg-gray-900 border-b-2 border-blue-500 text-gray-100',
                !isActive && 'text-gray-400 hover:text-gray-200',
                isDisconnected && 'opacity-60 text-gray-500'
              )}
              aria-selected={isActive}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span className="whitespace-nowrap">{tab.label}</span>
              <span className="ml-1 w-[18px] flex items-center justify-center">
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    'p-0.5 rounded hover:bg-gray-600 transition-opacity cursor-not-allowed opacity-0 group-hover:opacity-100',
                    isActive && 'opacity-100'
                  )}
                  aria-label="Tab closing is not supported"
                  title="Unsupported"
                  disabled
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
