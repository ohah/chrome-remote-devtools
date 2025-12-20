// ChromeDomain class tests / ChromeDomain 클래스 테스트
// happy-dom is registered via bunfig.toml preload / happy-dom은 bunfig.toml preload를 통해 등록됨
import { describe, test, expect, beforeEach, beforeAll, afterAll, afterEach } from 'bun:test';
import ChromeDomain from '../index';

describe('ChromeDomain', () => {
  let socket: WebSocket;
  let domain: ChromeDomain;
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

    // happy-dom provides window, document, location, navigator, XMLHttpRequest, MutationObserver
    // Runtime 클래스가 console을 수정하지만 nativeConsoleFunc를 호출하므로 실제 console 사용 가능
    // Network 클래스가 fetch를 수정하지만 originalFetch를 호출하므로 실제 fetch 사용 가능
    // Runtime class modifies console but calls nativeConsoleFunc, so actual console works
    // Network class modifies fetch but calls originalFetch, so actual fetch works

    domain = new ChromeDomain({ socket });
  });

  afterEach(() => {
    // Close socket after each test / 각 테스트 후 소켓 닫기
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
  });

  test('should create instance / 인스턴스 생성', () => {
    expect(domain).toBeDefined();
  });

  test('should handle empty message / 빈 메시지 처리', () => {
    const result = domain.execute({});
    expect(result).toEqual({});
  });

  test('should handle message without method / 메서드 없는 메시지 처리', () => {
    const result = domain.execute({ id: 1 });
    expect(result).toEqual({ id: 1 });
  });

  test('should handle non-existent method / 존재하지 않는 메서드 처리', () => {
    const result = domain.execute({
      id: 1,
      method: 'NonExistent.method',
      params: {},
    });
    expect(result).toEqual({ id: 1 });
  });

  test('should handle Runtime.evaluate method / Runtime.evaluate 메서드 처리', () => {
    const result = domain.execute({
      id: 1,
      method: 'Runtime.evaluate',
      params: { expression: '1 + 1' },
    });
    expect(result).toHaveProperty('id', 1);
    expect(result).toHaveProperty('result');
  });

  test('should handle Page.enable method / Page.enable 메서드 처리', () => {
    const result = domain.execute({
      id: 1,
      method: 'Page.enable',
      params: {},
    });
    expect(result).toHaveProperty('id', 1);
  });

  test('should handle DOM.getDocument method / DOM.getDocument 메서드 처리', () => {
    const result = domain.execute({
      id: 1,
      method: 'DOM.getDocument',
      params: {},
    });
    expect(result).toHaveProperty('id', 1);
    expect(result).toHaveProperty('result');
  });

  test('should handle Network.enable method / Network.enable 메서드 처리', () => {
    const result = domain.execute({
      id: 1,
      method: 'Network.enable',
      params: {},
    });
    expect(result).toHaveProperty('id', 1);
  });

  test('should handle Console.enable method / Console.enable 메서드 처리', () => {
    const result = domain.execute({
      id: 1,
      method: 'Console.enable',
      params: {},
    });
    expect(result).toHaveProperty('id', 1);
  });

  test('should handle DOMStorage.enable method / DOMStorage.enable 메서드 처리', () => {
    const result = domain.execute({
      id: 1,
      method: 'DOMStorage.enable',
      params: {},
    });
    expect(result).toHaveProperty('id', 1);
  });

  test('should handle error in method execution / 메서드 실행 중 에러 처리', () => {
    // This test verifies error handling
    // 에러 처리를 검증하는 테스트
    const result = domain.execute({
      id: 1,
      method: 'Runtime.evaluate',
      params: { expression: 'throw new Error("test")' },
    });
    expect(result).toHaveProperty('id', 1);
    // Error should be caught and returned / 에러가 잡혀서 반환되어야 함
    expect(result).toHaveProperty('result');
  });
});
