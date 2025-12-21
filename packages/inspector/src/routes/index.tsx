// Index route / 인덱스 라우트 (Connection page / 연결 페이지)
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ClientTable, ClientFilter, filterClients } from '@/features/client-list';
import { clientQueries } from '@/entities/client';
import { LoadingState, ErrorState, EmptyState } from '@/shared/ui';
import { GITHUB_REPO_URL } from '@/shared/lib';

// File-based routing: routes/index.tsx automatically maps to `/` / 파일 기반 라우팅: routes/index.tsx가 자동으로 `/`에 매핑됨
export const Route = createFileRoute('/')({
  component: ConnectionPage,
});

function ConnectionPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
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
    navigate({
      to: '/devtools/$clientId',
      params: { clientId },
    });
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (error && clients.length === 0) {
    return <ErrorState error={error} onRetry={() => refetch()} isRetrying={isRefetching} />;
  }

  if (clients.length === 0 && !error) {
    return (
      <EmptyState message="No clients available" description="Waiting for clients to connect..." />
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
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-400 hover:text-gray-200"
            aria-label="Open GitHub repository in new tab"
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
              disabled={isRefetching}
              aria-label="Retry loading clients"
              className="text-xs text-red-300 hover:text-red-200 underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRefetching ? 'Retrying...' : 'Retry'}
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
