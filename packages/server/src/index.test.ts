import { describe, test, expect } from 'bun:test';
import { SocketServer } from './index';

// Test SocketServer class / SocketServer 클래스 테스트
describe('SocketServer', () => {
  test('should create instance', () => {
    const server = new SocketServer();
    expect(server).toBeDefined();
  });

  test('should return empty clients list initially', () => {
    const server = new SocketServer();
    const clients = server.getClients();
    expect(clients).toEqual([]);
  });
});

