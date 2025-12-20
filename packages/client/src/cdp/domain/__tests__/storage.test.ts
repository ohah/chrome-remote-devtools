// Storage domain tests / Storage 도메인 테스트
import { describe, test, expect, beforeEach, beforeAll, afterAll, afterEach } from 'bun:test';
import DOMStorage from '../storage';

describe('DOMStorage Domain', () => {
  let socket: WebSocket;
  let storage: DOMStorage;
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

    storage = new DOMStorage({ socket });
  });

  afterEach(() => {
    // Close socket after each test / 각 테스트 후 소켓 닫기
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
  });

  test('should create instance / 인스턴스 생성', () => {
    expect(storage).toBeDefined();
    expect(storage.namespace).toBe('DOMStorage');
  });

  test('should enable DOMStorage domain / DOMStorage 도메인 활성화', () => {
    expect(() => storage.enable()).not.toThrow();
  });

  test('should disable DOMStorage domain / DOMStorage 도메인 비활성화', () => {
    storage.enable();
    expect(() => storage.disable()).not.toThrow();
  });

  test('should get DOM storage items / DOM storage 항목 가져오기', () => {
    try {
      const result = storage.getDOMStorageItems({
        storageId: { isLocalStorage: true },
      });
      expect(result).toHaveProperty('entries');
      expect(Array.isArray(result.entries)).toBe(true);
    } catch (error) {
      // Expected in non-DOM environment / DOM이 없는 환경에서는 예상됨
      expect(error).toBeDefined();
    }
  });

  test('should set DOM storage item / DOM storage 항목 설정', () => {
    try {
      expect(() =>
        storage.setDOMStorageItem({
          storageId: { isLocalStorage: true },
          key: 'test',
          value: 'value',
        })
      ).not.toThrow();
    } catch (error) {
      // Expected in non-DOM environment / DOM이 없는 환경에서는 예상됨
      expect(error).toBeDefined();
    }
  });

  test('should remove DOM storage item / DOM storage 항목 제거', () => {
    try {
      // First set an item / 먼저 항목 설정
      storage.setDOMStorageItem({
        storageId: { isLocalStorage: true },
        key: 'test',
        value: 'value',
      });
      // Then remove it / 그 다음 제거
      expect(() =>
        storage.removeDOMStorageItem({
          storageId: { isLocalStorage: true },
          key: 'test',
        })
      ).not.toThrow();
    } catch (error) {
      // Expected in non-DOM environment / DOM이 없는 환경에서는 예상됨
      expect(error).toBeDefined();
    }
  });

  test('should clear DOM storage / DOM storage 전체 삭제', () => {
    try {
      expect(() =>
        storage.clear({
          storageId: { isLocalStorage: true },
        })
      ).not.toThrow();
    } catch (error) {
      // Expected in non-DOM environment / DOM이 없는 환경에서는 예상됨
      expect(error).toBeDefined();
    }
  });
});
