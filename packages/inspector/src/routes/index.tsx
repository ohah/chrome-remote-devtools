// Main connection page with tabs / 탭을 사용한 메인 연결 페이지
import { createFileRoute, useNavigate, useLocation } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, useEffect, useRef } from 'react';
import { SettingsModal } from '@/features/settings';
import { clientQueries } from '@/entities/client';
import { LoadingState, ErrorState } from '@/shared/ui';
import { useServerUrl } from '@/shared/lib';
import { Settings, Smartphone, Globe, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, type Tab } from '@/components/tabs';
import { getClientTypeFilter } from './__root';

export const Route = createFileRoute('/')({
  component: ConnectionPage,
});

function ConnectionPage() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [filterState, setFilterState] = useState(getClientTypeFilter);
  const navigate = useNavigate();
  const location = useLocation();
  const { serverUrl } = useServerUrl();
  const {
    data: clients = [],
    isLoading,
    error,
    isRefetching,
    refetch,
  } = useQuery({
    ...clientQueries.list(),
    enabled: !!serverUrl, // Only fetch if server URL is set
  });

  // Listen to filter changes / 필터 변경 사항 듣기
  useEffect(() => {
    const handleFilterChange = () => {
      setFilterState(getClientTypeFilter());
    };
    window.addEventListener('client-filter-change', handleFilterChange);
    return () => {
      window.removeEventListener('client-filter-change', handleFilterChange);
    };
  }, []);

  // Filter clients based on filter state / 필터 상태에 따라 클라이언트 필터링
  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      if (client.type === 'web') {
        return filterState.web;
      }
      if (client.type === 'react-native') {
        return filterState.reactNative;
      }
      return false;
    });
  }, [clients, filterState]);

  // Get active clientId from route if on devtools page / DevTools 페이지에 있으면 라우트에서 활성 clientId 가져오기
  const activeClientId = location.pathname.startsWith('/devtools/')
    ? location.pathname.split('/devtools/')[1] || null
    : null;

  // Build tabs from filtered clients / 필터링된 클라이언트로부터 탭 생성
  const tabs: Tab[] = filteredClients.map((client) => ({
    id: client.id,
    label:
      client.type === 'react-native'
        ? client.deviceName || client.appName || client.id.slice(0, 8)
        : client.url || client.id.slice(0, 8),
    icon: client.type === 'react-native' ? <Smartphone className="w-4 h-4" /> : <Globe className="w-4 h-4" />,
  }));

  // Handle tab change / 탭 변경 처리
  const handleTabChange = (tabId: string) => {
    navigate({
      to: '/devtools/$clientId',
      params: { clientId: tabId },
    });
  };

  // Handle file upload button click
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Handle file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    // Reset input so same file can be selected again
    event.target.value = '';

    // Read file content and store in a temporary location for replay page
    try {
      const fileData = {
        name: file.name,
        type: file.type,
        content: await file.text(), // Read file content
      };

      // Navigate to replay page with file data in state
      // TanStack Router state type is strict, use type assertion / TanStack Router state 타입이 엄격하므로 타입 단언 사용
      navigate({
        to: '/replay',
        state: { fileData } as any,
      });
    } catch (error) {
      console.error('Failed to read file:', error);
    }
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (error && clients.length === 0 && serverUrl) {
    return <ErrorState error={error} onRetry={() => refetch()} isRetrying={isRefetching} />;
  }

  return (
    <div className="w-full h-full flex flex-col bg-gray-900">
      {/* Tabs / 탭 */}
      {tabs.length > 0 ? (
        <Tabs tabs={tabs} activeTabId={activeClientId} onTabChange={handleTabChange} />
      ) : (
        <div className="flex items-end bg-gray-800 border-b border-gray-700 h-10 px-4">
          <div className="text-sm text-gray-400">
            {!serverUrl
              ? 'Server URL Required'
              : filteredClients.length === 0
                ? 'No clients available (check filters)'
                : 'No clients available'}
          </div>
        </div>
      )}

      {/* Content area / 콘텐츠 영역 */}
      <div className="flex-1 flex items-center justify-center relative">
        {!serverUrl ? (
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-200 mb-2">Server URL Required</h2>
            <p className="text-sm text-gray-400 mb-6">
              Please configure the server URL in Settings to connect to the WebSocket server.
            </p>
            <Button
              onClick={() => setIsSettingsOpen(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Open Settings
            </Button>
          </div>
        ) : filteredClients.length === 0 && !error ? (
          <div className="text-center">
            <p className="text-gray-400">No clients available</p>
            <p className="text-sm text-gray-500 mt-2">
              {clients.length === 0
                ? 'Waiting for clients to connect...'
                : 'Adjust filters in the title bar to show clients'}
            </p>
          </div>
        ) : tabs.length === 0 ? (
          <div className="text-center">
            <p className="text-gray-400">No clients found</p>
            <p className="text-sm text-gray-500 mt-2">Click on a tab above to view DevTools</p>
          </div>
        ) : !activeClientId ? (
          <div className="text-center">
            <p className="text-gray-400">Select a tab above to view DevTools</p>
          </div>
        ) : null}
      </div>

      {/* Settings button (floating) / 설정 버튼 (플로팅) */}
      <div className="absolute bottom-4 right-4 flex gap-2">
        <input
          type="file"
          accept=".json"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          aria-label="Upload CDP event file"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={handleFileUploadClick}
          className="bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 border border-gray-700"
          aria-label="Upload file"
        >
          <Upload className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsSettingsOpen(true)}
          className="bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 border border-gray-700"
          aria-label="Open settings"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>

      {/* Settings modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
