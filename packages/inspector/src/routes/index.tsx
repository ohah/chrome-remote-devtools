// Index route / 인덱스 라우트 (Connection page / 연결 페이지)
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { router } from '@/app/router';
import { ClientTable, ClientFilter, filterClients } from '@/features/client-list';
import { clientQueries } from '@/entities/client';

// File-based routing: routes/index.tsx automatically maps to `/` / 파일 기반 라우팅: routes/index.tsx가 자동으로 `/`에 매핑됨
export const Route = createFileRoute('/')({
  component: ConnectionPage,
});

function ConnectionPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const {
    data: clients = [],
    isLoading,
    error,
    isRefetching,
    refetch,
  } = useQuery(clientQueries.list());

  // Filter clients based on search query / 검색 쿼리를 기반으로 클라이언트 필터링
  const filteredClients = useMemo(() => {
    return filterClients(clients, searchQuery);
  }, [clients, searchQuery]);

  // Navigate to devtools when client row is clicked / 클라이언트 행 클릭 시 데브툴로 이동
  const handleSelect = (clientId: string) => {
    router.navigate({ to: '/devtools/$clientId', params: { clientId } } as never);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading clients...</div>
      </div>
    );
  }

  if (error && clients.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-400">Failed to load clients</h1>
          <p className="text-gray-400 mb-4">{error.message}</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (clients.length === 0 && !error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">No clients available</h1>
          <p className="text-gray-600">Waiting for clients to connect...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header bar / 헤더 바 */}
        <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <ClientFilter query={searchQuery} onQueryChange={setSearchQuery} />
            <div className="flex items-center gap-2">
              {isRefetching && (
                <span className="text-xs text-gray-500" aria-label="Refreshing">
                  Refreshing...
                </span>
              )}
              <span className="text-sm text-gray-400">
                {filteredClients.length} {filteredClients.length === 1 ? 'Target' : 'Targets'}
                {searchQuery && clients.length !== filteredClients.length && (
                  <span className="text-gray-500"> of {clients.length}</span>
                )}
              </span>
            </div>
          </div>
          <a
            href="https://github.com/ohah/chrome-remote-devtools"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-400 hover:text-gray-200"
          >
            Help
          </a>
        </div>

        {/* Error banner / 에러 배너 */}
        {error && clients.length > 0 && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg px-4 py-3 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-red-400">⚠</span>
              <span className="text-sm text-red-300">Failed to refresh: {error.message}</span>
            </div>
            <button
              onClick={() => refetch()}
              className="text-xs text-red-300 hover:text-red-200 underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Table container / 테이블 컨테이너 */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="p-4">
            <ClientTable clients={filteredClients} onSelect={handleSelect} />
          </div>
        </div>
      </div>
    </div>
  );
}
