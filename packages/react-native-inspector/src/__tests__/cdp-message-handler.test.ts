/**
 * CDP message handler tests / CDP 메시지 핸들러 테스트
 * Covers registerCDPMessageHandler, handleCDPMessage, global handler / 핸들러 등록·처리·전역 핸들러
 */
import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import { registerCDPMessageHandler, handleCDPMessage } from '../cdp-message-handler';

describe('cdp-message-handler', () => {
  let consoleWarnSpy: ReturnType<typeof mock>;
  let consoleLogSpy: ReturnType<typeof mock>;
  let consoleErrorSpy: ReturnType<typeof mock>;

  beforeEach(() => {
    consoleWarnSpy = mock(() => {});
    consoleLogSpy = mock(() => {});
    consoleErrorSpy = mock(() => {});
    const orig = global.console;
    global.console = {
      ...orig,
      warn: consoleWarnSpy,
      log: consoleLogSpy,
      error: consoleErrorSpy,
    };
  });

  afterEach(() => {
    // Handlers are retained; tests use unique method names to avoid collisions.
    // 전역 핸들러는 모듈이 설정하므로 초기화하지 않음.
  });

  test('handleCDPMessage warns and returns when message has no method / method 없으면 경고 후 반환', () => {
    handleCDPMessage({ params: {} });
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('no method'));
  });

  test('handleCDPMessage returns without logging when no handler registered / 핸들러 미등록 시 로그 없이 반환 (콘솔 플러딩 방지)', () => {
    handleCDPMessage({ method: 'Domain.unknownMethod', id: 1 });
    expect(consoleLogSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('No handler registered')
    );
  });

  test('registerCDPMessageHandler and handleCDPMessage call handler / 등록된 핸들러 호출', () => {
    const handler = mock((msg: { method?: string; id?: number }) => {
      expect(msg.method).toBe('Test.echo');
      expect(msg.id).toBe(42);
    });
    const unregister = registerCDPMessageHandler('Test.echo', handler);
    handleCDPMessage({ method: 'Test.echo', id: 42 });
    expect(handler).toHaveBeenCalledTimes(1);
    unregister();
    handleCDPMessage({ method: 'Test.echo', id: 1 });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('async handler errors are caught and logged / 비동기 핸들러 에러 시 catch 후 로그', async () => {
    const handler = mock(() => Promise.reject(new Error('async handler error')));
    registerCDPMessageHandler('Test.asyncFail', handler);
    handleCDPMessage({ method: 'Test.asyncFail', id: 1 });
    await new Promise((r) => setTimeout(r, 10));
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error in handler'),
      expect.any(Error)
    );
  });

  test('sync handler throw is caught and logged / 동기 핸들러 throw 시 catch 후 로그', () => {
    const handler = mock(() => {
      throw new Error('sync throw');
    });
    registerCDPMessageHandler('Test.syncThrow', handler);
    handleCDPMessage({ method: 'Test.syncThrow', id: 1 });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error in handler'),
      expect.any(Error)
    );
  });

  test('global __CDP_MESSAGE_HANDLER__ parses JSON and routes to handler / 전역 핸들러가 JSON 파싱 후 라우팅', () => {
    const handler = mock(() => {});
    registerCDPMessageHandler('Native.test', handler);
    const globalHandler = (global as any).__CDP_MESSAGE_HANDLER__;
    expect(typeof globalHandler).toBe('function');
    globalHandler('{"method":"Native.test","id":1}');
    expect(handler).toHaveBeenCalledWith({ method: 'Native.test', id: 1 });
  });

  test('global __CDP_MESSAGE_HANDLER__ invalid JSON logs error / 잘못된 JSON 시 에러 로그', () => {
    (global as any).__CDP_MESSAGE_HANDLER__('not json');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to parse message'),
      expect.any(Error)
    );
  });

  test('unregister removes handler and updates global / 등록 해제 시 핸들러 제거 및 전역 갱신', () => {
    const handler = mock(() => {});
    const unregister = registerCDPMessageHandler('Test.unreg', handler);
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Registered handler'));
    unregister();
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Unregistered handler'));
    handleCDPMessage({ method: 'Test.unreg' });
    expect(handler).not.toHaveBeenCalled();
  });
});
