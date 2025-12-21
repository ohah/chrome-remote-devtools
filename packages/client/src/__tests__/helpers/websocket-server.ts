// Test helper for WebSocket server setup / WebSocket 서버 설정을 위한 테스트 헬퍼
export interface WebSocketTestServer {
  server: ReturnType<typeof Bun.serve>;
  port: number;
  url: string;
}

export const WEBSOCKET_CONNECTION_TIMEOUT = 1000;

/**
 * Create a WebSocket test server / WebSocket 테스트 서버 생성
 * @returns WebSocket test server instance / WebSocket 테스트 서버 인스턴스
 */
export function createWebSocketTestServer(): WebSocketTestServer {
  const server = Bun.serve({
    port: 0, // Let OS assign port / OS가 포트 할당하도록
    fetch(req, server) {
      // Upgrade to WebSocket / WebSocket으로 업그레이드
      if (server.upgrade(req)) {
        return; // WebSocket upgrade successful / WebSocket 업그레이드 성공
      }
      return new Response('Not a WebSocket request', { status: 426 });
    },
    websocket: {
      message(_ws, message) {
        // Echo messages back / 메시지를 다시 보냄
        _ws.send(message);
      },
      open(_ws) {
        // Connection opened / 연결 열림
      },
      close(_ws) {
        // Connection closed / 연결 닫힘
      },
    },
  });

  if (!server.port) {
    throw new Error('Failed to start WebSocket server');
  }

  return {
    server,
    port: server.port,
    url: `ws://localhost:${server.port}`,
  };
}

/**
 * Create and wait for WebSocket connection / WebSocket 연결 생성 및 대기
 * @param url WebSocket server URL / WebSocket 서버 URL
 * @param timeout Connection timeout in milliseconds / 연결 타임아웃 (밀리초)
 * @returns Connected WebSocket instance / 연결된 WebSocket 인스턴스
 */
export async function createWebSocketConnection(
  url: string,
  timeout = WEBSOCKET_CONNECTION_TIMEOUT
): Promise<WebSocket> {
  const socket = new WebSocket(url);

  await new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('WebSocket connection timeout'));
    }, timeout);

    socket.addEventListener('open', () => {
      clearTimeout(timeoutId);
      resolve();
    });

    socket.addEventListener('error', (error) => {
      clearTimeout(timeoutId);
      reject(error);
    });
  });

  return socket;
}
