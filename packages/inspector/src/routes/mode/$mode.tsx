// Connection page with mode routing / 모드 라우팅을 사용한 연결 페이지
import { createFileRoute, useNavigate, redirect } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, useRef } from 'react';
import { ClientTable, ClientFilter, filterClients } from '@/features/client-list';
import { SettingsModal } from '@/features/settings';
import { clientQueries } from '@/entities/client';
import { LoadingState, ErrorState } from '@/shared/ui';
import { useServerUrl } from '@/shared/lib';
import { Upload, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/mode/$mode')({
  // Validate mode parameter / 모드 파라미터 검증
  beforeLoad: ({ params }) => {
    if (params.mode !== 'web' && params.mode !== 'react-native') {
      // Redirect to default mode if invalid / 유효하지 않으면 기본 모드로 리다이렉트
      throw redirect({
        to: '/mode/$mode',
        params: { mode: 'web' },
      });
    }
  },
  component: ConnectionPage,
});

function ConnectionPage() {
  const { mode } = Route.useParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
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

  // Filter clients based on mode and search query / 모드와 검색 쿼리에 따라 클라이언트 필터링
  const filteredClients = useMemo(() => {
    let filtered = clients;

    // Filter by mode / 모드에 따라 필터링
    if (mode === 'react-native') {
      filtered = filtered.filter((client) => client.type === 'react-native');
    } else {
      filtered = filtered.filter((client) => client.type === 'web');
    }

    // Filter by search query / 검색 쿼리에 따라 필터링
    return filterClients(filtered, searchQuery);
  }, [clients, searchQuery, mode]);

  // Navigate to devtools when client row is clicked / 클라이언트 행 클릭 시 DevTools로 이동
  const handleSelect = (clientId: string) => {
    navigate({
      to: '/devtools/$clientId',
      params: { clientId },
    });
  };

  // Handle file upload button click
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

  // Show client list for both modes / 두 모드 모두 클라이언트 리스트 표시
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tauri-specific header / Tauri 전용 헤더 */}
        <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-200">Chrome Remote DevTools</h1>
            <ClientFilter query={searchQuery} onQueryChange={setSearchQuery} />
          </div>
          <div className="flex items-center gap-4">
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
              size="sm"
              onClick={handleFileUploadClick}
              className="flex items-center gap-2 text-gray-400 hover:text-gray-200"
              aria-label="Upload file"
            >
              <Upload className="h-5 w-5" />
              Upload File
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-2 text-gray-400 hover:text-gray-200"
              aria-label="Open settings"
            >
              <Settings className="h-5 w-5" />
              Settings
            </Button>
          </div>
        </div>

        {/* Error banner */}
        {error && clients.length > 0 && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg px-4 py-3 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-red-400">⚠</span>
              <span className="text-sm text-red-300">Failed to refresh: {error.message}</span>
            </div>
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              aria-label="Retry loading clients"
              className="text-xs text-red-300 hover:text-red-200 underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRefetching ? 'Retrying...' : 'Retry'}
            </button>
          </div>
        )}

        {/* Table container */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="p-4">
            {!serverUrl ? (
              <div className="text-center py-12">
                <h2 className="text-xl font-semibold text-gray-200 mb-2">Server URL Required</h2>
                <p className="text-sm text-gray-400 mb-6">
                  Please configure the server URL in Settings to connect to the WebSocket server.
                </p>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Open Settings
                </button>
              </div>
            ) : clients.length === 0 && !error ? (
              <div className="text-center py-12">
                <p className="text-gray-400">No clients available</p>
                <p className="text-sm text-gray-500 mt-2">Waiting for clients to connect...</p>
              </div>
            ) : (
              <ClientTable clients={filteredClients} onSelect={handleSelect} />
            )}
          </div>
        </div>
      </div>

      {/* Settings modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
