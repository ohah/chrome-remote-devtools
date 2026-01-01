import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { gunzipSync } from 'zlib';
import { createWriteStream, mkdirSync } from 'fs';
import { dirname } from 'path';
import { ReactNativeInspectorConnectionManager } from './react-native/inspector-connection';
import { handleReactNativeInspectorWebSocket } from './react-native/inspector-handler';

// Log configuration / 로그 설정
// Default: disabled in both development and production / 기본값: 개발 및 프로덕션 모두에서 비활성화
let logEnabled = process.env.LOG_ENABLED === 'true';
let logMethodsEnv = process.env.LOG_METHODS || '';
let logFile: string | undefined = process.env.LOG_FILE_PATH;
let logStream: ReturnType<typeof createWriteStream> | null = null;
let allowedMethods: Set<string> | null = null;

// Initialize allowed methods / 허용된 메소드 초기화
function updateAllowedMethods(methods: string): void {
  allowedMethods = methods
    ? new Set(
        methods
          .split(',')
          .map((m) => m.trim())
          .filter(Boolean)
      )
    : null; // null means all methods are allowed / null이면 모든 메소드 허용
}

// Initialize log file stream if path is provided / 로그 파일 경로가 제공되면 스트림 초기화
if (logFile) {
  try {
    // Create directory if it doesn't exist / 디렉토리가 없으면 생성
    const logDir = dirname(logFile);
    mkdirSync(logDir, { recursive: true });
    logStream = createWriteStream(logFile, { flags: 'a' });
  } catch (error) {
    console.error(`Failed to create log file / 로그 파일 생성 실패: ${logFile}`, error);
  }
}

// Initialize allowed methods / 허용된 메소드 초기화
updateAllowedMethods(logMethodsEnv);

/**
 * Set log configuration / 로그 설정 변경
 * @param enabled - Enable logging / 로깅 활성화
 * @param methods - Comma-separated list of methods to log / 로깅할 메소드 목록 (쉼표로 구분)
 * @param filePath - Path to log file / 로그 파일 경로
 */
export function setLogConfig(enabled: boolean, methods?: string, filePath?: string): void {
  logEnabled = enabled;
  logMethodsEnv = methods || '';
  logFile = filePath;

  // Update allowed methods / 허용된 메소드 업데이트
  updateAllowedMethods(logMethodsEnv);

  // Close existing stream if any / 기존 스트림이 있으면 닫기
  if (logStream) {
    try {
      logStream.end();
    } catch (error) {
      console.error('Failed to close log stream / 로그 스트림 닫기 실패:', error);
    }
    logStream = null;
  }

  // Create new stream if file path is provided / 파일 경로가 제공되면 새 스트림 생성
  if (logFile) {
    try {
      const logDir = dirname(logFile);
      mkdirSync(logDir, { recursive: true });
      logStream = createWriteStream(logFile, { flags: 'a' });
      // Add error handler for asynchronous write failures / 비동기 쓰기 실패를 위한 에러 핸들러 추가
      logStream.on('error', (error) => {
        console.error(`Log stream error / 로그 스트림 오류: ${logFile}`, error);
      });
    } catch (error) {
      console.error(`Failed to create log file / 로그 파일 생성 실패: ${logFile}`, error);
    }
  }
}

/**
 * Write log message to file / 로그 메시지를 파일에 기록
 * @param logMessage - Log message to write / 기록할 로그 메시지
 */
function writeLog(logMessage: string): void {
  if (logStream) {
    try {
      logStream.write(logMessage);
    } catch (error) {
      console.error('Failed to write to log file / 로그 파일 쓰기 실패:', error);
    }
  }
}

/**
 * Log helper with method filtering / 메소드 필터링이 있는 로그 헬퍼
 * @param type - Log type (client, devtools, etc.) / 로그 타입 (client, devtools 등)
 * @param id - Client or DevTools ID / 클라이언트 또는 DevTools ID
 * @param message - Log message / 로그 메시지
 * @param data - Optional data to log / 선택적 로그 데이터
 * @param method - Optional CDP method name for filtering / 필터링을 위한 선택적 CDP 메소드 이름
 */
export function log(
  type: 'client' | 'devtools' | 'server' | 'rn-inspector',
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
  const timestamp = new Date().toISOString();
  let logMessage: string;

  if (data !== undefined) {
    const dataStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    logMessage = `${timestamp} ${prefix} ${message} ${dataStr}\n`;
    console.log(`${prefix} ${message}`, data);
  } else {
    logMessage = `${timestamp} ${prefix} ${message}\n`;
    console.log(`${prefix} ${message}`);
  }

  // Write to file if log stream is available / 로그 스트림이 있으면 파일에 기록
  writeLog(logMessage);
}

/**
 * Log error / 에러 로그
 */
export function logError(
  type: 'client' | 'devtools' | 'server' | 'rn-inspector',
  id: string,
  message: string,
  error?: unknown
): void {
  if (!logEnabled) {
    return;
  }
  const prefix = `[${type}] ${id}`;
  const timestamp = new Date().toISOString();
  let logMessage: string;

  if (error !== undefined) {
    const errorStr = error instanceof Error ? error.stack || error.message : String(error);
    logMessage = `${timestamp} ${prefix} ${message}: ${errorStr}\n`;
    console.error(`${prefix} ${message}:`, error);
  } else {
    logMessage = `${timestamp} ${prefix} ${message}\n`;
    console.error(`${prefix} ${message}`);
  }

  // Write to file if log stream is available / 로그 스트림이 있으면 파일에 기록
  writeLog(logMessage);
}

// CDP message types / CDP 메시지 타입
export interface CDPMessage {
  method?: string;
  params?: unknown;
  id?: number;
  result?: unknown;
  error?: unknown;
}

/**
 * Safely parse CDP message / CDP 메시지를 안전하게 파싱
 * @param message - Message string to parse / 파싱할 메시지 문자열
 * @returns Parsed message or null if parsing fails / 파싱된 메시지 또는 파싱 실패 시 null
 */
function safeParseCDPMessage(message: string): CDPMessage | null {
  try {
    return JSON.parse(message) as CDPMessage;
  } catch {
    return null;
  }
}

interface CompressedParams {
  compressed: true;
  data: number[];
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
  public readonly reactNativeInspectorManager: ReactNativeInspectorConnectionManager;

  constructor() {
    this.wss = new WebSocketServer({ noServer: true });
    this.reactNativeInspectorManager = new ReactNativeInspectorConnectionManager();
  }

  /**
   * Convert WebSocket message to string / WebSocket 메시지를 문자열로 변환
   * @param message - WebSocket message data / WebSocket 메시지 데이터
   * @returns String representation of the message / 메시지의 문자열 표현
   */
  private convertMessageToString(message: WebSocket.Data): string {
    if (Buffer.isBuffer(message)) {
      return message.toString('utf-8');
    }
    if (typeof message === 'string') {
      return message;
    }
    if (message instanceof ArrayBuffer) {
      return Buffer.from(new Uint8Array(message)).toString('utf-8');
    }
    return Buffer.from(message as unknown as ArrayLike<number>).toString('utf-8');
  }

  /**
   * Decompress message if it contains compressed data / 압축된 데이터가 포함된 경우 메시지 압축 해제
   * @param parsed - Parsed JSON message / 파싱된 JSON 메시지
   * @param clientId - Client ID for logging / 로깅용 클라이언트 ID
   * @returns Decompressed message as JSON string / 압축 해제된 메시지 (JSON 문자열)
   */
  private decompressMessage(
    parsed: CDPMessage & { params?: CompressedParams | unknown },
    clientId: string
  ): string {
    // Check if message contains compressed data / 메시지에 압축된 데이터가 포함되어 있는지 확인
    if (!parsed.params || typeof parsed.params !== 'object' || !('compressed' in parsed.params)) {
      return JSON.stringify(parsed);
    }

    const params = parsed.params as CompressedParams;
    // Check for compressed marker / 압축 마커 확인
    if (params.compressed === true && Array.isArray(params.data)) {
      try {
        // Decompress the data / 데이터 압축 해제
        const compressedBuffer = Buffer.from(params.data);
        const decompressed = gunzipSync(compressedBuffer);
        const decompressedData = JSON.parse(decompressed.toString('utf-8')) as {
          method: string;
          params: unknown;
          timestamp?: unknown;
        };
        // Replace entire message with decompressed data without mutating the original parsed object
        // decompressedData contains { method, params, timestamp } / decompressedData는 { method, params, timestamp } 포함
        const decompressedMessage: CDPMessage & { params?: unknown } = {
          ...parsed,
          method: decompressedData.method,
          params: decompressedData.params,
        };
        return JSON.stringify(decompressedMessage);
      } catch (error) {
        logError('client', clientId, 'decompression failed / 압축 해제 실패', error);
        // Continue with original compressed data if decompression fails / 압축 해제 실패 시 원본 압축 데이터 사용
        return JSON.stringify(parsed);
      }
    }

    return JSON.stringify(parsed);
  }

  /**
   * Request stored events from client / 클라이언트에 저장된 이벤트 요청
   * @param client - Client instance / 클라이언트 인스턴스
   * @param devtoolsId - DevTools ID for logging / 로깅용 DevTools ID
   */
  private requestStoredEvents(client: Client, devtoolsId: string): void {
    if (client.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    // Methods to request stored events / 저장된 이벤트를 요청할 메서드들
    const methods = ['Storage.replayStoredEvents', 'SessionReplay.replayStoredEvents'];

    for (const method of methods) {
      try {
        client.ws.send(
          JSON.stringify({
            method,
            params: {},
          })
        );
        log(
          'devtools',
          devtoolsId,
          `requested ${method} from client ${client.id} / ${devtoolsId}가 클라이언트 ${client.id}에 ${method} 요청`
        );
      } catch (error) {
        logError(
          'devtools',
          devtoolsId,
          `failed to request ${method} / ${method} 요청 실패`,
          error
        );
      }
    }
  }

  initSocketServer(server: ReturnType<typeof createServer>) {
    server.on('upgrade', (request, socket, head) => {
      const url = new URL(request.url || '/', `http://${request.headers.host}`);
      const pathname = url.pathname;

      // Handle React Native Inspector WebSocket connections / React Native Inspector WebSocket 연결 처리
      if (pathname === '/inspector/device') {
        const deviceName = url.searchParams.get('name') || undefined;
        const appName = url.searchParams.get('app') || undefined;
        const deviceId = url.searchParams.get('device') || undefined;
        log('rn-inspector', 'upgrade', 'WebSocket upgrade to /inspector/device', {
          url: request.url,
          deviceName,
          appName,
          deviceId,
          headers: {
            upgrade: request.headers.upgrade,
            connection: request.headers.connection,
          },
        });
        this.wss.handleUpgrade(request, socket, head, (ws) => {
          handleReactNativeInspectorWebSocket(ws, request, this.reactNativeInspectorManager, this);
        });
        return;
      }

      // Handle standard Chrome Remote DevTools connections / 표준 Chrome Remote DevTools 연결 처리
      const normalizedPathname = pathname.replace('/remote/debug', '');
      const [, from, id] = normalizedPathname.split('/');

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
          try {
            // Log if this is a Runtime.consoleAPICalled event / Runtime.consoleAPICalled 이벤트인 경우 로깅
            const messageStr = typeof message === 'string' ? message : message.toString('utf-8');
            try {
              const parsed = JSON.parse(messageStr);
              if (parsed.method === 'Runtime.consoleAPICalled') {
                log(
                  'client',
                  id,
                  `✅ Sending Runtime.consoleAPICalled to devtools ${devtool.id}, type: ${parsed.params?.type}`
                );
              }
            } catch {
              // Ignore parse errors / 파싱 에러 무시
            }
            devtool.ws.send(message);
          } catch (error) {
            logError('client', id, `failed to send message to devtools ${devtool.id}`, error);
          }
        }
      });

      // Also send to React Native Inspector connections / React Native Inspector 연결에도 전송
      this.reactNativeInspectorManager.getAllConnections().forEach((inspector) => {
        if (inspector.clientId === id) {
          const connection = this.reactNativeInspectorManager.getConnection(inspector.id);
          if (connection && connection.ws.readyState === WebSocket.OPEN) {
            try {
              connection.ws.send(message);
            } catch (error) {
              logError(
                'client',
                id,
                `failed to send message to RN inspector ${inspector.id}`,
                error
              );
            }
          }
        }
      });
    };

    ws.on('message', (message) => {
      // Convert message to string / 메시지를 문자열로 변환
      let data = this.convertMessageToString(message);

      // Check if message contains compressed data / 메시지에 압축된 데이터가 포함되어 있는지 확인
      const parsed = safeParseCDPMessage(data) as
        | (CDPMessage & { params?: CompressedParams | unknown })
        | null;
      if (parsed) {
        // Decompress if needed / 필요시 압축 해제
        data = this.decompressMessage(parsed, id);

        // Re-parse after decompression for logging / 로깅을 위해 압축 해제 후 재파싱
        const parsedForLog = safeParseCDPMessage(data);
        if (parsedForLog) {
          const method = parsedForLog.method;
          log('client', id, 'received:', JSON.stringify(parsedForLog, null, 2), method);
        }
      } else {
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
      // Try regular client first / 일반 클라이언트 먼저 시도
      const client = this.clients.get(clientId);
      if (client) {
        this.requestStoredEvents(client, id);
      } else {
        // Try React Native Inspector connection / React Native Inspector 연결 시도
        const inspector = this.reactNativeInspectorManager.getConnection(clientId);
        if (inspector) {
          // Associate DevTools with React Native Inspector / DevTools를 React Native Inspector와 연결
          this.reactNativeInspectorManager.associateWithClient(clientId, clientId);
          log('devtools', id, `associated with React Native Inspector ${clientId}`);
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

      // Convert message to string for logging / 로깅을 위해 메시지를 문자열로 변환
      const data = this.convertMessageToString(message);

      // Log received message from Inspector / Inspector로부터 수신된 메시지 로깅
      const parsed = safeParseCDPMessage(data);
      if (parsed) {
        const method = parsed.method;
        log('devtools', id, 'received:', JSON.stringify(parsed, null, 2), method);

        // If DevTools sends Runtime.enable, log it / DevTools가 Runtime.enable을 보내면 로깅
        if (method === 'Runtime.enable') {
          log('devtools', id, 'Runtime.enable received - console events should now work');
        }

        // Log if we receive Runtime.consoleAPICalled from client / 클라이언트로부터 Runtime.consoleAPICalled를 받으면 로깅
        // This shouldn't happen normally, but helps debug / 이것은 일반적으로 발생하지 않지만 디버깅에 도움이 됨
        if (method === 'Runtime.consoleAPICalled') {
          log('devtools', id, '⚠️ Received Runtime.consoleAPICalled from client (unexpected)');
        }
      } else {
        log('devtools', id, 'received (raw):', data);
      }

      // Try regular client first / 일반 클라이언트 먼저 시도
      let currentClient = this.clients.get(currentDevtool.clientId);
      if (!currentClient) {
        // Try React Native Inspector connection / React Native Inspector 연결 시도
        const inspector = this.reactNativeInspectorManager.getConnection(currentDevtool.clientId);
        if (inspector && inspector.ws.readyState === WebSocket.OPEN) {
          try {
            log('devtools', id, `sending message to RN inspector ${currentDevtool.clientId}`);
            inspector.ws.send(message);
            log('devtools', id, `message sent to RN inspector ${currentDevtool.clientId}`);
            return;
          } catch (error) {
            logError(
              'devtools',
              id,
              `failed to send message to RN inspector ${currentDevtool.clientId}`,
              error
            );
          }
          return;
        }
        log('devtools', id, `no RN inspector found for clientId ${currentDevtool.clientId}`);
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

  // Get client with WebSocket (for internal use) / WebSocket이 포함된 클라이언트 가져오기 (내부 사용)
  getClientWithWebSocket(clientId: string): Client | undefined {
    return this.clients.get(clientId);
  }

  // Get Inspector with WebSocket (for internal use) / WebSocket이 포함된 Inspector 가져오기 (내부 사용)
  getInspectorWithWebSocket(inspectorId: string): DevTools | undefined {
    return this.devtools.get(inspectorId);
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
}
