// SocketServer class tests / SocketServer 클래스 테스트
import { describe, test, expect, beforeEach } from 'bun:test';
import { SocketServer } from '../index';
import { createServer } from 'http';

describe('SocketServer', () => {
  let socketServer: SocketServer;
  let httpServer: ReturnType<typeof createServer>;

  beforeEach(() => {
    socketServer = new SocketServer();
    httpServer = createServer();
    socketServer.initSocketServer(httpServer);
  });

  test('should create instance / 인스턴스 생성', () => {
    expect(socketServer).toBeDefined();
  });

  test('should return empty clients list initially / 초기에는 빈 클라이언트 목록 반환', () => {
    const clients = socketServer.getClients();
    expect(clients).toEqual([]);
  });

  test('should return empty inspectors list initially / 초기에는 빈 Inspector 목록 반환', () => {
    const inspectors = socketServer.getAllInspectors();
    expect(inspectors).toEqual([]);
  });

  test('should get client by ID / ID로 클라이언트 가져오기', () => {
    const clientId = 'test-client-1';
    const client = socketServer.getClient(clientId);
    expect(client).toBeUndefined();
  });

  test('should get inspector by ID / ID로 Inspector 가져오기', () => {
    const inspectorId = 'test-inspector-1';
    const inspector = socketServer.getInspector(inspectorId);
    expect(inspector).toBeUndefined();
  });

  test('should switch client for inspector / Inspector의 클라이언트 전환', () => {
    const inspectorId = 'test-inspector-1';
    const clientId = 'test-client-1';

    // Should return false when inspector doesn't exist / Inspector가 없을 때 false 반환
    const result = socketServer.switchClient(inspectorId, clientId);
    expect(result).toBe(false);
  });

  test('should return all clients / 모든 클라이언트 반환', () => {
    const clients = socketServer.getAllClients();
    expect(Array.isArray(clients)).toBe(true);
  });

  test('should return all inspectors / 모든 Inspector 반환', () => {
    const inspectors = socketServer.getAllInspectors();
    expect(Array.isArray(inspectors)).toBe(true);
  });
});
