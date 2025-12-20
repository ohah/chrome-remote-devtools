import { useRef, useState, useEffect } from 'react';
import './App.css';

interface Client {
  id: string;
  url?: string;
  title?: string;
}

function App() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  // Fetch clients list / 클라이언트 목록 가져오기
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await fetch('http://localhost:8080/json/clients');
        const data = await response.json();
        setClients(data.clients || []);
        if (data.clients && data.clients.length > 0 && !selectedClient) {
          setSelectedClient(data.clients[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch clients:', error);
      }
    };

    fetchClients();
    const interval = setInterval(fetchClients, 2000); // Refresh every 2 seconds / 2초마다 갱신
    return () => clearInterval(interval);
  }, [selectedClient]);

  // Setup DevTools iframe with WebSocket URL parameter / WebSocket URL 파라미터와 함께 DevTools iframe 설정
  useEffect(() => {
    if (!iframeRef.current || !selectedClient) return;

    const url = new URL('/devtools-frontend/devtools_app.html', window.location.origin);
    const params = url.searchParams;

    // WebSocket URL parameter / WebSocket URL 파라미터
    const wsUrl = `localhost:8080/remote/debug/devtools/${Date.now()}?clientId=${selectedClient}`;
    params.append('ws', wsUrl);
    console.log('Using WebSocket URL:', wsUrl);

    // DevTools configuration parameters / DevTools 설정 파라미터
    params.append('experiments', 'true');
    params.append('v8only', 'true');
    params.append('improvedChromeReloads', 'true');
    params.append('experimental', 'true');

    // Enable panels / 패널 활성화
    params.append('enableConsole', 'true');
    params.append('enableRuntime', 'true');
    params.append('enableNetwork', 'true');
    params.append('enableDebugger', 'true');

    iframeRef.current.src = url.toString();
  }, [selectedClient]); // Only update when selectedClient changes / selectedClient가 변경될 때만 업데이트

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Control Panel / 컨트롤 패널 */}
      <div style={{ padding: '10px', background: '#f0f0f0', borderBottom: '1px solid #ccc' }}>
        <div style={{ marginBottom: '10px' }}>
          <label>Client: </label>
          <select
            value={selectedClient || ''}
            onChange={(e) => setSelectedClient(e.target.value)}
            style={{ padding: '4px 8px' }}
          >
            <option value="">Select a client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.title || client.url || client.id}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* DevTools iframe / DevTools iframe */}
      <iframe
        ref={iframeRef}
        style={{
          flex: 1,
          width: '100%',
          border: 'none',
        }}
        title="DevTools"
      />
    </div>
  );
}

export default App;
