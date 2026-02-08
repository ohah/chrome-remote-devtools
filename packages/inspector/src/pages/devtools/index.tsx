// DevTools page with Activity pattern and tabs / Activity 패턴과 탭을 사용한 DevTools 페이지
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Activity } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { buildDevToolsUrl, buildDevToolsUrlMetroProxy } from '@/shared/lib/devtools-url';
import { IFRAME_ALLOW_ALL_PERMISSIONS, IFRAME_SANDBOX_DEVTOOLS } from '@/shared/lib/constants';
import {
  clientQueries,
  metroQueries,
  METRO_TAB_ID_PREFIX,
} from '@/entities/client';
import { useServerUrl } from '@/shared/lib';
import { Tabs, type Tab } from '@/components/tabs';
import { Smartphone, Globe, Wifi } from 'lucide-react';
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
  const { serverUrl, metroUrl } = useServerUrl();
  const [showTabs, setShowTabs] = useState(getTabsVisibility);
  /** Metro tab view mode: Metro debugger or our Inspector / Metro 탭 뷰 모드 */
  const [metroViewMode, setMetroViewMode] = useState<
    Record<string, 'metro-debugger' | 'our-inspector'>
  >({});

  // Get all clients for Activity pattern / Activity 패턴을 위한 모든 클라이언트 가져오기
  const { data: clients = [] } = useQuery({
    ...clientQueries.list(),
    enabled: !!serverUrl,
  });
  const { data: metroTargets = [] } = useQuery({
    ...metroQueries.listOptions(metroUrl),
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
      // Remove client and metro queries completely / 클라이언트·Metro 쿼리 완전히 제거
      queryClient.removeQueries({ queryKey: clientQueries.all() });
      queryClient.removeQueries({ queryKey: metroQueries.all() });
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

  // Handle postMessage from DevTools iframe (external links, clipboard) / DevTools iframe postMessage (외부 링크, 클립보드)
  useEffect(() => {
    const copyInParent = async (text: string): Promise<void> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tauriWindow = window as any;
      try {
        if (typeof tauriWindow?.__TAURI__?.clipboardManager?.writeText === 'function') {
          await tauriWindow.__TAURI__.clipboardManager.writeText(text);
          console.log('[DevTools] copyInParent: copied via Tauri clipboard');
          return;
        }
      } catch {
        // Fall through / 다음 방식 시도
      }
      try {
        if (typeof navigator?.clipboard?.writeText === 'function') {
          await navigator.clipboard.writeText(text);
          console.log('[DevTools] copyInParent: copied via Clipboard API');
          return;
        }
      } catch {
        // Fall through to execCommand / execCommand로 폴백
      }
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        console.log('[DevTools] copyInParent: copied via execCommand');
      } finally {
        document.body.removeChild(textarea);
      }
    };

    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'OPEN_EXTERNAL_LINK' && event.data?.url) {
        const url = event.data.url as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tauri = (window as any).__TAURI__;
        if (typeof tauri?.opener?.openUrl === 'function') {
          try {
            await tauri.opener.openUrl(url);
          } catch (err) {
            console.error('Failed to open link with Tauri opener:', err);
            window.open(url, '_blank', 'noopener,noreferrer');
          }
        } else {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
        return;
      }
      if (event.data?.type === 'COPY_TEXT' && typeof event.data?.text === 'string') {
        const text = event.data.text as string;
        console.log('[DevTools] COPY_TEXT received from iframe, length=', text.length);
        await copyInParent(text);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Show all clients / 모든 클라이언트 표시
  const filteredClients = clients;

  // Update key->id and id->key mapping. When Metro targets exist (__DEV__), only Metro keys; else clients + Metro / Metro 있으면(__DEV__) Metro만, 없으면 클라이언트+Metro
  useEffect(() => {
    const newKeyToIdMap = new Map<string, string>();
    if (metroTargets.length === 0) {
      filteredClients.forEach((client) => {
        const key = getClientUniqueKey(client);
        newKeyToIdMap.set(key, client.id);
      });
    }
    metroTargets.forEach((target) => {
      const key = `${METRO_TAB_ID_PREFIX}${target.id}`;
      newKeyToIdMap.set(key, key);
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
        const keysNext = [...prevKeys];
        next.forEach((_, key) => {
          if (!keysNext.includes(key)) keysNext.push(key);
        });
        return keysNext;
      });
      return next;
    });
  }, [filteredClients, metroTargets]);

  // When Metro only (__DEV__), redirect non-Metro tab to first Metro tab / Metro만 있을 때(__DEV__) 비-Metro 탭이면 첫 Metro 탭으로 이동
  useEffect(() => {
    if (metroTargets.length === 0 || !clientId || clientId.startsWith(METRO_TAB_ID_PREFIX)) return;
    const first = metroTargets[0];
    if (first) {
      navigate({
        to: '/devtools/$clientId',
        params: { clientId: `${METRO_TAB_ID_PREFIX}${first.id}` },
      });
    } else {
      navigate({ to: '/' });
    }
  }, [clientId, metroTargets, navigate]);

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

  // One tab per device key; include Metro targets / 기기(key)당 탭 하나, Metro 타깃 포함
  const tabs: Tab[] = useMemo(() => {
    if (previousServerUrl !== null && previousServerUrl !== serverUrl) return [];
    return stableKeys.map((key) => {
      const metroTarget = key.startsWith(METRO_TAB_ID_PREFIX)
        ? metroTargets.find((t) => `${METRO_TAB_ID_PREFIX}${t.id}` === key)
        : null;
      if (metroTarget) {
        return {
          id: `${METRO_TAB_ID_PREFIX}${metroTarget.id}`,
          label: metroTarget.deviceName || metroTarget.title || metroTarget.id.slice(0, 8),
          icon: <Wifi className="w-4 h-4" />,
          disconnected: false,
        };
      }
      const client = filteredClients.find((c) => getClientUniqueKey(c) === key);
      const id = client?.id ?? clientKeyToIdMap.get(key) ?? key;
      const isRN = client?.type === 'react-native' || client?.type === 'reactotron';
      if (client) {
        return {
          id: client.id,
          label: isRN
            ? client.deviceId || client.deviceName || client.appName || client.title || client.id.slice(0, 8)
            : client.url || client.id.slice(0, 8),
          icon: isRN ? <Smartphone className="w-4 h-4" /> : <Globe className="w-4 h-4" />,
          disconnected: false,
        };
      }
      return {
        id,
        label: key,
        icon: <Smartphone className="w-4 h-4" />,
        disconnected: true,
      };
    });
  }, [stableKeys, filteredClients, metroTargets, clientKeyToIdMap, previousServerUrl, serverUrl]);

  // One iframe per key; server clients use our DevTools URL, Metro targets use Metro debugger or our Inspector / key당 iframe 하나, 서버는 우리 URL, Metro는 Metro 디버거 또는 우리 인스펙터
  type FrameItem = {
    key: string;
    id: string;
    type: 'web' | 'react-native' | 'reactotron';
    deviceName?: string;
    url?: string;
    title?: string;
    /** When set, use for Metro debugger iframe (Metro UI) / Metro 디버거 iframe용 */
    metroFrontendUrl?: string;
    /** When set, use for our Inspector direct connection (Metro CDP WebSocket) / 우리 인스펙터 직접 연결용 */
    metroWebSocketDebuggerUrl?: string;
  };

  const clientsForIframes = useMemo((): FrameItem[] => {
    return stableKeys.map((key) => {
      const metroTarget = key.startsWith(METRO_TAB_ID_PREFIX)
        ? metroTargets.find((t) => `${METRO_TAB_ID_PREFIX}${t.id}` === key)
        : null;
      if (metroTarget) {
        return {
          key,
          id: `${METRO_TAB_ID_PREFIX}${metroTarget.id}`,
          type: 'react-native',
          deviceName: metroTarget.deviceName,
          title: metroTarget.title,
          metroFrontendUrl: metroTarget.devtoolsFrontendUrl,
          metroWebSocketDebuggerUrl: metroTarget.webSocketDebuggerUrl,
        };
      }
      const client = filteredClients.find((c) => getClientUniqueKey(c) === key);
      const id = client?.id ?? clientKeyToIdMap.get(key) ?? key;
      const type: FrameItem['type'] = client?.type ?? 'react-native';
      const deviceName = client && 'deviceName' in client ? client.deviceName : undefined;
      const url = client && 'url' in client ? client.url : undefined;
      const title = client && 'title' in client ? client.title : undefined;
      return { key, id, type, deviceName, url, title };
    });
  }, [stableKeys, filteredClients, metroTargets, clientKeyToIdMap]);

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

      {/* Metro tab view mode chooser: Our Inspector | Metro Debugger / Metro 탭 뷰 모드 선택 */}
      {clientId?.startsWith(METRO_TAB_ID_PREFIX) && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 border-b border-gray-700 shrink-0">
          <span className="text-xs text-gray-400">View:</span>
          <button
            type="button"
            onClick={() =>
              setMetroViewMode((prev) => ({ ...prev, [clientId]: 'our-inspector' }))
            }
            className={`px-2.5 py-1 text-xs rounded ${
              (metroViewMode[clientId] ?? 'our-inspector') === 'our-inspector'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Our Inspector
          </button>
          <button
            type="button"
            onClick={() =>
              setMetroViewMode((prev) => ({ ...prev, [clientId]: 'metro-debugger' }))
            }
            className={`px-2.5 py-1 text-xs rounded ${
              (metroViewMode[clientId] ?? 'our-inspector') === 'metro-debugger'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Metro Debugger
          </button>
        </div>
      )}

      {/* One iframe per key; same tab slot when reconnected (id/url update) / key당 iframe 하나, 재연결 시 같은 슬롯(id·url만 갱신) */}
      <div className="flex-1 relative">
        {clientsForIframes.map((item) => {
          const iframeRef = getOrCreateIframeRef(item.key);
          const mode = metroViewMode[item.key] ?? 'our-inspector';
          const useOurInspector =
            item.metroWebSocketDebuggerUrl && mode === 'our-inspector';

          let iframeSrc: string;
          if (item.metroFrontendUrl) {
            if (useOurInspector) {
              iframeSrc = buildDevToolsUrlMetroProxy({
                metroWebSocketUrl: item.metroWebSocketDebuggerUrl!,
                serverUrl: serverUrl ?? 'http://localhost:8080',
                instanceId: item.id,
                clientType: 'react-native',
              });
            } else {
              iframeSrc = item.metroFrontendUrl;
            }
          } else {
            iframeSrc = buildDevToolsUrl({
              clientId: item.id,
              clientType: item.type,
            });
          }
          const isActive = item.id === clientId;
          const title =
            item.deviceName != null
              ? `DevTools - ${item.deviceName || item.title || item.id}`
              : item.url != null
                ? `DevTools - ${item.url || item.id}`
                : `DevTools - ${String(item.id).slice(0, 8)}`;

          return (
            <Activity key={item.key} mode={isActive ? 'visible' : 'hidden'}>
              <div className="absolute inset-0 w-full h-full flex flex-col">
                <div className="flex-1 min-h-0">
                <iframe
                  ref={iframeRef}
                  src={iframeSrc}
                  className="w-full h-full border-none"
                  title={title}
                  sandbox={IFRAME_SANDBOX_DEVTOOLS}
                  allow={IFRAME_ALLOW_ALL_PERMISSIONS}
                />
                </div>
              </div>
            </Activity>
          );
        })}
      </div>
    </div>
  );
}
