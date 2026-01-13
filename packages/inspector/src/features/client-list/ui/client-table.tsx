// Client table component / 클라이언트 테이블 컴포넌트 (Chii style / Chii 스타일)
import type { Client } from '@/entities/client';
import { sanitizeUrl } from '@/shared/lib';
import { HiDevicePhoneMobile, HiGlobeAlt } from 'react-icons/hi2';

interface ClientTableProps {
  clients: Client[];
  onSelect: (clientId: string) => void;
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
            <th className="px-2 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider w-12">
              {/* Type icon / 타입 아이콘 */}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              URL / Device
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              User Agent / App
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {clients.map((client) => {
            const isReactNative = client.type === 'react-native';

            return (
              <tr
                key={client.id}
                className="cursor-pointer hover:bg-blue-900/20 transition-colors border-b border-gray-700"
              >
                {/* Type icon / 타입 아이콘 */}
                <td className="px-2 py-3 text-center">
                  {isReactNative ? (
                    <HiDevicePhoneMobile
                      className="w-5 h-5 mx-auto text-gray-400"
                      role="img"
                      aria-label="React Native"
                      title="React Native"
                    />
                  ) : (
                    <HiGlobeAlt
                      className="w-5 h-5 mx-auto text-gray-400"
                      role="img"
                      aria-label="Web"
                      title="Web"
                    />
                  )}
                </td>

                {/* URL (web) or Device (React Native) / URL (웹) 또는 Device (React Native) */}
                <td className="px-4 py-3">
                  {isReactNative ? (
                    <span className="text-sm text-gray-200">{client.deviceName || '-'}</span>
                  ) : (
                    (() => {
                      const safeUrl = sanitizeUrl(client.url);
                      if (safeUrl) {
                        return (
                          <a
                            href={safeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm text-blue-400 hover:text-blue-300 underline truncate max-w-xs block"
                            title={safeUrl}
                            aria-label={`Open ${safeUrl} in new tab`}
                          >
                            {safeUrl}
                          </a>
                        );
                      }
                      return <span className="text-sm text-gray-400">-</span>;
                    })()
                  )}
                </td>

                {/* User Agent (web) or App (React Native) / User Agent (웹) 또는 App (React Native) */}
                <td className="px-4 py-3">
                  <div className="flex items-center">
                    <span
                      className="text-sm text-gray-400 truncate max-w-md block"
                      title={isReactNative ? client.appName : client.ua}
                    >
                      {isReactNative ? client.appName || '-' : client.ua || '-'}
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
                    aria-label={`Inspect client ${client.id}`}
                  >
                    inspect
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
