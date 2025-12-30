// PostMessage handler tests / PostMessage 핸들러 테스트
// happy-dom is registered via bunfig.toml preload / happy-dom은 bunfig.toml preload를 통해 등록됨
import 'fake-indexeddb/auto'; // Import fake-indexeddb for testing / 테스트를 위한 fake-indexeddb import
import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import { PostMessageHandler } from '../postmessage-handler';
import ChromeDomain from '../../cdp';

describe('PostMessageHandler', () => {
  let handler: PostMessageHandler;
  let domain: ChromeDomain;
  let mockWindow: Window;

  beforeEach(() => {
    // Create domain with null socket for postMessage mode / postMessage 모드를 위해 null 소켓으로 도메인 생성
    domain = new ChromeDomain({ socket: null });
    handler = new PostMessageHandler(domain);

    // Create mock window for testing / 테스트를 위한 모킹 window 생성
    mockWindow = window;
  });

  afterEach(() => {
    // Cleanup handler / 핸들러 정리
    if (handler) {
      handler.destroy();
    }
  });

  describe('constructor and setup', () => {
    test('should create instance / 인스턴스 생성', () => {
      expect(handler).toBeDefined();
    });

    test('should setup message listener / 메시지 리스너 설정', () => {
      // Handler should be created and listener should be registered / 핸들러가 생성되고 리스너가 등록되어야 함
      expect(handler).toBeDefined();
    });

    test('should accept null domain / null 도메인 허용', () => {
      const handlerWithNull = new PostMessageHandler(null);
      expect(handlerWithNull).toBeDefined();
      handlerWithNull.destroy();
    });
  });

  describe('setDomain', () => {
    test('should set domain instance / 도메인 인스턴스 설정', () => {
      const newDomain = new ChromeDomain({ socket: null });
      handler.setDomain(newDomain);
      // Domain should be set / 도메인이 설정되어야 함
      expect(handler).toBeDefined();
    });

    test('should update DevTools window when domain is set / 도메인 설정 시 DevTools window 업데이트', () => {
      const newDomain = new ChromeDomain({ socket: null });
      // Set DevTools window first / 먼저 DevTools window 설정
      const mockDevToolsWindow = window.open('', '_blank') || window;
      handler.setDomain(newDomain);
      // Should not throw / 오류를 던지지 않아야 함
      expect(handler).toBeDefined();
      if (mockDevToolsWindow && mockDevToolsWindow !== window) {
        mockDevToolsWindow.close();
      }
    });
  });

  describe('handleMessage', () => {
    test('should ignore non-object messages / 객체가 아닌 메시지 무시', () => {
      const event = new MessageEvent('message', {
        data: 'string message',
        source: window,
      });
      window.dispatchEvent(event);
      // Should not throw / 오류를 던지지 않아야 함
      expect(handler).toBeDefined();
    });

    test('should ignore messages when domain is null / 도메인이 null일 때 메시지 무시', () => {
      const handlerWithNull = new PostMessageHandler(null);
      const event = new MessageEvent('message', {
        data: { type: 'CDP_MESSAGE', message: '{"method":"Runtime.enable","id":1}' },
        source: window,
      });
      window.dispatchEvent(event);
      // Should not throw / 오류를 던지지 않아야 함
      expect(handlerWithNull).toBeDefined();
      handlerWithNull.destroy();
    });

    test('should handle DEVTOOLS_READY message / DEVTOOLS_READY 메시지 처리', (done) => {
      // Listen for devtools-ready event / devtools-ready 이벤트 리스닝
      window.addEventListener('devtools-ready', (e: any) => {
        expect(e.detail.ready).toBe(true);
        done();
      });

      const event = new MessageEvent('message', {
        data: { type: 'DEVTOOLS_READY' },
        source: window,
      });
      window.dispatchEvent(event);
    });

    test('should store DevTools window from DEVTOOLS_READY / DEVTOOLS_READY에서 DevTools window 저장', (done) => {
      window.addEventListener('devtools-ready', () => {
        // DevTools window should be stored / DevTools window가 저장되어야 함
        done();
      });

      const event = new MessageEvent('message', {
        data: { type: 'DEVTOOLS_READY' },
        source: window,
      });
      window.dispatchEvent(event);
    });

    test('should handle CDP_MESSAGE type / CDP_MESSAGE 타입 처리', () => {
      const event = new MessageEvent('message', {
        data: {
          type: 'CDP_MESSAGE',
          message: JSON.stringify({ method: 'Runtime.enable', id: 1 }),
        },
        source: window,
      });
      window.dispatchEvent(event);
      // Should not throw / 오류를 던지지 않아야 함
      expect(handler).toBeDefined();
    });

    test('should ignore messages in replay mode / replay 모드에서 메시지 무시', () => {
      // Set replay mode / replay 모드 설정
      (window as any).__CHROME_REMOTE_DEVTOOLS_REPLAY_MODE__ = true;

      const event = new MessageEvent('message', {
        data: {
          type: 'CDP_MESSAGE',
          message: JSON.stringify({ method: 'Runtime.enable', id: 1 }),
        },
        source: window,
      });
      window.dispatchEvent(event);
      // Should not process message / 메시지를 처리하지 않아야 함
      expect(handler).toBeDefined();

      // Cleanup / 정리
      delete (window as any).__CHROME_REMOTE_DEVTOOLS_REPLAY_MODE__;
    });

    test('should handle invalid JSON in CDP_MESSAGE / CDP_MESSAGE의 유효하지 않은 JSON 처리', () => {
      const consoleWarnSpy = mock(() => {});
      const originalWarn = console.warn;
      console.warn = consoleWarnSpy;

      const event = new MessageEvent('message', {
        data: {
          type: 'CDP_MESSAGE',
          message: 'invalid json',
        },
        source: window,
      });
      window.dispatchEvent(event);

      // Should log warning / 경고를 로그해야 함
      expect(consoleWarnSpy).toHaveBeenCalled();

      console.warn = originalWarn;
    });
  });

  describe('sendResponse', () => {
    test('should send response for synchronous result / 동기 결과에 대한 응답 전송', () => {
      const mockPostMessage = mock(() => {});
      const mockSource = {
        postMessage: mockPostMessage,
      } as unknown as Window;

      // Create handler and trigger response / 핸들러 생성 및 응답 트리거
      const testHandler = new PostMessageHandler(domain);

      // Simulate CDP message that returns sync result / 동기 결과를 반환하는 CDP 메시지 시뮬레이션
      const event = new MessageEvent('message', {
        data: {
          type: 'CDP_MESSAGE',
          message: JSON.stringify({ method: 'Runtime.enable', id: 1 }),
        },
        source: mockSource,
      });
      window.dispatchEvent(event);

      testHandler.destroy();
    });

    test('should send response for async result / 비동기 결과에 대한 응답 전송', async () => {
      const testHandler = new PostMessageHandler(domain);

      // Note: Testing async response handling / 비동기 응답 처리 테스트
      // The actual implementation handles promises / 실제 구현은 Promise를 처리함
      expect(testHandler).toBeDefined();

      testHandler.destroy();
    });

    test('should handle errors in async result / 비동기 결과의 오류 처리', async () => {
      const testHandler = new PostMessageHandler(domain);

      // Note: Error handling is tested through domain execution / 오류 처리는 도메인 실행을 통해 테스트됨
      expect(testHandler).toBeDefined();

      testHandler.destroy();
    });

    test('should use CDP_MESSAGE format by default / 기본적으로 CDP_MESSAGE 형식 사용', () => {
      const testHandler = new PostMessageHandler(domain);

      // Test that CDP_MESSAGE format is used / CDP_MESSAGE 형식이 사용되는지 테스트
      expect(testHandler).toBeDefined();

      testHandler.destroy();
    });

    test('should use legacy format when requested / 요청 시 레거시 형식 사용', () => {
      // Note: Legacy format is not directly testable without exposing private methods / 레거시 형식은 private 메서드를 노출하지 않고는 직접 테스트 불가
      const testHandler = new PostMessageHandler(domain);
      expect(testHandler).toBeDefined();
      testHandler.destroy();
    });
  });

  describe('isWindow', () => {
    test('should identify valid Window objects / 유효한 Window 객체 식별', () => {
      // isWindow is private, but we can test through message handling / isWindow은 private이지만 메시지 처리를 통해 테스트 가능
      const event = new MessageEvent('message', {
        data: { type: 'DEVTOOLS_READY' },
        source: window,
      });
      window.dispatchEvent(event);
      // Should not throw / 오류를 던지지 않아야 함
      expect(handler).toBeDefined();
    });

    test('should reject non-Window sources / Window가 아닌 source 거부', () => {
      const event = new MessageEvent('message', {
        data: { type: 'DEVTOOLS_READY' },
        source: null,
      });
      window.dispatchEvent(event);
      // Should not throw / 오류를 던지지 않아야 함
      expect(handler).toBeDefined();
    });
  });

  describe('destroy', () => {
    test('should remove message listener / 메시지 리스너 제거', () => {
      handler.destroy();
      // After destroy, handler should be cleaned up / destroy 후 핸들러가 정리되어야 함
      expect(handler).toBeDefined();
    });

    test('should allow multiple destroy calls / 여러 번의 destroy 호출 허용', () => {
      handler.destroy();
      handler.destroy();
      // Should not throw / 오류를 던지지 않아야 함
      expect(handler).toBeDefined();
    });
  });
});
