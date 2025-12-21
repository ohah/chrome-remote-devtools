// Network domain tests / Network 도메인 테스트
// happy-dom is registered via bunfig.toml preload / happy-dom은 bunfig.toml preload를 통해 등록됨
import { describe, test, expect, beforeEach, beforeAll, afterAll, afterEach } from 'bun:test';
import Network from '../network';
import {
  createWebSocketTestServer,
  createWebSocketConnection,
  type WebSocketTestServer,
} from '../../../__tests__/helpers/websocket-server';

describe('Network Domain', () => {
  let socket: WebSocket;
  let network: Network;
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
    network = new Network({ socket });
  });

  afterEach(() => {
    // Close socket after each test / 각 테스트 후 소켓 닫기
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
  });

  test('should create instance / 인스턴스 생성', () => {
    expect(network).toBeDefined();
    expect(network.namespace).toBe('Network');
  });

  test('should enable Network domain / Network 도메인 활성화', () => {
    expect(() => network.enable()).not.toThrow();
  });

  test('should get cookies / 쿠키 가져오기', () => {
    const result = network.getCookies();
    expect(result).toHaveProperty('cookies');
    expect(Array.isArray(result.cookies)).toBe(true);
  });

  test('should set cookie / 쿠키 설정', () => {
    const result = network.setCookie({
      name: 'test',
      value: 'value',
      domain: 'example.com',
      path: '/',
    });
    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');
  });

  test('should delete cookies / 쿠키 삭제', () => {
    // First set a cookie / 먼저 쿠키 설정
    network.setCookie({ name: 'test', value: 'value' });
    // Then delete it / 그 다음 삭제
    expect(() => network.deleteCookies({ name: 'test' })).not.toThrow();
  });

  test('should delete all cookies / 모든 쿠키 삭제', () => {
    expect(() => network.deleteCookies({})).not.toThrow();
  });

  test('should get response body / 응답 본문 가져오기', () => {
    const result = network.getResponseBody({ requestId: 'non-existent' });
    expect(result).toHaveProperty('body');
    expect(result).toHaveProperty('base64Encoded');
    expect(result.body).toBe('');
    expect(result.base64Encoded).toBe(false);
  });

  test('should format response header / 응답 헤더 포맷팅', () => {
    const header = 'Content-Type: application/json\r\nCache-Control: no-cache';
    const result = Network.formatResponseHeader(header);
    expect(result).toHaveProperty('Content-Type');
    expect(result).toHaveProperty('Cache-Control');
  });

  test('should get default headers / 기본 헤더 가져오기', () => {
    const result = Network.getDefaultHeaders();
    expect(result).toHaveProperty('User-Agent');
  });
});
