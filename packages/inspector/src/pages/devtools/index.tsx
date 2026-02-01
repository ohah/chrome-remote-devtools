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

/** One tab per device (key); RN/Reactotron use deviceId, web use id / 기기(key)당 탭 하나; RN/Reactotron은 deviceId, 웹은 id */
function getClientUniqueKey(client: Client): string {
  if (client.type === 'react-native' || client.type === 'reactotron') {
    return client.deviceId || client.id;
  }
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

  // Track server URL to detect changes / 서버 URL 변경 감지를 위한 추적
  const [previousServerUrl, setPreviousServerUrl] = useState<string | null>(serverUrl);
  // One tab per device key; append only so focused tab never disappears / 기기(key)당 탭 하나, 추가만 → 포커스 탭 소멸 없음
  const [stableKeys, setStableKeys] = useState<string[]>([]);
  // key -> latest client id (for tab id and reconnection update) / key → 최신 client id (탭 id·재연결 시 이름만 갱신)
  const [clientKeyToIdMap, setClientKeyToIdMap] = useState<Map<string, string>>(new Map());
  // clientId -> key (for redirect when same key reconnects with new id, e.g. R refresh) / clientId → key (R 새로고침 등 같은 key가 새 id로 재연결 시 리다이렉트용)
  const [clientIdToKeyMap, setClientIdToKeyMap] = useState<Map<string, string>>(new Map());

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
      setStableKeys([]);
      setClientKeyToIdMap(new Map());
      setClientIdToKeyMap(new Map());
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
      setStableKeys([]);
      setClientKeyToIdMap(new Map());
      setClientIdToKeyMap(new Map());
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

  // Update key->id and id->key mapping; append new keys only / key↔id 매핑, 새 key만 추가
  useEffect(() => {
    const newKeyToIdMap = new Map<string, string>();
    filteredClients.forEach((client) => {
      const key = getClientUniqueKey(client);
      newKeyToIdMap.set(key, client.id);
    });
    setClientKeyToIdMap((prev) => {
      const next = new Map(prev);
      newKeyToIdMap.forEach((id, key) => next.set(key, id));
      setClientIdToKeyMap((prevIdToKey) => {
        const idToKey = new Map(prevIdToKey);
        next.forEach((id, key) => idToKey.set(id, key));
        return idToKey;
      });
      setStableKeys((prevKeys) => {
        let keysNext = prevKeys;
        next.forEach((_, key) => {
          if (!keysNext.includes(key)) keysNext = keysNext.concat(key);
        });
        return keysNext;
      });
      return next;
    });
  }, [filteredClients]);

  // R refresh: same deviceId, new id → redirect URL to new id so same tab stays selected (no "new" tab) / R 새로고침: deviceId 같고 id만 바뀜 → URL만 새 id로 이동해 같은 탭 유지
  useEffect(() => {
    if (!clientId || filteredClients.some((c) => c.id === clientId)) return;
    const key = clientIdToKeyMap.get(clientId);
    if (!key) return;
    const reconnected = filteredClients.find((c) => getClientUniqueKey(c) === key);
    if (reconnected) {
      navigate({ to: '/devtools/$clientId', params: { clientId: reconnected.id } });
    }
  }, [clientId, filteredClients, clientIdToKeyMap, navigate]);

  // Activity pattern: maintain iframe refs for all clients / Activity 패턴: 모든 클라이언트의 iframe ref 유지
  const iframeRefsRef = useRef<Map<string, React.RefObject<HTMLIFrameElement | null>>>(new Map());

  // Get or create iframe ref by device key (one iframe per key; same slot when id changes) / 기기 key별 iframe ref, key당 하나
  const getOrCreateIframeRef = (key: string): React.RefObject<HTMLIFrameElement | null> => {
    const existing = iframeRefsRef.current.get(key);
    if (existing) return existing;
    const newRef = React.createRef<HTMLIFrameElement>();
    iframeRefsRef.current.set(key, newRef);
    return newRef;
  };

  // One tab per device key; id/name update when reconnected (no new tab) / 기기(key)당 탭 하나, 재연결 시 id·이름만 갱신
  const tabs: Tab[] = useMemo(() => {
    if (previousServerUrl !== null && previousServerUrl !== serverUrl) return [];
    return stableKeys.map((key) => {
      const client = filteredClients.find((c) => getClientUniqueKey(c) === key);
      const id = client?.id ?? clientKeyToIdMap.get(key) ?? key;
      const isRN = client?.type === 'react-native' || client?.type === 'reactotron';
      if (client) {
        return {
          id: client.id,
          label: isRN
            ? client.deviceName || client.appName || client.title || client.id.slice(0, 8)
            : client.url || client.id.slice(0, 8),
          icon: isRN ? <Smartphone className="w-4 h-4" /> : <Globe className="w-4 h-4" />,
          disconnected: false,
        };
      }
      return {
        id,
        label: `${String(id).slice(0, 8)} (offline)`,
        icon: <Smartphone className="w-4 h-4" />,
        disconnected: true,
      };
    });
  }, [stableKeys, filteredClients, clientKeyToIdMap, previousServerUrl, serverUrl]);

  // One iframe per key; current id for that key (reconnect = same slot, id/url update) / key당 iframe 하나, 해당 key의 현재 id
  type FrameItem = {
    key: string;
    id: string;
    type: 'web' | 'react-native' | 'reactotron';
    deviceName?: string;
    url?: string;
    title?: string;
  };
  const clientsForIframes = useMemo((): FrameItem[] => {
    return stableKeys.map((key) => {
      const client = filteredClients.find((c) => getClientUniqueKey(c) === key);
      const id = client?.id ?? clientKeyToIdMap.get(key) ?? key;
      const type: FrameItem['type'] = client?.type ?? 'react-native';
      const deviceName = client && 'deviceName' in client ? client.deviceName : undefined;
      const url = client && 'url' in client ? client.url : undefined;
      const title = client && 'title' in client ? client.title : undefined;
      return { key, id, type, deviceName, url, title };
    });
  }, [stableKeys, filteredClients, clientKeyToIdMap]);

  // Handle tab change / 탭 변경 처리
  const handleTabChange = (tabId: string) => {
    navigate({
      to: '/devtools/$clientId',
      params: { clientId: tabId },
    });
  };


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
            />
          ) : (
            <div className="flex items-end bg-gray-800 border-b border-gray-700 h-10 px-4">
              <div className="text-sm text-gray-400">No clients available</div>
            </div>
          )}
        </>
      )}

      {/* One iframe per key; same tab slot when reconnected (id/url update) / key당 iframe 하나, 재연결 시 같은 슬롯(id·url만 갱신) */}
      <div className="flex-1 relative">
        {clientsForIframes.map((item) => {
          const iframeRef = getOrCreateIframeRef(item.key);
          const devtoolsUrl = buildDevToolsUrl({
            clientId: item.id,
            clientType: item.type,
          });
          const isActive = item.id === clientId;
          const title =
            item.deviceName != null
              ? `DevTools - ${item.deviceName || item.title || item.id}`
              : item.url != null
                ? `DevTools - ${item.url || item.id}`
                : `DevTools - ${String(item.id).slice(0, 8)}`;

          return (
            <Activity key={item.key} mode={isActive ? 'visible' : 'hidden'}>
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
