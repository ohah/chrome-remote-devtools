import { IncomingMessage, ServerResponse } from 'http';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { SocketServer } from './socket-server';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Create HTTP request handler / HTTP 요청 핸들러 생성
 * @param socketServer - SocketServer instance / SocketServer 인스턴스
 * @returns HTTP request handler function / HTTP 요청 핸들러 함수
 */
export function createHttpRouter(socketServer: SocketServer) {
  return (req: IncomingMessage, res: ServerResponse) => {
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
      res.end(JSON.stringify({ targets: socketServer.getAllClients() }));
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
  };
}
