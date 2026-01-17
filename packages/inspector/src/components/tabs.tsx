// Tabs component / 탭 컴포넌트
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  /** Whether the client is disconnected / 클라이언트가 연결 해제되었는지 여부 */
  disconnected?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  activeTabId: string | null;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTabId, onTabChange, className }: TabsProps) {
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
          const isDisconnected = tab.disconnected;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'group relative flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors',
                'border-b-2 border-transparent hover:bg-gray-700/50',
                isActive && 'bg-gray-900 border-b-2 border-blue-500 text-gray-100',
                !isActive && 'text-gray-400 hover:text-gray-200',
                isDisconnected && 'opacity-60' // Visual indicator for disconnected tabs / 연결 해제된 탭의 시각적 표시
              )}
              aria-selected={isActive}
              role="tab"
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span className="whitespace-nowrap">{tab.label}</span>
              {isDisconnected && (
                <span className="ml-1 text-xs text-gray-500" title="Disconnected / 연결 해제됨">
                  (offline)
                </span>
              )}
              {/* Reserve space for close button to prevent tab size changes / 탭 크기 변경을 방지하기 위해 닫기 버튼 공간 예약 */}
              <span className="ml-1 w-[18px] flex items-center justify-center">
                {/* Always show close button but disable functionality / 닫기 버튼은 항상 표시하지만 기능 비활성화 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Tab closing is not supported / 탭 닫기는 지원되지 않음
                  }}
                  className={cn(
                    'p-0.5 rounded hover:bg-gray-600 transition-opacity cursor-not-allowed',
                    'opacity-0 group-hover:opacity-100',
                    isActive && 'opacity-100'
                  )}
                  aria-label="Tab closing is not supported"
                  title="Unsupported feature"
                  disabled
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
