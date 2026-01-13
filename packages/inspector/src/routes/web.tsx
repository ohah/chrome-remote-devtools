// Web-specific connection page / 웹 전용 연결 페이지
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, useRef, useEffect } from 'react';
import { ClientTable, ClientFilter, filterClients } from '@/features/client-list';
import { SettingsModal } from '@/features/settings';
import { clientQueries } from '@/entities/client';
import { LoadingState, ErrorState } from '@/shared/ui';
import { GITHUB_REPO_URL, useServerUrl } from '@/shared/lib';
import { Upload, Settings, HelpCircle, Globe, Smartphone } from 'lucide-react';
import type { InspectorMode } from '@/routes/__root';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Mode selector component / 모드 선택 컴포넌트
function ModeSelector({
  mode,
  onModeChange,
}: {
  mode: InspectorMode;
  onModeChange: (mode: InspectorMode) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 px-0.5 py-0.5 bg-gray-700/30 rounded">
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onModeChange('react-native')}
            className={`cursor-pointer h-auto px-2.5 py-1.5 rounded text-xs transition-all ${
              mode === 'react-native'
                ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-600/50'
            }`}
            aria-label="React Native Mode"
          >
            <Smartphone className="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>React Native</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onModeChange('web')}
            className={`cursor-pointer h-auto px-2.5 py-1.5 rounded text-xs transition-all ${
              mode === 'web'
                ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-600/50'
            }`}
            aria-label="Web Remote Mode"
          >
            <Globe className="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Web</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export const Route = createFileRoute('/web')({
  component: WebConnectionPage,
});

function WebConnectionPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [mode, setMode] = useState<InspectorMode>(() => {
    // Load mode from localStorage / localStorage에서 모드 로드
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('inspector-mode');
      return (saved === 'web' || saved === 'react-native' ? saved : 'web') as InspectorMode;
    }
    return 'web';
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { serverUrl } = useServerUrl();

  useEffect(() => {
    // Save mode to localStorage / 모드를 localStorage에 저장
    if (typeof window !== 'undefined') {
      localStorage.setItem('inspector-mode', mode);
    }
  }, [mode]);
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

  // Filter clients based on search query
  const filteredClients = useMemo(() => {
    return filterClients(clients, searchQuery);
  }, [clients, searchQuery]);

  // Navigate to devtools when client row is clicked
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

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header bar (sticky) */}
        <div className="sticky top-0 z-50 bg-gray-800 border-b border-gray-700 pl-0 pr-4 py-3 flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <ModeSelector mode={mode} onModeChange={setMode} />
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="flex items-center gap-2 text-gray-400 hover:text-gray-200"
                  aria-label="Open GitHub repository in new tab"
                >
                  <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer">
                    <HelpCircle className="h-5 w-5" />
                    Help
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Help</p>
              </TooltipContent>
            </Tooltip>
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
