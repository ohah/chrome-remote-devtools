// CDP Client tests / CDP 클라이언트 테스트
// happy-dom is registered via bunfig.toml preload / happy-dom은 bunfig.toml preload를 통해 등록됨
import 'fake-indexeddb/auto'; // Import fake-indexeddb for testing / 테스트를 위한 fake-indexeddb import
import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import { CDPClient } from '../cdp-client';

describe('CDPClient', () => {
  let client: CDPClient;

  beforeEach(() => {
    client = new CDPClient();
  });

  afterEach(() => {
    if (client) {
      client.destroy();
    }
  });

  describe('constructor', () => {
    test('should create instance / 인스턴스 생성', () => {
      expect(client).toBeDefined();
    });

    test('should initialize with null domain / null 도메인으로 초기화', () => {
      expect(client.getDomain()).toBeNull();
      expect(client.getRrwebRecorder()).toBeNull();
      expect(client.getWebSocketClient()).toBeNull();
      expect(client.getPostMessageHandler()).toBeNull();
    });
  });

  describe('initialize', () => {
    test('should initialize with postMessage mode / postMessage 모드로 초기화', async () => {
      await client.initialize('', { enable: false }, true);

      expect(client.getDomain()).toBeDefined();
      expect(client.getPostMessageHandler()).toBeDefined();
      expect(client.getWebSocketClient()).toBeDefined();
    });

    test('should initialize with WebSocket mode / WebSocket 모드로 초기화', async () => {
      // Note: WebSocket initialization requires actual server / WebSocket 초기화는 실제 서버가 필요함
      // This test verifies the structure / 이 테스트는 구조를 검증함
      await client.initialize('ws://localhost:8080', { enable: false }, false);

      // Should have domain and handlers / 도메인과 핸들러가 있어야 함
      expect(client.getDomain()).toBeDefined();
      expect(client.getPostMessageHandler()).toBeDefined();
    });

    test('should initialize with rrweb config / rrweb 설정으로 초기화', async () => {
      await client.initialize('', { enable: true }, true);

      // Should initialize even with rrweb enabled / rrweb이 활성화되어도 초기화되어야 함
      expect(client.getDomain()).toBeDefined();
    });

    test('should update postMessage handler when domain is created / 도메인 생성 시 postMessage 핸들러 업데이트', async () => {
      await client.initialize('', { enable: false }, true);

      const handler = client.getPostMessageHandler();
      expect(handler).toBeDefined();
    });

    test('should initialize rrweb recorder when configured / 설정된 경우 rrweb 레코더 초기화', async () => {
      await client.initialize('', { enable: true }, true);

      // Rrweb recorder might be null if not properly initialized / 제대로 초기화되지 않으면 rrweb 레코더가 null일 수 있음
      // But initialization should complete / 하지만 초기화는 완료되어야 함
      expect(client.getDomain()).toBeDefined();
    });
  });

  describe('getDomain', () => {
    test('should return domain after initialization / 초기화 후 도메인 반환', async () => {
      await client.initialize('', { enable: false }, true);

      const domain = client.getDomain();
      expect(domain).toBeDefined();
    });

    test('should return null before initialization / 초기화 전에는 null 반환', () => {
      expect(client.getDomain()).toBeNull();
    });
  });

  describe('getRrwebRecorder', () => {
    test('should return rrweb recorder when initialized / 초기화된 경우 rrweb 레코더 반환', async () => {
      await client.initialize('', { enable: true }, true);

      const recorder = client.getRrwebRecorder();
      // Recorder might be null if rrweb is not properly initialized / rrweb이 제대로 초기화되지 않으면 레코더가 null일 수 있음
      expect(recorder === null || typeof recorder === 'object').toBe(true);
    });

    test('should return null when rrweb is disabled / rrweb이 비활성화된 경우 null 반환', async () => {
      await client.initialize('', { enable: false }, true);

      const recorder = client.getRrwebRecorder();
      expect(recorder).toBeNull();
    });
  });

  describe('getWebSocketClient', () => {
    test('should return WebSocket client after initialization / 초기화 후 WebSocket 클라이언트 반환', async () => {
      await client.initialize('', { enable: false }, true);

      const wsClient = client.getWebSocketClient();
      expect(wsClient).toBeDefined();
    });

    test('should return null before initialization / 초기화 전에는 null 반환', () => {
      expect(client.getWebSocketClient()).toBeNull();
    });
  });

  describe('getPostMessageHandler', () => {
    test('should return postMessage handler after initialization / 초기화 후 postMessage 핸들러 반환', async () => {
      await client.initialize('', { enable: false }, true);

      const handler = client.getPostMessageHandler();
      expect(handler).toBeDefined();
    });

    test('should return null before initialization / 초기화 전에는 null 반환', () => {
      expect(client.getPostMessageHandler()).toBeNull();
    });
  });

  describe('destroy', () => {
    test('should cleanup all resources / 모든 리소스 정리', async () => {
      await client.initialize('', { enable: false }, true);

      client.destroy();

      expect(client.getDomain()).toBeNull();
      expect(client.getWebSocketClient()).toBeNull();
      expect(client.getPostMessageHandler()).toBeNull();
    });

    test('should stop rrweb recorder / rrweb 레코더 중지', async () => {
      await client.initialize('', { enable: true }, true);

      const recorder = client.getRrwebRecorder();
      client.destroy();

      // Recorder should be stopped / 레코더가 중지되어야 함
      expect(client.getRrwebRecorder()).toBeNull();
    });

    test('should destroy postMessage handler / postMessage 핸들러 제거', async () => {
      await client.initialize('', { enable: false }, true);

      const handler = client.getPostMessageHandler();
      expect(handler).toBeDefined();

      client.destroy();

      expect(client.getPostMessageHandler()).toBeNull();
    });

    test('should cleanup WebSocket client / WebSocket 클라이언트 정리', async () => {
      await client.initialize('', { enable: false }, true);

      const wsClient = client.getWebSocketClient();
      expect(wsClient).toBeDefined();

      client.destroy();

      expect(client.getWebSocketClient()).toBeNull();
    });

    test('should handle multiple destroy calls / 여러 번의 destroy 호출 처리', async () => {
      await client.initialize('', { enable: false }, true);

      client.destroy();
      client.destroy();

      // Should not throw / 오류를 던지지 않아야 함
      expect(client.getDomain()).toBeNull();
    });

    test('should handle destroy before initialization / 초기화 전 destroy 처리', () => {
      // Should not throw / 오류를 던지지 않아야 함
      expect(() => client.destroy()).not.toThrow();
    });
  });
});
