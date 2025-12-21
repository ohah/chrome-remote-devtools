// Client table component / 클라이언트 테이블 컴포넌트 (Chii style / Chii 스타일)
import type { Client } from '@/entities/client';

interface ClientTableProps {
  clients: Client[];
  onSelect: (clientId: string) => void;
}

// Truncate text with ellipsis / 텍스트 말줄임표로 자르기
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

export function ClientTable({ clients, onSelect }: ClientTableProps) {
  if (clients.length === 0) {
    return <div className="text-center py-8 text-gray-400">No clients available</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Title
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              URL
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              IP
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              User Agent
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {clients.map((client) => (
            <tr
              key={client.id}
              className="cursor-pointer hover:bg-blue-900/20 transition-colors border-b border-gray-700"
            >
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-200">{client.title || '-'}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <a
                  href={client.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-sm text-blue-400 hover:text-blue-300 underline"
                >
                  {client.url ? truncate(client.url, 50) : '-'}
                </a>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className="text-sm text-gray-400 font-mono">{client.ip || '-'}</span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center">
                  <span className="text-sm text-gray-400">
                    {client.ua ? truncate(client.ua, 60) : '-'}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(client.id);
                  }}
                  className="text-sm text-blue-400 hover:text-blue-300 underline"
                >
                  inspect
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
