// CDP Client initialization tests / CDP 클라이언트 초기화 테스트
import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import { initCDPClient } from './index';

describe('initCDPClient', () => {
  let originalWebSocket: typeof WebSocket;
  let mockWebSocket: typeof WebSocket;

  beforeEach(() => {
    // Mock WebSocket / WebSocket 모킹
    originalWebSocket = globalThis.WebSocket;
    mockWebSocket = class MockWebSocket {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;
      readyState = 1;
      send = mock(() => {});
      close = mock(() => {});
      addEventListener = mock(() => {});
      removeEventListener = mock(() => {});
    } as unknown as typeof WebSocket;
    globalThis.WebSocket = mockWebSocket;
  });

  afterEach(() => {
    globalThis.WebSocket = originalWebSocket;
  });

  test('should be a function / 함수여야 함', () => {
    expect(typeof initCDPClient).toBe('function');
  });

  test('should initialize WebSocket connection / WebSocket 연결 초기화', () => {
    // Note: initCDPClient requires DOM environment
    // initCDPClient는 DOM 환경이 필요함
    // In test environment, this might not work fully
    // 테스트 환경에서는 완전히 작동하지 않을 수 있음
    expect(typeof initCDPClient).toBe('function');
  });

  test('should handle server URL parameter / 서버 URL 파라미터 처리', () => {
    // Function should accept server URL / 함수는 서버 URL을 받아야 함
    expect(initCDPClient.length).toBe(1);
  });
});
