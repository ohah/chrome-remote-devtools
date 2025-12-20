// Page domain tests / Page 도메인 테스트
// happy-dom is registered via bunfig.toml preload / happy-dom은 bunfig.toml preload를 통해 등록됨
import { describe, test, expect, beforeEach, beforeAll, afterAll, afterEach } from 'bun:test';
import Page from '../page';

describe('Page Domain', () => {
  let socket: WebSocket;
  let page: Page;
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

    page = new Page({ socket });
  });

  afterEach(() => {
    // Close socket after each test / 각 테스트 후 소켓 닫기
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
  });

  test('should create instance / 인스턴스 생성', () => {
    expect(page).toBeDefined();
    expect(page.namespace).toBe('Page');
  });

  test('should enable Page domain / Page 도메인 활성화', () => {
    expect(() => page.enable()).not.toThrow();
  });

  test('should get resource tree / 리소스 트리 가져오기', () => {
    const result = page.getResourceTree();
    expect(result).toHaveProperty('frameTree');
    expect(result.frameTree).toHaveProperty('frame');
    expect(result.frameTree.frame).toHaveProperty('id');
    expect(result.frameTree.frame).toHaveProperty('url');
    expect(result.frameTree.frame).toHaveProperty('mimeType');
  });

  test('should get resource content / 리소스 내용 가져오기', () => {
    const result = page.getResourceContent({ url: 'http://example.com' });
    expect(result).toHaveProperty('content');
  });

  test('should start screencast / 스크린캐스트 시작', () => {
    expect(() => page.startScreencast()).not.toThrow();
  });

  test('should stop screencast / 스크린캐스트 중지', () => {
    page.startScreencast();
    expect(() => page.stopScreencast()).not.toThrow();
  });
});
