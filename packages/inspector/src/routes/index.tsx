// Main connection page with tabs / 탭을 사용한 메인 연결 페이지
import { createFileRoute, useNavigate, useLocation } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, useEffect, useRef } from 'react';
import { SettingsModal } from '@/features/settings';
import { clientQueries } from '@/entities/client';
import { LoadingState, ErrorState } from '@/shared/ui';
import { useServerUrl } from '@/shared/lib';
import { Settings, Smartphone, Globe, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, type Tab } from '@/components/tabs';
import { getClientTypeFilter, getTabsVisibility } from './__root';
import type { Client } from '@/entities/client';

/**
 * Get unique key for client identification / 클라이언트 식별을 위한 고유 키 가져오기
 * For React Native/Reactotron: use deviceId if available, otherwise use id / React Native/Reactotron의 경우: deviceId가 있으면 사용, 없으면 id 사용
 * For web: use id / 웹의 경우: id 사용
 */
function getClientUniqueKey(client: Client): string {
  if (client.type === 'react-native' || client.type === 'reactotron') {
    // Use deviceId for React Native/Reactotron clients if available / React Native/Reactotron 클라이언트의 경우 deviceId 사용 (가능한 경우)
    return client.deviceId || client.id;
  }
  // For web clients, use id / 웹 클라이언트의 경우 id 사용
  return client.id;
}

export const Route = createFileRoute('/')({
  component: ConnectionPage,
});

function ConnectionPage() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [filterState, setFilterState] = useState(getClientTypeFilter);
  const [showTabs, setShowTabs] = useState(getTabsVisibility);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
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

  // Track disconnected clients / 연결 해제된 클라이언트 추적
  // Use unique keys (deviceId for RN/Reactotron, id for web) / 고유 키 사용 (RN/Reactotron은 deviceId, 웹은 id)
  const [disconnectedClientKeys, setDisconnectedClientKeys] = useState<Set<string>>(new Set());
  // Map from unique key to latest client ID / 고유 키에서 최신 클라이언트 ID로의 매핑
  const [clientKeyToIdMap, setClientKeyToIdMap] = useState<Map<string, string>>(new Map());
  const [closedTabs, setClosedTabs] = useState<Set<string>>(() => {
    // Load closed tabs from localStorage / localStorage에서 닫힌 탭 로드
    const saved = localStorage.getItem('closed-tabs');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  // Track server URL to detect changes / 서버 URL 변경 감지를 위한 추적
  const [previousServerUrl, setPreviousServerUrl] = useState<string | null>(serverUrl);

  // Save closed tabs to localStorage / 닫힌 탭을 localStorage에 저장
  useEffect(() => {
    localStorage.setItem('closed-tabs', JSON.stringify(Array.from(closedTabs)));
  }, [closedTabs]);

  // Update disconnected client keys and mapping when clients change / 클라이언트가 변경될 때 연결 해제된 클라이언트 키와 매핑 업데이트
  useEffect(() => {
    const currentKeys = new Set<string>();
    const newKeyToIdMap = new Map<string, string>();

    clients.forEach((client) => {
      const key = getClientUniqueKey(client);
      currentKeys.add(key);
      newKeyToIdMap.set(key, client.id);
    });

    // Update disconnected keys and mapping together / 연결 해제된 키와 매핑을 함께 업데이트
    setClientKeyToIdMap((prevMap) => {
      // Update disconnected keys: detect keys that were connected but are now disconnected / 연결 해제된 키 업데이트: 연결되었지만 현재 연결 해제된 키 감지
      setDisconnectedClientKeys((prevDisconnected) => {
        const updated = new Set(prevDisconnected);
        // Remove keys that are now connected / 현재 연결된 키 제거
        currentKeys.forEach((key) => {
          updated.delete(key);
        });
        // Add keys that were in the map but are not currently connected / 맵에 있지만 현재 연결되지 않은 키 추가
        prevMap.forEach((_, key) => {
          if (!currentKeys.has(key)) {
            updated.add(key);
          }
        });
        return updated;
      });

      // Update mapping with latest client IDs / 최신 클라이언트 ID로 매핑 업데이트
      const updated = new Map(prevMap);
      newKeyToIdMap.forEach((id, key) => {
        updated.set(key, id);
      });
      // Keep old mappings for disconnected clients / 연결 해제된 클라이언트의 이전 매핑 유지
      return updated;
    });
  }, [clients]);

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

  // Listen to tab visibility changes / 탭 표시 상태 변경 사항 듣기
  useEffect(() => {
    const handleTabsVisibilityChange = () => {
      setShowTabs(getTabsVisibility());
    };
    window.addEventListener('tabs-visibility-change', handleTabsVisibilityChange);
    return () => {
      window.removeEventListener('tabs-visibility-change', handleTabsVisibilityChange);
    };
  }, []);

  // Listen to tab state reset event / 탭 상태 초기화 이벤트 듣기
  useEffect(() => {
    const handleResetTabsState = () => {
      // Reset all tab-related state / 모든 탭 관련 상태 초기화
      setClosedTabs(new Set());
      setDisconnectedClientKeys(new Set());
      setClientKeyToIdMap(new Map());
      // Remove client queries completely / 클라이언트 쿼리 완전히 제거
      queryClient.removeQueries({ queryKey: clientQueries.all() });
      // Update previous server URL to current / 이전 서버 URL을 현재로 업데이트
      setPreviousServerUrl(serverUrl);
    };
    window.addEventListener('reset-tabs-state', handleResetTabsState);
    return () => {
      window.removeEventListener('reset-tabs-state', handleResetTabsState);
    };
  }, [queryClient, serverUrl]);

  // Detect server URL changes and reset tabs / 서버 URL 변경 감지 및 탭 초기화
  useEffect(() => {
    if (previousServerUrl !== null && previousServerUrl !== serverUrl) {
      // Server URL changed, reset all tab state / 서버 URL 변경됨, 모든 탭 상태 초기화
      setClosedTabs(new Set());
      setDisconnectedClientKeys(new Set());
      setClientKeyToIdMap(new Map());
      setPreviousServerUrl(serverUrl);
    } else if (previousServerUrl === null) {
      // Initial load, just set the current server URL / 초기 로드, 현재 서버 URL만 설정
      setPreviousServerUrl(serverUrl);
    }
  }, [serverUrl, previousServerUrl]);

  // Filter clients based on filter state / 필터 상태에 따라 클라이언트 필터링
  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      if (client.type === 'web') {
        return filterState.web;
      }
      if (client.type === 'react-native') {
        return filterState.reactNative;
      }
      if (client.type === 'reactotron') {
        return filterState.reactotron;
      }
      return false;
    });
  }, [clients, filterState]);

  // Get active clientId from route if on devtools page / DevTools 페이지에 있으면 라우트에서 활성 clientId 가져오기
  const activeClientId = location.pathname.startsWith('/devtools/')
    ? location.pathname.split('/devtools/')[1] || null
    : null;

  // Build tabs from filtered clients and previously seen clients / 필터링된 클라이언트와 이전에 본 클라이언트로부터 탭 생성
  const tabs: Tab[] = useMemo(() => {
    // If server URL changed, return empty tabs / 서버 URL이 변경되었으면 빈 탭 반환
    if (previousServerUrl !== null && previousServerUrl !== serverUrl) {
      return [];
    }

    const currentClientKeys = new Set(filteredClients.map((c) => getClientUniqueKey(c)));

    // Create tabs for all known clients (current + previously seen) / 모든 알려진 클라이언트에 대한 탭 생성 (현재 + 이전에 본 것)
    const tabsMap = new Map<string, Tab>();

    // Add current clients / 현재 클라이언트 추가
    filteredClients.forEach((client) => {
      const key = getClientUniqueKey(client);
      if (!closedTabs.has(key)) {
        tabsMap.set(key, {
          id: client.id, // Use actual client ID for navigation / 네비게이션을 위해 실제 클라이언트 ID 사용
          label:
            client.type === 'react-native' || client.type === 'reactotron'
              ? client.deviceName || client.appName || client.title || client.id.slice(0, 8)
              : client.url || client.id.slice(0, 8),
          icon:
            client.type === 'react-native' || client.type === 'reactotron' ? (
              <Smartphone className="w-4 h-4" />
            ) : (
              <Globe className="w-4 h-4" />
            ),
          disconnected: false,
        });
      }
    });

    // Add disconnected clients that were previously seen / 이전에 본 연결 해제된 클라이언트 추가
    disconnectedClientKeys.forEach((key) => {
      if (!currentClientKeys.has(key) && !closedTabs.has(key)) {
        // Get latest client ID from mapping / 매핑에서 최신 클라이언트 ID 가져오기
        const clientId = clientKeyToIdMap.get(key);
        if (!clientId) return;

        // Try to find client info from previous render / 이전 렌더링에서 클라이언트 정보 찾기 시도
        const previousClient = clients.find((c) => getClientUniqueKey(c) === key);
        const isRN =
          previousClient?.type === 'react-native' || previousClient?.type === 'reactotron';

        tabsMap.set(key, {
          id: clientId, // Use latest client ID / 최신 클라이언트 ID 사용
          label: previousClient
            ? isRN
              ? previousClient.deviceName ||
                previousClient.appName ||
                previousClient.title ||
                clientId.slice(0, 8)
              : previousClient.url || clientId.slice(0, 8)
            : clientId.slice(0, 8),
          icon: isRN ? <Smartphone className="w-4 h-4" /> : <Globe className="w-4 h-4" />,
          disconnected: true,
        });
      }
    });

    return Array.from(tabsMap.values());
  }, [
    filteredClients,
    disconnectedClientKeys,
    closedTabs,
    clients,
    clientKeyToIdMap,
    previousServerUrl,
    serverUrl,
  ]);

  // Handle tab change / 탭 변경 처리
  const handleTabChange = (tabId: string) => {
    navigate({
      to: '/devtools/$clientId',
      params: { clientId: tabId },
    });
  };

  // Clean up closed tabs when clients reconnect / 클라이언트가 재연결되면 닫힌 탭 정리
  useEffect(() => {
    const currentClientKeys = new Set(clients.map((c) => getClientUniqueKey(c)));
    setClosedTabs((prev) => {
      const next = new Set(prev);
      let changed = false;

      // Remove closed tabs for clients that are no longer in the list / 목록에 없는 클라이언트의 닫힌 탭 제거
      for (const closedKey of prev) {
        if (!currentClientKeys.has(closedKey)) {
          next.delete(closedKey);
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [clients]);

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
      {/* Tabs / 탭 - Show/hide based on visibility state / 표시 상태에 따라 표시/숨김 */}
      {showTabs && (
        <>
          {tabs.length > 0 ? (
            <Tabs
              tabs={tabs}
              activeTabId={activeClientId}
              onTabChange={handleTabChange}
              // Don't show close button on connection list page / 연결 리스트 페이지에서는 닫기 버튼 표시 안 함
            />
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
        </>
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
