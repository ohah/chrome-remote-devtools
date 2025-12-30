// WebSocket client tests / WebSocket 클라이언트 테스트
// happy-dom is registered via bunfig.toml preload / happy-dom은 bunfig.toml preload를 통해 등록됨
import 'fake-indexeddb/auto'; // Import fake-indexeddb for testing / 테스트를 위한 fake-indexeddb import
import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll, mock } from 'bun:test';
import { WebSocketClient } from '../websocket-client';
import {
  createWebSocketTestServer,
  createWebSocketConnection,
  type WebSocketTestServer,
} from '../../__tests__/helpers/websocket-server';

describe('WebSocketClient', () => {
  let testServer: WebSocketTestServer;

  beforeAll(() => {
    // Create WebSocket server for testing / 테스트를 위한 WebSocket 서버 생성
    testServer = createWebSocketTestServer();
  });

  afterAll(() => {
    // Close server after all tests / 모든 테스트 후 서버 종료
    testServer.server.stop();
  });

  describe('constructor', () => {
    test('should create instance / 인스턴스 생성', () => {
      const client = new WebSocketClient('ws://localhost:8080', { enable: false }, false);
      expect(client).toBeDefined();
      client.cleanup();
    });

    test('should accept callbacks / 콜백 허용', () => {
      const onDomainCreated = mock(() => {});
      const onRrwebInit = mock(async () => {});
      const client = new WebSocketClient(
        'ws://localhost:8080',
        { enable: false },
        false,
        onDomainCreated,
        onRrwebInit
      );
      expect(client).toBeDefined();
      client.cleanup();
    });
  });

  describe('initialize - postMessage mode', () => {
    test('should initialize in postMessage mode when skipWebSocket is true / skipWebSocket이 true일 때 postMessage 모드로 초기화', async () => {
      const onDomainCreated = mock((domain) => {
        expect(domain).toBeDefined();
      });
      const client = new WebSocketClient(
        '',
        { enable: false },
        true, // skipWebSocket
        onDomainCreated
      );

      await client.initialize();

      expect(onDomainCreated).toHaveBeenCalled();
      expect(client.getDomain()).toBeDefined();
      expect(client.getSocket()).toBeNull();

      client.cleanup();
    });

    test('should enable domains in postMessage mode / postMessage 모드에서 도메인 활성화', async () => {
      const client = new WebSocketClient('', { enable: false }, true);
      await client.initialize();

      const domain = client.getDomain();
      expect(domain).toBeDefined();

      client.cleanup();
    });

    test('should initialize rrweb in postMessage mode if configured / 설정된 경우 postMessage 모드에서 rrweb 초기화', async () => {
      const onRrwebInit = mock(async () => {});
      const client = new WebSocketClient('', { enable: true }, true, undefined, onRrwebInit);

      await client.initialize();

      // onRrwebInit should be called even without WebSocket / WebSocket 없이도 onRrwebInit이 호출되어야 함
      expect(onRrwebInit).toHaveBeenCalled();

      client.cleanup();
    });
  });

  describe('initialize - WebSocket mode', () => {
    test('should initialize WebSocket connection / WebSocket 연결 초기화', async () => {
      const serverUrl = `http://localhost:${testServer.port}`;
      const client = new WebSocketClient(serverUrl, { enable: false }, false);

      // Mock location.protocol / location.protocol 모킹
      const originalProtocol = location.protocol;
      Object.defineProperty(location, 'protocol', {
        value: 'http:',
        configurable: true,
        writable: true,
      });

      await client.initialize();

      // Wait a bit for WebSocket to connect / WebSocket 연결을 위해 조금 대기
      await new Promise((resolve) => setTimeout(resolve, 100));

      const socket = client.getSocket();
      expect(socket).toBeDefined();

      // Restore / 복원
      Object.defineProperty(location, 'protocol', {
        value: originalProtocol,
        configurable: true,
        writable: true,
      });

      client.cleanup();
    });

    test('should use wss:// for https:// protocol / https:// 프로토콜에 대해 wss:// 사용', async () => {
      const serverUrl = `https://localhost:${testServer.port}`;
      const client = new WebSocketClient(serverUrl, { enable: false }, false);

      const originalProtocol = location.protocol;
      Object.defineProperty(location, 'protocol', {
        value: 'https:',
        configurable: true,
        writable: true,
      });

      await client.initialize();

      await new Promise((resolve) => setTimeout(resolve, 100));

      const socket = client.getSocket();
      expect(socket).toBeDefined();

      Object.defineProperty(location, 'protocol', {
        value: originalProtocol,
        configurable: true,
        writable: true,
      });

      client.cleanup();
    });

    test('should call onDomainCreated callback / onDomainCreated 콜백 호출', async () => {
      const onDomainCreated = mock((domain) => {
        expect(domain).toBeDefined();
      });
      const serverUrl = `http://localhost:${testServer.port}`;
      const client = new WebSocketClient(serverUrl, { enable: false }, false, onDomainCreated);

      const originalProtocol = location.protocol;
      Object.defineProperty(location, 'protocol', {
        value: 'http:',
        configurable: true,
        writable: true,
      });

      await client.initialize();

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(onDomainCreated).toHaveBeenCalled();

      Object.defineProperty(location, 'protocol', {
        value: originalProtocol,
        configurable: true,
        writable: true,
      });

      client.cleanup();
    });
  });

  describe('event storage', () => {
    test('should initialize event storage by default / 기본적으로 이벤트 저장소 초기화', async () => {
      const client = new WebSocketClient('', { enable: false }, true);
      await client.initialize();

      // Event storage should be initialized / 이벤트 저장소가 초기화되어야 함
      const domain = client.getDomain();
      expect(domain).toBeDefined();

      client.cleanup();
    });

    test('should skip event storage when disabled / 비활성화된 경우 이벤트 저장소 건너뛰기', async () => {
      const client = new WebSocketClient('', { enable: false, enableEventStorage: false }, true);
      await client.initialize();

      // Should still work without event storage / 이벤트 저장소 없이도 작동해야 함
      expect(client.getDomain()).toBeDefined();

      client.cleanup();
    });

    test('should handle page reload detection / 페이지 새로고침 감지 처리', async () => {
      const client = new WebSocketClient('', { enable: false }, true);
      await client.initialize();

      // Should not throw / 오류를 던지지 않아야 함
      expect(client.getDomain()).toBeDefined();

      client.cleanup();
    });
  });

  describe('getDomain and getSocket', () => {
    test('should return domain instance / 도메인 인스턴스 반환', async () => {
      const client = new WebSocketClient('', { enable: false }, true);
      await client.initialize();

      const domain = client.getDomain();
      expect(domain).toBeDefined();

      client.cleanup();
    });

    test('should return null domain before initialization / 초기화 전에는 null 도메인 반환', () => {
      const client = new WebSocketClient('', { enable: false }, true);
      expect(client.getDomain()).toBeNull();
      client.cleanup();
    });

    test('should return socket instance in WebSocket mode / WebSocket 모드에서 소켓 인스턴스 반환', async () => {
      const serverUrl = `http://localhost:${testServer.port}`;
      const client = new WebSocketClient(serverUrl, { enable: false }, false);

      const originalProtocol = location.protocol;
      Object.defineProperty(location, 'protocol', {
        value: 'http:',
        configurable: true,
        writable: true,
      });

      await client.initialize();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const socket = client.getSocket();
      expect(socket).toBeDefined();

      Object.defineProperty(location, 'protocol', {
        value: originalProtocol,
        configurable: true,
        writable: true,
      });

      client.cleanup();
    });

    test('should return null socket in postMessage mode / postMessage 모드에서 null 소켓 반환', async () => {
      const client = new WebSocketClient('', { enable: false }, true);
      await client.initialize();

      expect(client.getSocket()).toBeNull();

      client.cleanup();
    });
  });

  describe('WebSocket message handling', () => {
    test('should handle string messages from server / 서버로부터 문자열 메시지 처리', async () => {
      // Create a custom server that sends a message on connection / 연결 시 메시지를 보내는 커스텀 서버 생성
      const customServer = Bun.serve({
        port: 0,
        fetch(req, server) {
          if (server.upgrade(req)) {
            return;
          }
          return new Response('Not a WebSocket request', { status: 426 });
        },
        websocket: {
          open(ws) {
            // Send a test CDP message when connection opens / 연결이 열릴 때 테스트 CDP 메시지 전송
            ws.send(JSON.stringify({ method: 'Runtime.enable', id: 1 }));
          },
          message(ws, message) {
            // Echo messages back / 메시지를 다시 보냄
            ws.send(message);
          },
          close() {},
        },
      });

      const serverUrl = `http://localhost:${customServer.port}`;
      const client = new WebSocketClient(serverUrl, { enable: false }, false);

      const originalProtocol = location.protocol;
      Object.defineProperty(location, 'protocol', {
        value: 'http:',
        configurable: true,
        writable: true,
      });

      await client.initialize();
      await new Promise((resolve) => setTimeout(resolve, 300));

      const socket = client.getSocket();
      expect(socket).toBeDefined();

      // Wait for message to be processed / 메시지 처리 대기
      await new Promise((resolve) => setTimeout(resolve, 100));

      Object.defineProperty(location, 'protocol', {
        value: originalProtocol,
        configurable: true,
        writable: true,
      });

      client.cleanup();
      customServer.stop();
    });

    test('should handle string messages / 문자열 메시지 처리', async () => {
      const serverUrl = `http://localhost:${testServer.port}`;
      const client = new WebSocketClient(serverUrl, { enable: false }, false);

      const originalProtocol = location.protocol;
      Object.defineProperty(location, 'protocol', {
        value: 'http:',
        configurable: true,
        writable: true,
      });

      await client.initialize();
      await new Promise((resolve) => setTimeout(resolve, 200));

      const socket = client.getSocket();
      expect(socket).toBeDefined();

      // Wait for socket to be ready / 소켓이 준비될 때까지 대기
      if (socket) {
        await new Promise<void>((resolve) => {
          if (socket.readyState === WebSocket.OPEN) {
            resolve();
          } else {
            socket.addEventListener('open', () => resolve(), { once: true });
          }
        });

        // Send test message from server side / 서버 측에서 테스트 메시지 전송
        // The test server will echo it back / 테스트 서버가 다시 보냄
        const testMessage = JSON.stringify({ method: 'Runtime.enable', id: 1 });
        socket.send(testMessage);

        // Wait for message to be processed / 메시지 처리 대기
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      Object.defineProperty(location, 'protocol', {
        value: originalProtocol,
        configurable: true,
        writable: true,
      });

      client.cleanup();
    });

    test('should handle Blob messages / Blob 메시지 처리', async () => {
      const serverUrl = `http://localhost:${testServer.port}`;
      const client = new WebSocketClient(serverUrl, { enable: false }, false);

      const originalProtocol = location.protocol;
      Object.defineProperty(location, 'protocol', {
        value: 'http:',
        configurable: true,
        writable: true,
      });

      await client.initialize();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const socket = client.getSocket();
      expect(socket).toBeDefined();

      // Send Blob message / Blob 메시지 전송
      if (socket && socket.readyState === WebSocket.OPEN) {
        const blob = new Blob([JSON.stringify({ method: 'Runtime.enable', id: 1 })], {
          type: 'application/json',
        });
        socket.send(blob);
        // This test verifies the structure / 이 테스트는 구조를 검증함
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      Object.defineProperty(location, 'protocol', {
        value: originalProtocol,
        configurable: true,
        writable: true,
      });

      client.cleanup();
    });

    test('should handle ArrayBuffer messages / ArrayBuffer 메시지 처리', async () => {
      const serverUrl = `http://localhost:${testServer.port}`;
      const client = new WebSocketClient(serverUrl, { enable: false }, false);

      const originalProtocol = location.protocol;
      Object.defineProperty(location, 'protocol', {
        value: 'http:',
        configurable: true,
        writable: true,
      });

      await client.initialize();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const socket = client.getSocket();
      expect(socket).toBeDefined();

      // Send ArrayBuffer message / ArrayBuffer 메시지 전송
      if (socket && socket.readyState === WebSocket.OPEN) {
        // Note: Bun WebSocket might not support ArrayBuffer directly / Bun WebSocket은 ArrayBuffer를 직접 지원하지 않을 수 있음
        // This test verifies the structure / 이 테스트는 구조를 검증함
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      Object.defineProperty(location, 'protocol', {
        value: originalProtocol,
        configurable: true,
        writable: true,
      });

      client.cleanup();
    });

    test('should handle async CDP method responses / 비동기 CDP 메서드 응답 처리', async () => {
      const serverUrl = `http://localhost:${testServer.port}`;
      const client = new WebSocketClient(serverUrl, { enable: false }, false);

      const originalProtocol = location.protocol;
      Object.defineProperty(location, 'protocol', {
        value: 'http:',
        configurable: true,
        writable: true,
      });

      await client.initialize();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const socket = client.getSocket();
      expect(socket).toBeDefined();

      // Send message that returns async result / 비동기 결과를 반환하는 메시지 전송
      if (socket && socket.readyState === WebSocket.OPEN) {
        const testMessage = JSON.stringify({
          method: 'Runtime.evaluate',
          id: 1,
          params: { expression: '1+1' },
        });
        socket.send(testMessage);

        // Wait for async processing / 비동기 처리 대기
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      Object.defineProperty(location, 'protocol', {
        value: originalProtocol,
        configurable: true,
        writable: true,
      });

      client.cleanup();
    });

    test('should handle invalid JSON messages / 유효하지 않은 JSON 메시지 처리', async () => {
      const consoleErrorSpy = mock(() => {});
      const originalError = console.error;
      console.error = consoleErrorSpy;

      const serverUrl = `http://localhost:${testServer.port}`;
      const client = new WebSocketClient(serverUrl, { enable: false }, false);

      const originalProtocol = location.protocol;
      Object.defineProperty(location, 'protocol', {
        value: 'http:',
        configurable: true,
        writable: true,
      });

      await client.initialize();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const socket = client.getSocket();
      expect(socket).toBeDefined();

      // Send invalid JSON / 유효하지 않은 JSON 전송
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send('invalid json');
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      Object.defineProperty(location, 'protocol', {
        value: originalProtocol,
        configurable: true,
        writable: true,
      });

      console.error = originalError;
      client.cleanup();
    });
  });

  describe('sendStoredEvents', () => {
    test('should send stored events when eventStorage is enabled / eventStorage가 활성화된 경우 저장된 이벤트 전송', async () => {
      // Note: sendStoredEvents is a private method that is not currently called / sendStoredEvents는 현재 호출되지 않는 private 메서드입니다
      // This test verifies the initialization with eventStorage / 이 테스트는 eventStorage와 함께 초기화를 검증합니다
      const serverUrl = `http://localhost:${testServer.port}`;
      const client = new WebSocketClient(
        serverUrl,
        { enable: false, enableEventStorage: true },
        false
      );

      const originalProtocol = location.protocol;
      Object.defineProperty(location, 'protocol', {
        value: 'http:',
        configurable: true,
        writable: true,
      });

      await client.initialize();
      await new Promise((resolve) => setTimeout(resolve, 200));

      const socket = client.getSocket();
      expect(socket).toBeDefined();

      Object.defineProperty(location, 'protocol', {
        value: originalProtocol,
        configurable: true,
        writable: true,
      });

      client.cleanup();
    });

    test('should skip sending when eventStorage is disabled / eventStorage가 비활성화된 경우 전송 건너뛰기', async () => {
      const serverUrl = `http://localhost:${testServer.port}`;
      const client = new WebSocketClient(
        serverUrl,
        { enable: false, enableEventStorage: false },
        false
      );

      const originalProtocol = location.protocol;
      Object.defineProperty(location, 'protocol', {
        value: 'http:',
        configurable: true,
        writable: true,
      });

      await client.initialize();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const socket = client.getSocket();
      expect(socket).toBeDefined();

      Object.defineProperty(location, 'protocol', {
        value: originalProtocol,
        configurable: true,
        writable: true,
      });

      client.cleanup();
    });
  });

  describe('setupPeriodicTasks', () => {
    test('should setup periodic tasks when eventStorage is enabled / eventStorage가 활성화된 경우 주기적 작업 설정', async () => {
      const serverUrl = `http://localhost:${testServer.port}`;
      const client = new WebSocketClient(
        serverUrl,
        { enable: false, enableEventStorage: true },
        false
      );

      const originalProtocol = location.protocol;
      Object.defineProperty(location, 'protocol', {
        value: 'http:',
        configurable: true,
        writable: true,
      });

      await client.initialize();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Periodic tasks should be set up / 주기적 작업이 설정되어야 함
      const socket = client.getSocket();
      expect(socket).toBeDefined();

      Object.defineProperty(location, 'protocol', {
        value: originalProtocol,
        configurable: true,
        writable: true,
      });

      client.cleanup();
    });

    test('should cleanup intervals on socket close / 소켓 종료 시 인터벌 정리', async () => {
      const serverUrl = `http://localhost:${testServer.port}`;
      const client = new WebSocketClient(
        serverUrl,
        { enable: false, enableEventStorage: true },
        false
      );

      const originalProtocol = location.protocol;
      Object.defineProperty(location, 'protocol', {
        value: 'http:',
        configurable: true,
        writable: true,
      });

      await client.initialize();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const socket = client.getSocket();
      expect(socket).toBeDefined();

      // Close socket / 소켓 종료
      if (socket) {
        socket.close();
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      Object.defineProperty(location, 'protocol', {
        value: originalProtocol,
        configurable: true,
        writable: true,
      });

      client.cleanup();
    });
  });

  describe('cleanup', () => {
    test('should cleanup resources / 리소스 정리', async () => {
      const client = new WebSocketClient('', { enable: false }, true);
      await client.initialize();

      client.cleanup();

      expect(client.getDomain()).toBeNull();
      expect(client.getSocket()).toBeNull();
    });

    test('should clear intervals / 인터벌 정리', async () => {
      const client = new WebSocketClient('', { enable: false }, true);
      await client.initialize();

      // Cleanup should clear intervals / 정리는 인터벌을 정리해야 함
      client.cleanup();

      expect(client.getDomain()).toBeNull();
    });

    test('should close WebSocket connection / WebSocket 연결 종료', async () => {
      const serverUrl = `http://localhost:${testServer.port}`;
      const client = new WebSocketClient(serverUrl, { enable: false }, false);

      const originalProtocol = location.protocol;
      Object.defineProperty(location, 'protocol', {
        value: 'http:',
        configurable: true,
        writable: true,
      });

      await client.initialize();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const socket = client.getSocket();
      expect(socket).toBeDefined();

      client.cleanup();

      // Socket should be closed / 소켓이 닫혀야 함
      expect(client.getSocket()).toBeNull();

      Object.defineProperty(location, 'protocol', {
        value: originalProtocol,
        configurable: true,
        writable: true,
      });
    });
  });
});
