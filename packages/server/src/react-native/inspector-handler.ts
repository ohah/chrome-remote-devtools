import { IncomingMessage, ServerResponse } from 'http';
import { WebSocket } from 'ws';
import { ReactNativeInspectorConnectionManager } from './inspector-connection';
import { SocketServer } from '../socket-server';
import { log, logError } from '../socket-server';

/**
 * Handle React Native Inspector HTTP requests / React Native Inspector HTTP 요청 처리
 * @param req - HTTP request / HTTP 요청
 * @param res - HTTP response / HTTP 응답
 * @param inspectorManager - Inspector connection manager / Inspector 연결 관리자
 * @param socketServer - Socket server / Socket 서버
 * @returns true if handled / 처리되었으면 true
 */
export function handleReactNativeInspectorHttpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  inspectorManager: ReactNativeInspectorConnectionManager,
  socketServer: SocketServer
): boolean {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  // Handle /inspector/device endpoint / /inspector/device 엔드포인트 처리
  if (url.pathname === '/inspector/device') {
    const deviceName = url.searchParams.get('name') || undefined;
    const appName = url.searchParams.get('app') || undefined;
    const deviceId = url.searchParams.get('device') || undefined;
    const profiling = url.searchParams.get('profiling') === 'true';

    // Check if this is a WebSocket upgrade request / WebSocket 업그레이드 요청인지 확인
    const upgrade = req.headers.upgrade;
    if (upgrade && upgrade.toLowerCase() === 'websocket') {
      // WebSocket upgrade will be handled in socket-server.ts / WebSocket 업그레이드는 socket-server.ts에서 처리됨
      log('rn-inspector', 'pending', 'WebSocket upgrade request', {
        deviceName,
        appName,
        deviceId,
        profiling,
      });
      return false; // Let socket-server handle it / socket-server가 처리하도록 함
    }

    // For HTTP GET requests, return device information / HTTP GET 요청의 경우 디바이스 정보 반환
    // This matches React Native's inspector-proxy behavior / 이것은 React Native의 inspector-proxy 동작과 일치함
    log('rn-inspector', 'http', 'GET /inspector/device', {
      deviceName,
      appName,
      deviceId,
      profiling,
    });

    const response = {
      id: deviceId || 'unknown',
      name: deviceName || 'Unknown Device',
      app: appName || 'Unknown App',
      device: deviceId || 'unknown',
      profiling,
    };

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify(response));
    return true;
  }

  // Handle /open-debugger endpoint / /open-debugger 엔드포인트 처리
  if (url.pathname === '/open-debugger' && req.method === 'POST') {
    const deviceId = url.searchParams.get('device') || undefined;

    // Find inspector connection for this device / 이 디바이스에 대한 Inspector 연결 찾기
    const connections = inspectorManager.getAllConnections();
    const connection = connections.find((conn) => conn.deviceId === deviceId);

    if (connection) {
      log('rn-inspector', connection.id, 'open-debugger requested');
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify({ success: true, inspectorId: connection.id }));
    } else {
      res.writeHead(404, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify({ error: 'Inspector connection not found' }));
    }
    return true;
  }

  return false;
}

/**
 * Handle React Native Inspector WebSocket connection / React Native Inspector WebSocket 연결 처리
 * @param ws - WebSocket connection / WebSocket 연결
 * @param request - HTTP request / HTTP 요청
 * @param inspectorManager - Inspector connection manager / Inspector 연결 관리자
 * @param socketServer - Socket server / Socket 서버
 */
export function handleReactNativeInspectorWebSocket(
  ws: WebSocket,
  request: IncomingMessage,
  inspectorManager: ReactNativeInspectorConnectionManager,
  socketServer: SocketServer
): void {
  const url = new URL(request.url || '/', `http://${request.headers.host}`);
  const deviceName = url.searchParams.get('name') || undefined;
  const appName = url.searchParams.get('app') || undefined;
  const deviceId = url.searchParams.get('device') || undefined;
  const profiling = url.searchParams.get('profiling') === 'true';

  // Create inspector connection / Inspector 연결 생성
  const inspectorId = inspectorManager.createConnection(ws, {
    deviceName,
    appName,
    deviceId,
    profiling,
  });

  // Auto-associate with self as clientId (so DevTools can connect) / 자동으로 자신을 clientId로 연결 (DevTools가 연결할 수 있도록)
  inspectorManager.associateWithClient(inspectorId, inspectorId);

  // Forward messages from React Native Inspector to associated DevTools / React Native Inspector에서 연결된 DevTools로 메시지 전달
  ws.on('message', (message) => {
    const connection = inspectorManager.getConnection(inspectorId);
    if (!connection || !connection.clientId) {
      // No client associated yet / 아직 연결된 클라이언트가 없음
      return;
    }

    // Convert message to string for logging / 로깅을 위해 메시지를 문자열로 변환
    const data = typeof message === 'string' ? message : message.toString('utf-8');

    // Log received message / 수신된 메시지 로깅
    try {
      const parsed = JSON.parse(data);
      if (parsed.method) {
        log('rn-inspector', inspectorId, 'received:', JSON.stringify(parsed, null, 2), parsed.method);
      } else {
        log('rn-inspector', inspectorId, 'received:', data);
      }
    } catch {
      log('rn-inspector', inspectorId, 'received (raw):', data);
    }

    // Forward to DevTools (if connected) / DevTools로 전달 (연결된 경우)
    let forwarded = false;
    socketServer.getAllInspectors().forEach((devtool) => {
      if (devtool.clientId === connection.clientId) {
        const devtoolWs = socketServer.getInspectorWithWebSocket(devtool.id);
        if (devtoolWs && devtoolWs.ws.readyState === WebSocket.OPEN) {
          try {
            // Log the message being sent / 전송되는 메시지 로깅
            try {
              const parsedMsg = JSON.parse(data);
              if (parsedMsg.method === 'Runtime.consoleAPICalled') {
                log('rn-inspector', inspectorId, `sending Runtime.consoleAPICalled to devtools ${devtool.id}:`, parsedMsg);
              }
            } catch {
              // Ignore parse errors for logging / 로깅을 위한 파싱 에러 무시
            }

            // Send message to DevTools / DevTools로 메시지 전송
            // Convert to string to match regular client behavior / 일반 클라이언트 동작과 일치하도록 문자열로 변환
            const messageToSend = typeof message === 'string' ? message : message.toString('utf-8');

            // Log actual JSON string being sent for comparison / 비교를 위해 실제 전송되는 JSON 문자열 로깅
            try {
              const parsedMsg = JSON.parse(data);
              if (parsedMsg.method === 'Runtime.consoleAPICalled') {
                log('rn-inspector', inspectorId, `✅ Sent Runtime.consoleAPICalled to devtools ${devtool.id}, type: ${parsedMsg.params?.type}`);
                log('rn-inspector', inspectorId, `📤 Actual JSON being sent to devtools: ${messageToSend}`);
              } else {
                log('rn-inspector', inspectorId, `forwarded message to devtools ${devtool.id}`);
              }
            } catch {
              log('rn-inspector', inspectorId, `forwarded message to devtools ${devtool.id}`);
            }

            devtoolWs.ws.send(messageToSend);
            forwarded = true;
          } catch (error) {
            logError(
              'rn-inspector',
              inspectorId,
              `failed to send message to devtools ${devtool.id}`,
              error
            );
          }
        }
      }
    });

    if (!forwarded) {
      log('rn-inspector', inspectorId, `no devtools connected to forward message (clientId: ${connection.clientId})`);
    }

    // Also forward to regular client if exists (for backward compatibility) / 일반 클라이언트가 있으면 전달 (하위 호환성)
    const client = socketServer.getClientWithWebSocket(connection.clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(message);
      } catch (error) {
        logError(
          'rn-inspector',
          inspectorId,
          `failed to send message to client ${connection.clientId}`,
          error
        );
      }
    }
  });

  // Forward messages from client to React Native Inspector / 클라이언트에서 React Native Inspector로 메시지 전달
  // This is handled by socket-server when client sends messages / 이것은 클라이언트가 메시지를 보낼 때 socket-server에서 처리됨
}

