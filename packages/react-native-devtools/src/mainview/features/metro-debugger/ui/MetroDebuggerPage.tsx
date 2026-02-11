/**
 * Metro debugger page - only feature in this app / Metro 디버거 페이지만 구현
 */
import { useQuery } from '@tanstack/react-query';
import { Wifi } from 'lucide-react';
import { useSettingsStore } from '@/shared/lib/settings-store';
import {
  getMetroTargets,
  METRO_TAB_ID_PREFIX,
  type MetroTarget,
} from '@/shared/lib/get-metro-targets';
import { LoadingState, ErrorState } from '@/shared/ui/empty-states';
import { Button } from '@/components/ui/button';
import { Tabs, type Tab } from '@/components/tabs';
import { useOpenSettings } from '@/shared/lib/settings-store';
import { useMemo, useState, useEffect } from 'react';

const METRO_QUERY_KEY = ['metro-targets'] as const;

function useMetroTargets(metroUrl: string | null) {
  return useQuery({
    queryKey: [...METRO_QUERY_KEY, metroUrl ?? ''],
    queryFn: () => getMetroTargets(metroUrl),
    enabled: !!metroUrl?.trim(),
    staleTime: 3000,
    refetchInterval: 5000,
    placeholderData: (prev) => prev,
  });
}

export function MetroDebuggerPage() {
  const openSettings = useOpenSettings();
  const metroUrl = useSettingsStore((s) => s.metroUrl);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  const {
    data: metroTargets = [],
    isLoading,
    error,
    isRefetching,
    refetch,
  } = useMetroTargets(metroUrl);

  const tabs: Tab[] = useMemo(
    () =>
      metroTargets.map((t) => ({
        id: `${METRO_TAB_ID_PREFIX}${t.id}`,
        label: t.deviceName || t.title || t.id.slice(0, 8),
        icon: <Wifi className="w-4 h-4" />,
      })),
    [metroTargets]
  );

  // Auto-select first tab when tabs change
  useEffect(() => {
    if (tabs.length > 0) {
      const currentInList = tabs.some((t) => t.id === selectedTargetId);
      if (!selectedTargetId || !currentInList) {
        setSelectedTargetId(tabs[0].id);
      }
    } else {
      setSelectedTargetId(null);
    }
  }, [tabs, selectedTargetId]);

  const selectedTarget: MetroTarget | null =
    selectedTargetId && metroTargets.length > 0
      ? (metroTargets.find((t) => `${METRO_TAB_ID_PREFIX}${t.id}` === selectedTargetId) ?? null)
      : null;

  if (isLoading && metroTargets.length === 0) {
    return <LoadingState />;
  }

  if (error && metroTargets.length === 0 && metroUrl) {
    return (
      <ErrorState
        error={error instanceof Error ? error : new Error(String(error))}
        onRetry={() => refetch()}
        isRetrying={isRefetching}
      />
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-gray-900">
      {tabs.length > 0 ? (
        <Tabs tabs={tabs} activeTabId={selectedTargetId} onTabChange={setSelectedTargetId} />
      ) : (
        <div className="flex items-end bg-gray-800 border-b border-gray-700 h-10 px-4">
          <div className="text-sm text-gray-400">
            {!metroUrl?.trim() ? 'Metro URL required' : 'No Metro targets available'}
          </div>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {!metroUrl?.trim() ? (
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-200 mb-2">Metro URL Required</h2>
            <p className="text-sm text-gray-400 mb-6">
              Set the Metro URL in Settings to connect to the React Native dev server (e.g.
              http://localhost:8081).
            </p>
            <Button
              onClick={openSettings}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Open Settings
            </Button>
          </div>
        ) : metroTargets.length === 0 && !error ? (
          <div className="text-center">
            <p className="text-gray-400">No Metro targets available</p>
            <p className="text-sm text-gray-500 mt-2">
              Start Metro (npx react-native start) and ensure the app is connected.
            </p>
          </div>
        ) : selectedTarget ? (
          <div className="w-full h-full flex flex-col">
            <iframe
              title="Metro DevTools"
              src={selectedTarget.devtoolsFrontendUrl}
              className="w-full h-full border-0 bg-white"
              allow="clipboard-read *; clipboard-write *"
            />
          </div>
        ) : tabs.length > 0 ? (
          <div className="text-center">
            <p className="text-gray-400">Select a tab to open Metro debugger</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
