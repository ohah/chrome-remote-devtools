import { IncomingMessage, ServerResponse } from 'http';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { SocketServer } from './socket-server';
import { handleReactNativeInspectorHttpRequest } from './react-native/inspector-handler';

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

    // Handle React Native Inspector HTTP requests / React Native Inspector HTTP 요청 처리
    if (
      handleReactNativeInspectorHttpRequest(
        req,
        res,
        socketServer.reactNativeInspectorManager,
        socketServer
      )
    ) {
      return;
    }

    if (url.pathname === '/json') {
      // Get all clients / 모든 클라이언트 가져오기
      res.writeHead(200, headers);
      res.end(JSON.stringify({ targets: socketServer.getAllClients() }));
      return;
    }

    if (url.pathname === '/json/clients') {
      // Get all clients with details, including React Native Inspector connections / 상세 정보와 함께 모든 클라이언트 가져오기 (React Native Inspector 연결 포함)
      const regularClients = socketServer.getAllClients().map(({ title: _title, ...client }) => ({
        ...client,
        type: 'web' as const,
      }));
      const rnInspectors = socketServer.reactNativeInspectorManager.getAllConnections();

      // Convert React Native Inspector connections to client format / React Native Inspector 연결을 클라이언트 형식으로 변환
      const rnInspectorClients = rnInspectors.map((inspector) => ({
        id: inspector.id,
        type: 'react-native' as const,
        deviceName: inspector.deviceName,
        appName: inspector.appName,
        deviceId: inspector.deviceId,
        profiling: inspector.profiling,
      }));

      // Combine regular clients and React Native Inspector connections / 일반 클라이언트와 React Native Inspector 연결 결합
      const allClients = [...regularClients, ...rnInspectorClients];

      res.writeHead(200, headers);
      res.end(JSON.stringify({ clients: allClients }));
      return;
    }

    if (url.pathname === '/json/inspectors') {
      // Get all inspectors / 모든 Inspector 가져오기
      res.writeHead(200, headers);
      res.end(JSON.stringify({ inspectors: socketServer.getAllInspectors() }));
      return;
    }

    if (url.pathname.startsWith('/json/client/')) {
      // Get specific client (including React Native Inspector) / 특정 클라이언트 가져오기 (React Native Inspector 포함)
      const clientId = url.pathname.replace('/json/client/', '');

      // Try regular client first / 일반 클라이언트 먼저 시도
      const client = socketServer.getClient(clientId);
      if (client) {
        res.writeHead(200, headers);
        res.end(JSON.stringify({ client }));
        return;
      }

      // Try React Native Inspector connection / React Native Inspector 연결 시도
      const inspector = socketServer.reactNativeInspectorManager.getConnection(clientId);
      if (inspector) {
        const inspectorClient = {
          id: inspector.id,
          type: 'react-native' as const,
          deviceName: inspector.deviceName,
          appName: inspector.appName,
          deviceId: inspector.deviceId,
          profiling: inspector.profiling,
        };
        res.writeHead(200, headers);
        res.end(JSON.stringify({ client: inspectorClient }));
        return;
      }

      // Not found / 찾을 수 없음
      res.writeHead(404, headers);
      res.end(JSON.stringify({ error: 'Client not found' }));
      return;
    }

    if (url.pathname === '/client.js') {
      // Serve built client script for testing / 테스트를 위한 빌드된 클라이언트 스크립트 서빙
      try {
        // Try IIFE format first (for script tags) / 먼저 IIFE 형식 시도 (script 태그용)
        const clientScriptPath = join(__dirname, '../../client/dist/index.iife.js');
        const clientScript = readFileSync(clientScriptPath, 'utf-8');
        res.writeHead(200, {
          'Content-Type': 'application/javascript',
          ...headers,
        });
        res.end(clientScript);
      } catch {
        // Fallback: try index.js if iife doesn't exist / Fallback: iife가 없으면 index.js 시도
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
      }
      return;
    }

    res.writeHead(404, headers);
    res.end(JSON.stringify({ error: 'Not Found' }));
  };
}
