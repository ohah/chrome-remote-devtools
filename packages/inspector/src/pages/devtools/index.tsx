// DevTools page with Activity pattern and tabs / Activity 패턴과 탭을 사용한 DevTools 페이지
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Activity } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { buildDevToolsUrl } from '@/shared/lib/devtools-url';
import { clientQueries } from '@/entities/client';
import { useServerUrl } from '@/shared/lib';
import { Tabs, type Tab } from '@/components/tabs';
import { Smartphone, Globe } from 'lucide-react';
import { getTabsVisibility } from '@/routes/__root';
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

// Export component for route / 라우트용 컴포넌트 export
export { DevToolsPage as component };

function DevToolsPage() {
  // Get clientId from route params / 라우트 파라미터에서 clientId 가져오기
  const { clientId } = useParams({ from: '/devtools/$clientId' });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { serverUrl } = useServerUrl();
  const [showTabs, setShowTabs] = useState(getTabsVisibility);

  // Get all clients for Activity pattern / Activity 패턴을 위한 모든 클라이언트 가져오기
  const {
    data: clients = [],
  } = useQuery({
    ...clientQueries.list(),
    enabled: !!serverUrl,
  });

  // Track disconnected clients / 연결 해제된 클라이언트 추적
  // Use unique keys (deviceId for RN/Reactotron, id for web) / 고유 키 사용 (RN/Reactotron은 deviceId, 웹은 id)
  const [disconnectedClientKeys, setDisconnectedClientKeys] = useState<Set<string>>(new Set());
  // Map from unique key to latest client ID / 고유 키에서 최신 클라이언트 ID로의 매핑
  const [clientKeyToIdMap, setClientKeyToIdMap] = useState<Map<string, string>>(new Map());
  const [closedTabs, setClosedTabs] = useState<Set<string>>(() => {
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
      // Navigate to home if currently on a devtools page / 현재 DevTools 페이지에 있으면 홈으로 이동
      navigate({ to: '/' });
    };
    window.addEventListener('reset-tabs-state', handleResetTabsState);
    return () => {
      window.removeEventListener('reset-tabs-state', handleResetTabsState);
    };
  }, [navigate, queryClient, serverUrl]);

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

  // Handle postMessage from DevTools iframe to open external links / DevTools iframe에서 외부 링크 열기 위한 postMessage 처리
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Only handle OPEN_EXTERNAL_LINK messages / OPEN_EXTERNAL_LINK 메시지만 처리
      if (event.data?.type === 'OPEN_EXTERNAL_LINK' && event.data?.url) {
        const url = event.data.url as string;

        // Check if running in Tauri / Tauri 환경인지 확인
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tauriWindow = window as any;
        if (typeof window !== 'undefined' && tauriWindow.__TAURI__?.shell) {
          try {
            // Use Tauri shell API to open external links / Tauri shell API를 사용하여 외부 링크 열기
            await tauriWindow.__TAURI__.shell.open(url);
          } catch (err) {
            console.error('Failed to open link with Tauri:', err);
            // Fallback to window.open if Tauri API fails / Tauri API 실패 시 window.open으로 폴백
            window.open(url, '_blank', 'noopener,noreferrer');
          }
        } else {
          // Use standard window.open for web environment / 웹 환경에서는 표준 window.open 사용
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Show all clients / 모든 클라이언트 표시
  const filteredClients = clients;

  // Activity pattern: maintain iframe refs for all clients / Activity 패턴: 모든 클라이언트의 iframe ref 유지
  const iframeRefsRef = useRef<Map<string, React.RefObject<HTMLIFrameElement | null>>>(new Map());

  // Get or create iframe ref for a client / 클라이언트에 대한 iframe ref 가져오기 또는 생성
  const getOrCreateIframeRef = (id: string): React.RefObject<HTMLIFrameElement | null> => {
    const existing = iframeRefsRef.current.get(id);
    if (existing) {
      return existing;
    }

    const newRef = React.createRef<HTMLIFrameElement>();
    iframeRefsRef.current.set(id, newRef);
    return newRef;
  };

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
          icon: client.type === 'react-native' || client.type === 'reactotron' ? <Smartphone className="w-4 h-4" /> : <Globe className="w-4 h-4" />,
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
        const isRN = previousClient?.type === 'react-native' || previousClient?.type === 'reactotron';

        tabsMap.set(key, {
          id: clientId, // Use latest client ID / 최신 클라이언트 ID 사용
          label: previousClient
            ? isRN
              ? previousClient.deviceName || previousClient.appName || previousClient.title || clientId.slice(0, 8)
              : previousClient.url || clientId.slice(0, 8)
            : clientId.slice(0, 8),
          icon: isRN ? (
            <Smartphone className="w-4 h-4" />
          ) : (
            <Globe className="w-4 h-4" />
          ),
          disconnected: true,
        });
      }
    });

    return Array.from(tabsMap.values());
  }, [filteredClients, disconnectedClientKeys, closedTabs, clients, clientKeyToIdMap, previousServerUrl, serverUrl]);

  // Handle tab change / 탭 변경 처리
  const handleTabChange = (tabId: string) => {
    navigate({
      to: '/devtools/$clientId',
      params: { clientId: tabId },
    });
  };

  // Handle tab close / 탭 닫기 처리
  const handleTabClose = (tabId: string) => {
    // Find the unique key for this client ID / 이 클라이언트 ID에 대한 고유 키 찾기
    const client = clients.find((c) => c.id === tabId);
    const key = client ? getClientUniqueKey(client) : tabId;

    setClosedTabs((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });

    // If closing active tab, navigate to connection page / 활성 탭을 닫으면 연결 페이지로 이동
    if (clientId === tabId) {
      navigate({ to: '/' });
    }
  };

  // Clean up closed tabs when clients reconnect / 클라이언트가 재연결되면 닫힌 탭 정리
  useEffect(() => {
    const currentClientKeys = new Set(clients.map((c) => getClientUniqueKey(c)));
    setClosedTabs((prev) => {
      const next = new Set(prev);
      let changed = false;

      for (const closedKey of prev) {
        // Remove from closed tabs when client reconnects / 클라이언트가 재연결되면 닫힌 탭에서 제거
        if (currentClientKeys.has(closedKey)) {
          next.delete(closedKey);
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [clients]);

  return (
    <div className="w-full h-full flex flex-col bg-gray-900">
      {/* Tabs / 탭 - Show/hide based on visibility state / 표시 상태에 따라 표시/숨김 */}
      {showTabs && (
        <>
          {tabs.length > 0 ? (
            <Tabs
              tabs={tabs}
              activeTabId={clientId}
              onTabChange={handleTabChange}
              onTabClose={handleTabClose}
            />
          ) : (
            <div className="flex items-end bg-gray-800 border-b border-gray-700 h-10 px-4">
              <div className="text-sm text-gray-400">No clients available</div>
            </div>
          )}
        </>
      )}

      {/* Activity pattern: render all iframes, show only active one / Activity 패턴: 모든 iframe 렌더링, 활성 탭만 표시 */}
      <div className="flex-1 relative">
        {filteredClients.map((client) => {
          const iframeRef = getOrCreateIframeRef(client.id);
          // Always use random instance for complete isolation / 완전한 격리를 위해 항상 랜덤 인스턴스 사용
          const devtoolsUrl = buildDevToolsUrl({
            clientId: client.id,
            clientType: client.type,
          });
          const isActive = client.id === clientId;

          const isRN = client.type === 'react-native' || client.type === 'reactotron';
          const title = isRN
            ? `DevTools - ${client.deviceName || client.title || client.id}`
            : `DevTools - ${client.url || client.id}`;

          return (
            <Activity key={client.id} mode={isActive ? 'visible' : 'hidden'}>
              <div className="absolute inset-0 w-full h-full">
                <iframe ref={iframeRef} src={devtoolsUrl} className="w-full h-full border-none" title={title} />
              </div>
            </Activity>
          );
        })}
      </div>
    </div>
  );
}
