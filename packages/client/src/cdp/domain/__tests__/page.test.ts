// Page domain tests / Page 도메인 테스트
// happy-dom is registered via bunfig.toml preload / happy-dom은 bunfig.toml preload를 통해 등록됨
import { describe, test, expect, beforeEach, beforeAll, afterAll, afterEach } from 'bun:test';
import Page from '../page';
import {
  createWebSocketTestServer,
  createWebSocketConnection,
  type WebSocketTestServer,
} from '../../../__tests__/helpers/websocket-server';

describe('Page Domain', () => {
  let socket: WebSocket;
  let page: Page;
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
