import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { gunzipSync } from 'zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Log configuration / 로그 설정
// Default: disabled in both development and production / 기본값: 개발 및 프로덕션 모두에서 비활성화
const logEnabled = process.env.LOG_ENABLED === 'true';
const logMethodsEnv = process.env.LOG_METHODS || '';
const allowedMethods = logMethodsEnv
  ? new Set(
      logMethodsEnv
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean)
    )
  : null; // null means all methods are allowed / null이면 모든 메소드 허용

/**
 * Log helper with method filtering / 메소드 필터링이 있는 로그 헬퍼
 * @param type - Log type (client, devtools, etc.) / 로그 타입 (client, devtools 등)
 * @param id - Client or DevTools ID / 클라이언트 또는 DevTools ID
 * @param message - Log message / 로그 메시지
 * @param data - Optional data to log / 선택적 로그 데이터
 * @param method - Optional CDP method name for filtering / 필터링을 위한 선택적 CDP 메소드 이름
 */
function log(
  type: 'client' | 'devtools' | 'server',
  id: string,
  message: string,
  data?: unknown,
  method?: string
): void {
  if (!logEnabled) {
    return;
  }

  // Filter by method if configured / 설정된 경우 메소드로 필터링
  if (method && allowedMethods && !allowedMethods.has(method)) {
    return;
  }

  const prefix = `[${type}] ${id}`;
  if (data !== undefined) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

/**
 * Log error / 에러 로그
 */
function logError(
  type: 'client' | 'devtools' | 'server',
  id: string,
  message: string,
  error?: unknown
): void {
  if (!logEnabled) {
    return;
  }
  const prefix = `[${type}] ${id}`;
  if (error !== undefined) {
    console.error(`${prefix} ${message}:`, error);
  } else {
    console.error(`${prefix} ${message}`);
  }
}

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
    log('client', id, 'connected');

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

      // Check if message contains compressed data / 메시지에 압축된 데이터가 포함되어 있는지 확인
      try {
        const parsed = JSON.parse(data);

        // Check if message contains compressed data / 메시지에 압축된 데이터가 포함되어 있는지 확인
        // Compressed data is stored in params with compressed marker / 압축된 데이터는 compressed 마커와 함께 params에 저장됨
        if (parsed.params && typeof parsed.params === 'object' && 'compressed' in parsed.params) {
          // Check for compressed marker / 압축 마커 확인
          if (parsed.params.compressed === true && Array.isArray(parsed.params.data)) {
            try {
              // Decompress the data / 데이터 압축 해제
              const compressedBuffer = Buffer.from(parsed.params.data as number[]);
              const decompressed = gunzipSync(compressedBuffer);
              const decompressedData = JSON.parse(decompressed.toString('utf-8'));
              // Replace entire message with decompressed data / 전체 메시지를 압축 해제된 데이터로 교체
              // decompressedData contains { method, params, timestamp } / decompressedData는 { method, params, timestamp } 포함
              parsed.method = decompressedData.method;
              parsed.params = decompressedData.params;
              // Update data string with decompressed content / 압축 해제된 내용으로 data 문자열 업데이트
              data = JSON.stringify(parsed);
            } catch (error) {
              logError('client', id, 'decompression failed / 압축 해제 실패', error);
              // Continue with original compressed data if decompression fails / 압축 해제 실패 시 원본 압축 데이터 사용
            }
          }
        }

        const method = parsed?.method as string | undefined;
        log('client', id, 'received:', JSON.stringify(parsed, null, 2), method);
      } catch {
        // If parsing fails, log and send raw data / 파싱 실패 시 원본 데이터 로그 및 전송
        log('client', id, 'received (raw):', data);
      }

      // Send data to DevTools (decompressed if compression was successful, original otherwise) / DevTools로 데이터 전송 (압축 해제 성공 시 압축 해제된 데이터, 실패 시 원본)
      sendToDevtools(data);
    });

    ws.on('close', () => {
      log('client', id, 'disconnected');
      this.clients.delete(id);
      // 클라이언트가 연결 해제되면 해당 DevTools 연결도 종료
      this.devtools.forEach((devtool) => {
        if (devtool.clientId === id) {
          try {
            devtool.ws.close();
          } catch (error) {
            logError('client', id, `failed to close devtools ${devtool.id}`, error);
          }
          this.devtools.delete(devtool.id);
        }
      });
    });

    ws.on('error', (error) => {
      logError('client', id, 'error', error);
    });
  }

  private createDevtoolsSocketConnect(ws: WebSocket, connectInfo: Omit<DevTools, 'ws'>) {
    const { id, clientId } = connectInfo;
    log('devtools', id, `connected${clientId ? ` to client ${clientId}` : ''}`);

    const devtool: DevTools = { ws, ...connectInfo };
    this.devtools.set(id, devtool);

    // Request stored events from client when DevTools connects / DevTools 연결 시 클라이언트에 저장된 이벤트 요청
    if (clientId) {
      const client = this.clients.get(clientId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        // Send request to client to replay stored events / 클라이언트에 저장된 이벤트 재생 요청 전송
        try {
          client.ws.send(
            JSON.stringify({
              method: 'SessionReplay.replayStoredEvents',
              params: {},
            })
          );
          log(
            'devtools',
            id,
            `requested stored events from client ${clientId} / ${id}가 클라이언트 ${clientId}에 저장된 이벤트 요청`
          );
        } catch (error) {
          logError(
            'devtools',
            id,
            'failed to request stored events / 저장된 이벤트 요청 실패',
            error
          );
        }
      }
    }

    ws.on('close', () => {
      log('devtools', id, 'disconnected');
      this.devtools.delete(id);
    });

    ws.on('error', (error) => {
      logError('devtools', id, 'error', error);
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
        const method = parsed?.method as string | undefined;
        log('devtools', id, 'received:', JSON.stringify(parsed, null, 2), method);
      } catch {
        log('devtools', id, 'received (raw):', data);
      }

      const currentClient = this.clients.get(currentDevtool.clientId);
      if (!currentClient) {
        return;
      }

      if (currentClient.ws.readyState === WebSocket.OPEN) {
        try {
          currentClient.ws.send(message);
        } catch (error) {
          logError(
            'devtools',
            id,
            `failed to send message to client ${currentDevtool.clientId}`,
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
    const { ws: _ws, ...data } = client;
    return data;
  }

  // Get all clients / 모든 클라이언트 가져오기
  getAllClients(): Array<Omit<Client, 'ws'>> {
    return Array.from(this.clients.values()).map(({ ws: _ws, ...data }) => data);
  }

  // Get Inspector by ID / ID로 Inspector 가져오기
  getInspector(inspectorId: string): Omit<DevTools, 'ws'> | undefined {
    const devtool = this.devtools.get(inspectorId);
    if (!devtool) {
      return undefined;
    }
    const { ws: _ws, ...data } = devtool;
    return data;
  }

  // Get all Inspectors / 모든 Inspector 가져오기
  getAllInspectors(): Array<Omit<DevTools, 'ws'>> {
    return Array.from(this.devtools.values()).map(({ ws: _ws, ...data }) => data);
  }

  getClients(): Array<Omit<Client, 'ws'>> {
    return Array.from(this.clients.values()).map(({ ws: _ws, ...data }) => data);
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
    } catch {
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
    // Server startup message is always shown / 서버 시작 메시지는 항상 표시
    console.log(`Server started at http://${HOST}:${PORT}`);
    if (logEnabled) {
      if (allowedMethods) {
        console.log(
          `Log filtering enabled / 로그 필터링 활성화: ${Array.from(allowedMethods).join(', ')}`
        );
      } else {
        console.log('All logs enabled / 모든 로그 활성화');
      }
    }
    // Logging is disabled by default / 로깅은 기본적으로 비활성화됨
  });
}
