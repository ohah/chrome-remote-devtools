// Index route / 인덱스 라우트 (Connection page / 연결 페이지)
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState, useMemo } from 'react';
import { router } from '@/app/router';
import { getClients, ClientTable, ClientFilter, filterClients } from '@/features/client-list';
import type { Client } from '@/entities/client';
import { CLIENT_REFRESH_INTERVAL } from '@/shared/lib';

// File-based routing: routes/index.tsx automatically maps to `/` / 파일 기반 라우팅: routes/index.tsx가 자동으로 `/`에 매핑됨
export const Route = createFileRoute('/')({
  component: ConnectionPage,
});

function ConnectionPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter clients based on search query / 검색 쿼리를 기반으로 클라이언트 필터링
  const filteredClients = useMemo(() => {
    return filterClients(clients, searchQuery);
  }, [clients, searchQuery]);

  // Fetch clients list / 클라이언트 목록 가져오기
  useEffect(() => {
    const fetchClients = async () => {
      const fetchedClients = await getClients();
      setClients(fetchedClients);
      setIsLoading(false);
    };

    fetchClients();
    const interval = setInterval(fetchClients, CLIENT_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

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

  if (clients.length === 0) {
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
            <span className="text-sm text-gray-400">
              {filteredClients.length} {filteredClients.length === 1 ? 'Target' : 'Targets'}
              {searchQuery && clients.length !== filteredClients.length && (
                <span className="text-gray-500"> of {clients.length}</span>
              )}
            </span>
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
