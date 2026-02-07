/**
 * CDP message handler tests / CDP 메시지 핸들러 테스트
 * Covers registerCDPMessageHandler, handleCDPMessage, global handler, Runtime.enable, Page.getResourceTree, Runtime.getProperties, Runtime.releaseObject, Runtime.addBinding, Runtime.bindingCalled / 핸들러 등록·처리·전역·Runtime·Page·addBinding·bindingCalled
 */
import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import { registerCDPMessageHandler, handleCDPMessage } from '../cdp-message-handler';
import { setServerInfo } from '../server-info';
import { setCDPEventSender, setCDPConnectionReady } from '../cdp/domain/base';
import { getOrCreateObjectId, getObject } from '../cdp/common/object-store';

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
    setCDPEventSender(null);
    setCDPConnectionReady(false);
    (globalThis as any).__ChromeRemoteDevToolsServerHost = undefined;
    (globalThis as any).__ChromeRemoteDevToolsServerPort = undefined;
    // Clean up binding installed by Runtime.addBinding tests / Runtime.addBinding 테스트에서 설치한 바인딩 제거
    delete (globalThis as any).testBindingAddBinding;
    delete (globalThis as any).testBindingPayloadObject;
  });

  test('handleCDPMessage returns when message has no method (no log) / method 없으면 반환 (로그 없음)', () => {
    handleCDPMessage({ params: {} });
    expect(consoleWarnSpy).not.toHaveBeenCalled();
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

  test('async handler errors are caught (no unhandled rejection) / 비동기 핸들러 에러 시 catch (unhandled rejection 없음)', async () => {
    const handler = mock(() => Promise.reject(new Error('async handler error')));
    registerCDPMessageHandler('Test.asyncFail', handler);
    handleCDPMessage({ method: 'Test.asyncFail', id: 1 });
    await new Promise((r) => setTimeout(r, 10));
    expect(handler).toHaveBeenCalledTimes(1);
    // No console.error (we swallow to avoid noise); no unhandled rejection
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  test('sync handler throw is caught (no rethrow) / 동기 핸들러 throw 시 catch (재throw 없음)', () => {
    const handler = mock(() => {
      throw new Error('sync throw');
    });
    registerCDPMessageHandler('Test.syncThrow', handler);
    handleCDPMessage({ method: 'Test.syncThrow', id: 1 });
    expect(handler).toHaveBeenCalledTimes(1);
    // No console.error (we swallow); handleCDPMessage does not throw
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  test('global __CDP_MESSAGE_HANDLER__ parses JSON and routes to handler / 전역 핸들러가 JSON 파싱 후 라우팅', () => {
    const handler = mock(() => {});
    registerCDPMessageHandler('Native.test', handler);
    const globalHandler = (global as any).__CDP_MESSAGE_HANDLER__;
    expect(typeof globalHandler).toBe('function');
    globalHandler('{"method":"Native.test","id":1}');
    expect(handler).toHaveBeenCalledWith({ method: 'Native.test', id: 1 });
  });

  test('global __CDP_MESSAGE_HANDLER__ invalid JSON is ignored (no throw) / 잘못된 JSON 시 무시 (throw 없음)', () => {
    (global as any).__CDP_MESSAGE_HANDLER__('not json');
    // We no longer log; just ensure we don't throw
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  test('unregister removes handler and updates global / 등록 해제 시 핸들러 제거 및 전역 갱신', () => {
    const handler = mock(() => {});
    const unregister = registerCDPMessageHandler('Test.unreg', handler);
    handleCDPMessage({ method: 'Test.unreg' });
    expect(handler).toHaveBeenCalledTimes(1);
    unregister();
    handleCDPMessage({ method: 'Test.unreg' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('Runtime.enable triggers sendExecutionContextCreated (sender called) / Runtime.enable 시 executionContextCreated 전송', () => {
    const mockSender = mock(() => {});
    setServerInfo('localhost', 8080);
    setCDPEventSender(mockSender);
    setCDPConnectionReady();
    handleCDPMessage({ method: 'Runtime.enable' });
    expect(mockSender).toHaveBeenCalled();
    const messageStr = mockSender.mock.calls[0]![2] as string;
    const parsed = JSON.parse(messageStr);
    expect(parsed.method).toBe('Runtime.executionContextCreated');
  });

  test('Page.getResourceTree with id sends CDP response with frameTree / Page.getResourceTree 시 frameTree 응답', () => {
    const mockSender = mock(() => {});
    setServerInfo('localhost', 8080);
    setCDPEventSender(mockSender);
    setCDPConnectionReady();
    handleCDPMessage({ method: 'Page.getResourceTree', id: 99 });
    expect(mockSender).toHaveBeenCalled();
    const messageStr = mockSender.mock.calls[0]![2] as string;
    const parsed = JSON.parse(messageStr);
    expect(parsed.id).toBe(99);
    expect(parsed.result).toBeDefined();
    expect(parsed.result.frameTree).toBeDefined();
    expect(parsed.result.frameTree.frame.url).toBe('react-native://');
  });

  test('Runtime.getProperties with objectId sends result (PropertyDescriptor[]) / Runtime.getProperties objectId 시 result 전송', () => {
    const mockSender = mock(() => {});
    setServerInfo('localhost', 8080);
    setCDPEventSender(mockSender);
    setCDPConnectionReady();
    const obj = { foo: 42 };
    const objectId = getOrCreateObjectId(obj);
    handleCDPMessage({ method: 'Runtime.getProperties', id: 1, params: { objectId } });
    expect(mockSender).toHaveBeenCalled();
    const messageStr = mockSender.mock.calls[0]![2] as string;
    const parsed = JSON.parse(messageStr);
    expect(parsed.id).toBe(1);
    expect(Array.isArray(parsed.result.result)).toBe(true);
    const fooDesc = parsed.result.result.find((p: { name: string }) => p.name === 'foo');
    expect(fooDesc).toBeDefined();
    expect(fooDesc.value.type).toBe('number');
    expect(fooDesc.value.value).toBe(42);
  });

  test('Runtime.getProperties without objectId sends empty result / Runtime.getProperties objectId 없으면 빈 result', () => {
    const mockSender = mock(() => {});
    setServerInfo('localhost', 8080);
    setCDPEventSender(mockSender);
    setCDPConnectionReady();
    handleCDPMessage({ method: 'Runtime.getProperties', id: 2, params: {} });
    expect(mockSender).toHaveBeenCalled();
    const messageStr = mockSender.mock.calls[0]![2] as string;
    const parsed = JSON.parse(messageStr);
    expect(parsed.id).toBe(2);
    expect(parsed.result.result).toEqual([]);
  });

  test('Runtime.releaseObject sends empty result and releases object / Runtime.releaseObject 시 result 전송 및 객체 해제', () => {
    const mockSender = mock(() => {});
    setServerInfo('localhost', 8080);
    setCDPEventSender(mockSender);
    setCDPConnectionReady();
    const obj = { toRelease: true };
    const objectId = getOrCreateObjectId(obj);
    handleCDPMessage({ method: 'Runtime.releaseObject', id: 3, params: { objectId } });
    expect(mockSender).toHaveBeenCalled();
    const messageStr = mockSender.mock.calls[0]![2] as string;
    const parsed = JSON.parse(messageStr);
    expect(parsed.id).toBe(3);
    expect(parsed.result).toEqual({});
    expect(getObject(objectId)).toBeUndefined();
  });

  test('Runtime.callFunctionOn runs function on object and returns value (Copy object) / Runtime.callFunctionOn 객체에 함수 실행 후 값 반환 (Copy object)', () => {
    const mockSender = mock(() => {});
    setServerInfo('localhost', 8080);
    setCDPEventSender(mockSender);
    setCDPConnectionReady();
    const obj = { foo: 1, bar: 'baz' };
    const objectId = getOrCreateObjectId(obj);
    handleCDPMessage({
      method: 'Runtime.callFunctionOn',
      id: 42,
      params: {
        objectId,
        functionDeclaration:
          'function (data) { return JSON.stringify(this, null, data.indent || ""); }',
        arguments: [{ value: { indent: '  ' } }],
        returnByValue: true,
      },
    });
    expect(mockSender).toHaveBeenCalled();
    const messageStr = mockSender.mock.calls[0]![2] as string;
    const parsed = JSON.parse(messageStr);
    expect(parsed.id).toBe(42);
    expect(parsed.result).toBeDefined();
    expect(parsed.result.result).toBeDefined();
    expect(parsed.result.result.type).toBe('string');
    expect(parsed.result.result.value).toContain('"foo": 1');
    expect(parsed.result.result.value).toContain('"bar": "baz"');
  });

  test('Runtime.evaluate returns expression value (for React DevTools waitForFuseboxDispatcher) / Runtime.evaluate가 표현식 값을 반환 (React DevTools waitForFuseboxDispatcher용)', () => {
    const mockSender = mock(() => {});
    setServerInfo('localhost', 8080);
    setCDPEventSender(mockSender);
    setCDPConnectionReady();
    handleCDPMessage({
      method: 'Runtime.evaluate',
      id: 10,
      params: { expression: '1 + 2' },
    });
    expect(mockSender).toHaveBeenCalled();
    const messageStr = mockSender.mock.calls[0]![2] as string;
    const parsed = JSON.parse(messageStr);
    expect(parsed.id).toBe(10);
    expect(parsed.result).toBeDefined();
    expect(parsed.result.result).toBeDefined();
    expect(parsed.result.result.type).toBe('number');
    expect(parsed.result.result.value).toBe(3);
  });

  test('Runtime.evaluate comparison returns boolean (e.g. globalThis.x != undefined) / Runtime.evaluate 비교식은 boolean 반환', () => {
    const mockSender = mock(() => {});
    setServerInfo('localhost', 8080);
    setCDPEventSender(mockSender);
    setCDPConnectionReady();
    handleCDPMessage({
      method: 'Runtime.evaluate',
      id: 11,
      params: {
        expression: 'globalThis.__FUSEBOX_REACT_DEVTOOLS_DISPATCHER__ != undefined',
        returnByValue: true,
      },
    });
    expect(mockSender).toHaveBeenCalled();
    const messageStr = mockSender.mock.calls[0]![2] as string;
    const parsed = JSON.parse(messageStr);
    expect(parsed.id).toBe(11);
    expect(parsed.result?.result?.type).toBe('boolean');
    // In test env the global may or may not have the dispatcher; we only assert the shape
    expect(typeof parsed.result?.result?.value).toBe('boolean');
  });

  test('Runtime.addBinding sends result and calling binding sends Runtime.bindingCalled / Runtime.addBinding 응답 후 바인딩 호출 시 bindingCalled 전송', () => {
    const mockSender = mock(() => {});
    setServerInfo('localhost', 8080);
    setCDPEventSender(mockSender);
    setCDPConnectionReady();
    handleCDPMessage({
      method: 'Runtime.addBinding',
      id: 1,
      params: { name: 'testBindingAddBinding' },
    });
    expect(mockSender).toHaveBeenCalled();
    const responseStr = mockSender.mock.calls[0]![2] as string;
    const response = JSON.parse(responseStr);
    expect(response.id).toBe(1);
    expect(response.result).toEqual({});
    (globalThis as any).testBindingAddBinding('hello');
    expect(mockSender).toHaveBeenCalledTimes(2);
    const eventStr = mockSender.mock.calls[1]![2] as string;
    const event = JSON.parse(eventStr);
    expect(event.method).toBe('Runtime.bindingCalled');
    expect(event.params.name).toBe('testBindingAddBinding');
    expect(event.params.payload).toBe('hello');
    expect(event.params.executionContextId).toBe(1);
  });

  test('Runtime.addBinding binding called with object sends JSON string payload / addBinding 바인딩에 객체 전달 시 payload는 JSON 문자열', () => {
    const mockSender = mock(() => {});
    setServerInfo('localhost', 8080);
    setCDPEventSender(mockSender);
    setCDPConnectionReady();
    handleCDPMessage({
      method: 'Runtime.addBinding',
      id: 2,
      params: { name: 'testBindingPayloadObject' },
    });
    const payload = { domain: 'react-devtools', message: { event: 'ping' } };
    (globalThis as any).testBindingPayloadObject(payload);
    expect(mockSender).toHaveBeenCalled();
    const eventStr = mockSender.mock.calls[mockSender.mock.calls.length - 1]![2] as string;
    const event = JSON.parse(eventStr);
    expect(event.method).toBe('Runtime.bindingCalled');
    expect(event.params.payload).toBe(JSON.stringify(payload));
  });
});
