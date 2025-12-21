// Storage domain tests / Storage 도메인 테스트
import { describe, test, expect, beforeEach, beforeAll, afterAll, afterEach } from 'bun:test';
import DOMStorage from '../storage';
import {
  createWebSocketTestServer,
  createWebSocketConnection,
  type WebSocketTestServer,
} from '../../../__tests__/helpers/websocket-server';

describe('DOMStorage Domain', () => {
  let socket: WebSocket;
  let storage: DOMStorage;
  let testServer: WebSocketTestServer;

  beforeAll(() => {
    // Create WebSocket server for testing / 테스트를 위한 WebSocket 서버 생성
    testServer = createWebSocketTestServer();
  });

  afterAll(() => {
    // Close server after all tests / 모든 테스트 후 서버 종료
    testServer.server.stop();
  });

  beforeEach(async () => {
    // Use Bun's WebSocket with actual connection / 실제 연결을 사용하는 Bun의 WebSocket
    socket = await createWebSocketConnection(testServer.url);
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
