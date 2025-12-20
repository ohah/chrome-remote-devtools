// Network domain tests / Network 도메인 테스트
// happy-dom is registered via bunfig.toml preload / happy-dom은 bunfig.toml preload를 통해 등록됨
import { describe, test, expect, beforeEach, beforeAll, afterAll, afterEach } from 'bun:test';
import Network from '../network';

describe('Network Domain', () => {
  let socket: WebSocket;
  let network: Network;
  let server: ReturnType<typeof Bun.serve> | null = null;
  let serverPort: number = 0;

  beforeAll(async () => {
    // Create WebSocket server for testing / 테스트를 위한 WebSocket 서버 생성
    server = Bun.serve({
      port: 0, // Let OS assign port / OS가 포트 할당하도록
      fetch(req, server) {
        // Upgrade to WebSocket / WebSocket으로 업그레이드
        if (server.upgrade(req, { data: null })) {
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
    if (server?.port) {
      serverPort = server.port;
    } else {
      throw new Error('Failed to start WebSocket server');
    }
  });

  afterAll(() => {
    // Close server after all tests / 모든 테스트 후 서버 종료
    if (server) {
      server.stop();
    }
  });

  beforeEach(async () => {
    // Use Bun's WebSocket with actual connection / 실제 연결을 사용하는 Bun의 WebSocket
    if (!serverPort) {
      throw new Error('Server port not available');
    }
    socket = new WebSocket(`ws://localhost:${serverPort}`);

    // Wait for open event / open 이벤트 대기
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 1000);

      socket.addEventListener('open', () => {
        clearTimeout(timeout);
        resolve();
      });

      socket.addEventListener('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    network = new Network({ socket });
  });

  afterEach(() => {
    // Close socket after each test / 각 테스트 후 소켓 닫기
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
  });

  test('should create instance / 인스턴스 생성', () => {
    expect(network).toBeDefined();
    expect(network.namespace).toBe('Network');
  });

  test('should enable Network domain / Network 도메인 활성화', () => {
    expect(() => network.enable()).not.toThrow();
  });

  test('should get cookies / 쿠키 가져오기', () => {
    const result = network.getCookies();
    expect(result).toHaveProperty('cookies');
    expect(Array.isArray(result.cookies)).toBe(true);
  });

  test('should set cookie / 쿠키 설정', () => {
    const result = network.setCookie({
      name: 'test',
      value: 'value',
      domain: 'example.com',
      path: '/',
    });
    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');
  });

  test('should delete cookies / 쿠키 삭제', () => {
    // First set a cookie / 먼저 쿠키 설정
    network.setCookie({ name: 'test', value: 'value' });
    // Then delete it / 그 다음 삭제
    expect(() => network.deleteCookies({ name: 'test' })).not.toThrow();
  });

  test('should delete all cookies / 모든 쿠키 삭제', () => {
    expect(() => network.deleteCookies({})).not.toThrow();
  });

  test('should get response body / 응답 본문 가져오기', () => {
    const result = network.getResponseBody({ requestId: 'non-existent' });
    expect(result).toHaveProperty('body');
    expect(result).toHaveProperty('base64Encoded');
    expect(result.body).toBe('');
    expect(result.base64Encoded).toBe(false);
  });

  test('should format response header / 응답 헤더 포맷팅', () => {
    const header = 'Content-Type: application/json\r\nCache-Control: no-cache';
    const result = Network.formatResponseHeader(header);
    expect(result).toHaveProperty('Content-Type');
    expect(result).toHaveProperty('Cache-Control');
  });

  test('should get default headers / 기본 헤더 가져오기', () => {
    const result = Network.getDefaultHeaders();
    expect(result).toHaveProperty('User-Agent');
  });
});
