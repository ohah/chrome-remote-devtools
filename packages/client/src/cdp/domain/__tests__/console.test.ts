// Console domain tests / Console 도메인 테스트
import { describe, test, expect, beforeEach, beforeAll, afterAll, afterEach } from 'bun:test';
import Console from '../console';
import {
  createWebSocketTestServer,
  createWebSocketConnection,
  type WebSocketTestServer,
} from '../../../__tests__/helpers/websocket-server';

describe('Console Domain', () => {
  let socket: WebSocket;
  let consoleDomain: Console;
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
    consoleDomain = new Console({ socket });
  });

  afterEach(() => {
    // Close socket after each test / 각 테스트 후 소켓 닫기
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
  });

  test('should create instance / 인스턴스 생성', () => {
    expect(consoleDomain).toBeDefined();
    expect(consoleDomain.namespace).toBe('Console');
  });

  test('should enable Console domain / Console 도메인 활성화', () => {
    expect(() => consoleDomain.enable()).not.toThrow();
  });

  test('should clear messages / 메시지 지우기', () => {
    // clearMessages is a placeholder / clearMessages는 플레이스홀더
    expect(() => consoleDomain.clearMessages()).not.toThrow();
  });
});
