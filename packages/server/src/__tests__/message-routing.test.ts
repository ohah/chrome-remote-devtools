// Message routing tests / 메시지 라우팅 테스트
import { describe, test, expect, beforeEach } from 'bun:test';
import { SocketServer } from '../index';
import { createServer } from 'http';

describe('Message Routing', () => {
  let socketServer: SocketServer;
  let httpServer: ReturnType<typeof createServer>;

  beforeEach(() => {
    socketServer = new SocketServer();
    httpServer = createServer();
    socketServer.initSocketServer(httpServer);
  });

  test('should handle client connection / 클라이언트 연결 처리', () => {
    // This test verifies that the server can handle client connections
    // 실제 WebSocket 연결은 통합 테스트에서 검증
    // This test verifies basic structure / 기본 구조 검증
    expect(socketServer).toBeDefined();
    const clients = socketServer.getAllClients();
    expect(Array.isArray(clients)).toBe(true);
  });

  test('should handle inspector connection / Inspector 연결 처리', () => {
    // This test verifies that the server can handle inspector connections
    // 실제 WebSocket 연결은 통합 테스트에서 검증
    // This test verifies basic structure / 기본 구조 검증
    expect(socketServer).toBeDefined();
    const inspectors = socketServer.getAllInspectors();
    expect(Array.isArray(inspectors)).toBe(true);
  });

  test('should switch inspector to different client / Inspector를 다른 클라이언트로 전환', () => {
    const inspectorId = 'inspector-1';
    const clientId1 = 'client-1';
    const clientId2 = 'client-2';

    // Should return false when inspector doesn't exist / Inspector가 없을 때 false 반환
    const result1 = socketServer.switchClient(inspectorId, clientId1);
    expect(result1).toBe(false);

    // Should return false when client doesn't exist / 클라이언트가 없을 때 false 반환
    const result2 = socketServer.switchClient(inspectorId, clientId2);
    expect(result2).toBe(false);
  });

  test('should get client information / 클라이언트 정보 가져오기', () => {
    const clientId = 'test-client';
    const client = socketServer.getClient(clientId);
    expect(client).toBeUndefined();
  });

  test('should get inspector information / Inspector 정보 가져오기', () => {
    const inspectorId = 'test-inspector';
    const inspector = socketServer.getInspector(inspectorId);
    expect(inspector).toBeUndefined();
  });
});
