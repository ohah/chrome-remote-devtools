// DevTools page with Activity pattern and tabs / Activity 패턴과 탭을 사용한 DevTools 페이지
import React, { useRef, useState, useEffect } from 'react';
import { Activity } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { buildDevToolsUrl } from '@/shared/lib/devtools-url';
import { clientQueries } from '@/entities/client';
import { useServerUrl } from '@/shared/lib';
import { Tabs, type Tab } from '@/components/tabs';
import { Smartphone, Globe } from 'lucide-react';
import { getClientTypeFilter } from '@/routes/__root';

// Export component for route / 라우트용 컴포넌트 export
export { DevToolsPage as component };

function DevToolsPage() {
  // Get clientId from route params / 라우트 파라미터에서 clientId 가져오기
  const { clientId } = useParams({ from: '/devtools/$clientId' });
  const navigate = useNavigate();
  const { serverUrl } = useServerUrl();
  const [filterState, setFilterState] = useState(getClientTypeFilter);

  // Get all clients for Activity pattern / Activity 패턴을 위한 모든 클라이언트 가져오기
  const {
    data: clients = [],
  } = useQuery({
    ...clientQueries.list(),
    enabled: !!serverUrl,
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
  const filteredClients = clients.filter((client) => {
    if (client.type === 'web') {
      return filterState.web;
    }
    if (client.type === 'react-native') {
      return filterState.reactNative;
    }
    return false;
  });

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

  return (
    <div className="w-full h-full flex flex-col bg-gray-900">
      {/* Tabs / 탭 - Always show / 항상 표시 */}
      {tabs.length > 0 ? (
        <Tabs tabs={tabs} activeTabId={clientId} onTabChange={handleTabChange} />
      ) : (
        <div className="flex items-end bg-gray-800 border-b border-gray-700 h-10 px-4">
          <div className="text-sm text-gray-400">No clients available</div>
        </div>
      )}

      {/* Activity pattern: render all iframes, show only active one / Activity 패턴: 모든 iframe 렌더링, 활성 탭만 표시 */}
      <div className="flex-1 relative">
        {filteredClients.map((client) => {
          const iframeRef = getOrCreateIframeRef(client.id);
          const devtoolsUrl = buildDevToolsUrl(client.id);
          const isActive = client.id === clientId;

          const isRN = client.type === 'react-native';
          const title = isRN
            ? `DevTools - ${client.deviceName || client.id}`
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
