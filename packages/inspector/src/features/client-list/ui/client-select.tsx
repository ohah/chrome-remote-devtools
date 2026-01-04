// Client select component / 클라이언트 선택 컴포넌트
import type { Client } from '@/entities/client';

interface ClientSelectProps {
  clients: Client[];
  selectedClientId: string | null;
  onSelect: (clientId: string) => void;
}

export function ClientSelect({ clients, selectedClientId, onSelect }: ClientSelectProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-2">Client:</label>
      <select
        value={selectedClientId || ''}
        onChange={(e) => onSelect(e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Select a client</option>
        {clients.map((client) => (
          <option key={client.id} value={client.id}>
            {client.type === 'web'
              ? client.url || client.id
              : client.appName || client.deviceName || client.id}
          </option>
        ))}
      </select>
    </div>
  );
}
