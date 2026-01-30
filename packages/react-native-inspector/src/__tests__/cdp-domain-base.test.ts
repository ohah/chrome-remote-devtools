/**
 * CDP domain base tests / CDP domain base 테스트
 * Covers setCDPEventSender, setCDPConnectionReady, sendCDPEvent (aligned with web BaseDomain.send) / setCDPEventSender·setCDPConnectionReady·sendCDPEvent 동작
 */
import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import { setCDPEventSender, setCDPConnectionReady, sendCDPEvent } from '../cdp/domain/base';

describe('cdp/domain/base', () => {
  let mockSender: ReturnType<typeof mock>;

  beforeEach(() => {
    mockSender = mock(() => {});
    (globalThis as any).__ChromeRemoteDevToolsServerHost = 'localhost';
    (globalThis as any).__ChromeRemoteDevToolsServerPort = 8080;
  });

  afterEach(() => {
    setCDPEventSender(null);
    setCDPConnectionReady(false);
    (globalThis as any).__ChromeRemoteDevToolsServerHost = undefined;
    (globalThis as any).__ChromeRemoteDevToolsServerPort = undefined;
  });

  test('sendCDPEvent does not call sender when sender is null / sender가 null이면 sendCDPEvent가 sender 호출 안 함', () => {
    setCDPEventSender(null);
    setCDPConnectionReady();
    sendCDPEvent({
      method: 'Runtime.consoleAPICalled',
      params: { type: 'log', args: [] },
    });
    expect(mockSender).not.toHaveBeenCalled();
  });

  test('sendCDPEvent does not call sender when connection not ready / 연결 준비 전에는 sendCDPEvent가 sender 호출 안 함', () => {
    setCDPEventSender(mockSender);
    sendCDPEvent({
      method: 'Runtime.consoleAPICalled',
      params: { type: 'log', args: [] },
    });
    expect(mockSender).not.toHaveBeenCalled();
  });

  test('sendCDPEvent does not call sender when server info not set / 서버 정보 미설정 시 sendCDPEvent가 sender 호출 안 함', () => {
    (globalThis as any).__ChromeRemoteDevToolsServerHost = undefined;
    (globalThis as any).__ChromeRemoteDevToolsServerPort = undefined;
    setCDPEventSender(mockSender);
    setCDPConnectionReady();
    sendCDPEvent({
      method: 'Runtime.consoleAPICalled',
      params: { type: 'log', args: [] },
    });
    expect(mockSender).not.toHaveBeenCalled();
  });

  test('sendCDPEvent calls sender with host, port, and JSON string when ready / 준비 시 sendCDPEvent가 host·port·JSON으로 sender 호출', () => {
    setCDPEventSender(mockSender);
    setCDPConnectionReady();
    const payload = {
      method: 'Runtime.consoleAPICalled',
      params: { type: 'log', args: [{ type: 'string', value: 'hello' }] },
    };
    sendCDPEvent(payload);
    expect(mockSender).toHaveBeenCalledTimes(1);
    const [host, port, messageStr] = mockSender.mock.calls[0]!;
    expect(host).toBe('localhost');
    expect(port).toBe(8080);
    expect(typeof messageStr).toBe('string');
    const parsed = JSON.parse(messageStr);
    expect(parsed.method).toBe('Runtime.consoleAPICalled');
    expect(parsed.params.type).toBe('log');
    expect(parsed.params.args).toHaveLength(1);
    expect(parsed.params.args[0]).toEqual({ type: 'string', value: 'hello' });
  });

  test('sendCDPEvent sends Network.requestWillBeSent shape / sendCDPEvent가 Network.requestWillBeSent 형태 전송', () => {
    setCDPEventSender(mockSender);
    setCDPConnectionReady();
    sendCDPEvent({
      method: 'Network.requestWillBeSent',
      params: {
        requestId: '1',
        loaderId: '1',
        documentURL: 'http://example.com',
        request: { url: 'http://example.com', method: 'GET', headers: {} },
        timestamp: Date.now() / 1000,
        type: 'Fetch',
      },
    });
    expect(mockSender).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(mockSender.mock.calls[0]![2] as string);
    expect(parsed.method).toBe('Network.requestWillBeSent');
    expect(parsed.params.requestId).toBe('1');
    expect(parsed.params.request.url).toBe('http://example.com');
  });

  test('setCDPEventSender(null) stops subsequent sendCDPEvent from calling sender / setCDPEventSender(null) 후 sendCDPEvent는 sender 미호출', () => {
    setCDPEventSender(mockSender);
    setCDPConnectionReady();
    sendCDPEvent({ method: 'Runtime.consoleAPICalled', params: {} });
    expect(mockSender).toHaveBeenCalledTimes(1);
    setCDPEventSender(null);
    sendCDPEvent({ method: 'Runtime.consoleAPICalled', params: {} });
    expect(mockSender).toHaveBeenCalledTimes(1);
  });

  test('sendCDPEvent does not call sender when JSON.stringify throws (e.g. circular ref) / 직렬화 실패 시 sender 미호출', () => {
    setCDPEventSender(mockSender);
    setCDPConnectionReady();
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    sendCDPEvent({
      method: 'Runtime.consoleAPICalled',
      params: { args: [circular] },
    });
    expect(mockSender).not.toHaveBeenCalled();
  });
});
