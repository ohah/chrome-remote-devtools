// Index route (Connection page)
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, useRef } from 'react';
import { ClientTable, ClientFilter, filterClients } from '@/features/client-list';
import { SettingsModal } from '@/features/settings';
import { clientQueries } from '@/entities/client';
import { LoadingState, ErrorState } from '@/shared/ui';
import { GITHUB_REPO_URL, useServerUrl } from '@/shared/lib';

// File-based routing: routes/index.tsx automatically maps to `/`
export const Route = createFileRoute('/')({
  component: ConnectionPage,
});

function ConnectionPage() {
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
        size: file.size,
        lastModified: file.lastModified,
        content: await file.text(), // Read file content
      };

      // Navigate to replay page with file data in state
      navigate({
        to: '/replay',
        state: { fileData } as any, // TanStack Router state type is strict, use type assertion
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
        {/* Header bar */}
        <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
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
            <button
              onClick={handleFileUploadClick}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
              aria-label="Upload file"
              title="Upload CDP event file"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              Upload File
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
              aria-label="Open settings"
              title="Settings"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Settings
            </button>
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
              aria-label="Open GitHub repository in new tab"
              title="Help"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Help
            </a>
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
