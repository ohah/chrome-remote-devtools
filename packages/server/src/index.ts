import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Client {
  id: string;
  ws: WebSocket;
  url?: string;
  title?: string;
  favicon?: string;
  ua?: string;
  time?: string;
}

interface DevTools {
  id: string;
  ws: WebSocket;
  clientId?: string;
}

export class SocketServer {
  private clients: Map<string, Client> = new Map();
  private devtools: Map<string, DevTools> = new Map();
  private wss: WebSocketServer;

  constructor() {
    this.wss = new WebSocketServer({ noServer: true });
  }

  initSocketServer(server: ReturnType<typeof createServer>) {
    server.on('upgrade', (request, socket, head) => {
      const url = new URL(request.url || '/', `http://${request.headers.host}`);
      const pathname = url.pathname.replace('/remote/debug', '');
      const [, from, id] = pathname.split('/');

      if (from !== 'devtools' && from !== 'client') {
        socket.destroy();
        return;
      }

      this.wss.handleUpgrade(request, socket, head, (ws) => {
        const searchParams = url.searchParams;

        if (from === 'client') {
          this.createClientSocketConnect(ws, {
            id: id || '',
            url: searchParams.get('url') || undefined,
            ua: searchParams.get('ua') || undefined,
            time: searchParams.get('time') || undefined,
            title: searchParams.get('title') || undefined,
            favicon: searchParams.get('favicon') || undefined,
          });
        } else {
          this.createDevtoolsSocketConnect(ws, {
            id: id || '',
            clientId: searchParams.get('clientId') || undefined,
          });
        }
      });
    });
  }

  private createClientSocketConnect(ws: WebSocket, connectInfo: Omit<Client, 'ws'>) {
    const { id } = connectInfo;
    console.log(`[client] ${id} connected`);

    const client: Client = { ws, ...connectInfo };
    this.clients.set(id, client);

    const sendToDevtools = (message: Buffer | string) => {
      this.devtools.forEach((devtool) => {
        if (devtool.clientId === id) {
          devtool.ws.send(message);
        }
      });
    };

    ws.on('message', (message) => {
      // Convert and log message / 메시지 변환 및 로깅
      let data: Buffer | string;
      if (Buffer.isBuffer(message)) {
        data = message.toString('utf-8');
      } else if (typeof message === 'string') {
        data = message;
      } else if (message instanceof ArrayBuffer) {
        data = Buffer.from(new Uint8Array(message)).toString('utf-8');
      } else {
        data = Buffer.from(message as unknown as ArrayLike<number>).toString('utf-8');
      }

      // Log received message / 수신된 메시지 로깅
      try {
        const parsed = JSON.parse(data);
        console.log(`[client] ${id} received:`, JSON.stringify(parsed, null, 2));
      } catch {
        console.log(`[client] ${id} received (raw):`, data);
      }

      sendToDevtools(data);
    });

    ws.on('close', () => {
      console.log(`[client] ${id} disconnected`);
      this.clients.delete(id);
      // 클라이언트가 연결 해제되면 해당 DevTools 연결도 종료
      this.devtools.forEach((devtool) => {
        if (devtool.clientId === id) {
          try {
            devtool.ws.close();
          } catch (error) {
            console.error(`[client] ${id} failed to close devtools ${devtool.id}:`, error);
          }
          this.devtools.delete(devtool.id);
        }
      });
    });

    ws.on('error', (error) => {
      console.error(`[client] ${id} error:`, error);
    });
  }

  private createDevtoolsSocketConnect(ws: WebSocket, connectInfo: Omit<DevTools, 'ws'>) {
    const { id, clientId } = connectInfo;
    console.log(`[devtools] ${id} connected${clientId ? ` to client ${clientId}` : ''}`);

    const devtool: DevTools = { ws, ...connectInfo };
    this.devtools.set(id, devtool);

    const client = clientId ? this.clients.get(clientId) : undefined;

    ws.on('close', () => {
      console.log(`[devtools] ${id} disconnected`);
      this.devtools.delete(id);
    });

    ws.on('error', (error) => {
      console.error(`[devtools] ${id} error:`, error);
    });

    // Forward messages from Inspector to Client / Inspector에서 Client로 메시지 전달
    // Handle client switching by checking current clientId / 현재 clientId를 확인하여 클라이언트 전환 처리
    ws.on('message', (message) => {
      const currentDevtool = this.devtools.get(id);
      if (!currentDevtool || !currentDevtool.clientId) {
        return;
      }

      let data: Buffer | string;
      if (Buffer.isBuffer(message)) {
        data = message.toString('utf-8');
      } else if (typeof message === 'string') {
        data = message;
      } else if (message instanceof ArrayBuffer) {
        data = Buffer.from(new Uint8Array(message)).toString('utf-8');
      } else {
        data = Buffer.from(message as unknown as ArrayLike<number>).toString('utf-8');
      }

      // Log received message from Inspector / Inspector로부터 수신된 메시지 로깅
      try {
        const parsed = JSON.parse(data);
        console.log(`[devtools] ${id} received:`, JSON.stringify(parsed, null, 2));
      } catch {
        console.log(`[devtools] ${id} received (raw):`, data);
      }

      const currentClient = this.clients.get(currentDevtool.clientId);
      if (!currentClient) {
        return;
      }

      if (currentClient.ws.readyState === WebSocket.OPEN) {
        try {
          currentClient.ws.send(message);
        } catch (error) {
          console.error(
            `[devtools] ${id} failed to send message to client ${currentDevtool.clientId}:`,
            error
          );
        }
      }
    });
  }

  // Switch Inspector to different client / Inspector를 다른 클라이언트로 전환
  switchClient(inspectorId: string, newClientId: string): boolean {
    const devtool = this.devtools.get(inspectorId);
    if (!devtool) {
      return false;
    }

    const client = this.clients.get(newClientId);
    if (!client) {
      return false;
    }

    // Update clientId / clientId 업데이트
    devtool.clientId = newClientId;

    // Remove old message handler and add new one / 기존 메시지 핸들러 제거 및 새로 추가
    // Note: WebSocket doesn't support removing listeners easily
    // We'll handle this by checking clientId in the message handler
    // 참고: WebSocket은 리스너 제거가 쉽지 않으므로 메시지 핸들러에서 clientId 확인

    return true;
  }

  // Get client by ID / ID로 클라이언트 가져오기
  getClient(clientId: string): Omit<Client, 'ws'> | undefined {
    const client = this.clients.get(clientId);
    if (!client) {
      return undefined;
    }
    const { ws, ...data } = client;
    return data;
  }

  // Get all clients / 모든 클라이언트 가져오기
  getAllClients(): Array<Omit<Client, 'ws'>> {
    return Array.from(this.clients.values()).map(({ ws, ...data }) => data);
  }

  // Get Inspector by ID / ID로 Inspector 가져오기
  getInspector(inspectorId: string): Omit<DevTools, 'ws'> | undefined {
    const devtool = this.devtools.get(inspectorId);
    if (!devtool) {
      return undefined;
    }
    const { ws, ...data } = devtool;
    return data;
  }

  // Get all Inspectors / 모든 Inspector 가져오기
  getAllInspectors(): Array<Omit<DevTools, 'ws'>> {
    return Array.from(this.devtools.values()).map(({ ws, ...data }) => data);
  }

  getClients(): Array<Omit<Client, 'ws'>> {
    return Array.from(this.clients.values()).map(({ ws, ...data }) => data);
  }
}

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;
const HOST = process.env.HOST || '0.0.0.0';

const server = createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  // CORS headers / CORS 헤더
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle OPTIONS request / OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    res.writeHead(200, headers);
    res.end();
    return;
  }

  if (url.pathname === '/json') {
    // Get all clients / 모든 클라이언트 가져오기
    res.writeHead(200, headers);
    res.end(JSON.stringify({ targets: socketServer.getClients() }));
    return;
  }

  if (url.pathname === '/json/clients') {
    // Get all clients with details / 상세 정보와 함께 모든 클라이언트 가져오기
    res.writeHead(200, headers);
    res.end(JSON.stringify({ clients: socketServer.getAllClients() }));
    return;
  }

  if (url.pathname === '/json/inspectors') {
    // Get all inspectors / 모든 Inspector 가져오기
    res.writeHead(200, headers);
    res.end(JSON.stringify({ inspectors: socketServer.getAllInspectors() }));
    return;
  }

  if (url.pathname.startsWith('/json/client/')) {
    // Get specific client / 특정 클라이언트 가져오기
    const clientId = url.pathname.replace('/json/client/', '');
    const client = socketServer.getClient(clientId);
    if (client) {
      res.writeHead(200, headers);
      res.end(JSON.stringify({ client }));
    } else {
      res.writeHead(404, headers);
      res.end(JSON.stringify({ error: 'Client not found' }));
    }
    return;
  }

  if (url.pathname === '/client.js') {
    // Serve built client script / 빌드된 클라이언트 스크립트 서빙
    try {
      const clientScriptPath = join(__dirname, '../../client/dist/index.js');
      const clientScript = readFileSync(clientScriptPath, 'utf-8');
      res.writeHead(200, {
        'Content-Type': 'application/javascript',
        ...headers,
      });
      res.end(clientScript);
    } catch (error) {
      // Fallback: 빌드되지 않은 경우 경고 메시지 / Fallback: warning if not built
      res.writeHead(200, {
        'Content-Type': 'application/javascript',
        ...headers,
      });
      res.end(`
        console.error('Client script not found. Please build: cd packages/client && bun run build');
      `);
    }
    return;
  }

  res.writeHead(404, headers);
  res.end(JSON.stringify({ error: 'Not Found' }));
});

const socketServer = new SocketServer();
socketServer.initSocketServer(server);

// Only start server when run directly / 직접 실행될 때만 서버 시작
if (import.meta.main) {
  server.listen(PORT, HOST, () => {
    console.log(`Server started at http://${HOST}:${PORT}`);
  });
}
