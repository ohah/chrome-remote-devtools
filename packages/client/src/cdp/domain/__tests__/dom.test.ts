// DOM domain tests / DOM 도메인 테스트
// happy-dom is registered via bunfig.toml preload / happy-dom은 bunfig.toml preload를 통해 등록됨
import { describe, test, expect, beforeEach, beforeAll, afterAll, afterEach } from 'bun:test';
import Dom from '../dom';

describe('DOM Domain', () => {
  let socket: WebSocket;
  let dom: Dom;
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
    // happy-dom이 window, document, MutationObserver를 자동으로 제공
    // happy-dom automatically provides window, document, MutationObserver

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

    dom = new Dom({ socket });
  });

  afterEach(() => {
    // Close socket after each test / 각 테스트 후 소켓 닫기
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
  });

  test('should create instance / 인스턴스 생성', () => {
    expect(dom).toBeDefined();
    expect(dom.namespace).toBe('DOM');
  });

  test('should enable DOM domain / DOM 도메인 활성화', () => {
    // Note: enable() uses MutationObserver which may not be available in test environment
    // enable()는 MutationObserver를 사용하므로 테스트 환경에서 사용 불가능할 수 있음
    expect(() => dom.enable()).not.toThrow();
  });

  test('should get document / 문서 가져오기', () => {
    // happy-dom이 document를 제공하므로 정상 작동해야 함
    // happy-dom provides document, so it should work normally
    const result = dom.getDocument();
    expect(result).toHaveProperty('root');
  });

  test('should perform search / 검색 수행', () => {
    const result = dom.performSearch({ query: 'body' });
    expect(result).toHaveProperty('searchId');
    expect(result).toHaveProperty('resultCount');
    expect(typeof result.searchId).toBe('number');
    expect(typeof result.resultCount).toBe('number');
  });

  test('should get search results / 검색 결과 가져오기', () => {
    const searchResult = dom.performSearch({ query: 'body' });
    const result = dom.getSearchResults({
      searchId: searchResult.searchId,
      fromIndex: 0,
      toIndex: 10,
    });
    expect(result).toHaveProperty('nodeIds');
    expect(Array.isArray(result.nodeIds)).toBe(true);
  });

  test('should discard search results / 검색 결과 버리기', () => {
    const searchResult = dom.performSearch({ query: 'body' });
    expect(() => dom.discardSearchResults({ searchId: searchResult.searchId })).not.toThrow();
  });

  test('should set $, $$, $x functions / $, $$, $x 함수 설정', () => {
    // This is a static method / 정적 메서드
    Dom.set$Function();

    // Verify functions are set / 함수들이 설정되었는지 확인
    // happy-dom의 window 사용 / Use happy-dom's window
    expect(typeof (globalThis.window as any).$).toBe('function');
    expect(typeof (globalThis.window as any).$$).toBe('function');
    expect(typeof (globalThis.window as any).$x).toBe('function');
  });
});
