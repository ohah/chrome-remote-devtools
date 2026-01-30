/**
 * Network hook tests / 네트워크 훅 테스트
 * Covers CDP sender, connection ready, enable/disable, XHR/fetch and Network.requestWillBeSent·loadingFinished / CDP 전송·연결·활성화/비활성화·XHR/fetch 훅
 */
import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import {
  setNetworkCDPSender,
  setNetworkConnectionReady,
  enableNetworkHook,
  disableNetworkHook,
  isNetworkHookEnabled,
} from '../network/network-hook';

describe('network-hook', () => {
  let mockSender: ReturnType<typeof mock>;

  beforeEach(() => {
    mockSender = mock(() => {});
    (globalThis as any).__ChromeRemoteDevToolsServerHost = 'localhost';
    (globalThis as any).__ChromeRemoteDevToolsServerPort = 8080;
  });

  afterEach(() => {
    disableNetworkHook();
    setNetworkCDPSender(null as any);
    (globalThis as any).__ChromeRemoteDevToolsServerHost = undefined;
    (globalThis as any).__ChromeRemoteDevToolsServerPort = undefined;
  });

  test('isNetworkHookEnabled is false when not enabled / 비활성화 시 false', () => {
    expect(isNetworkHookEnabled()).toBe(false);
  });

  test('enableNetworkHook installs hooks and isNetworkHookEnabled is true / 활성화 시 훅 설치 및 true', () => {
    setNetworkCDPSender(mockSender);
    setNetworkConnectionReady();
    const ok = enableNetworkHook();
    expect(ok).toBe(true);
    expect(isNetworkHookEnabled()).toBe(true);
  });

  test('disableNetworkHook restores originals and isNetworkHookEnabled is false / 비활성화 시 원본 복원 및 false', () => {
    setNetworkCDPSender(mockSender);
    setNetworkConnectionReady();
    enableNetworkHook();
    const ok = disableNetworkHook();
    expect(ok).toBe(true);
    expect(isNetworkHookEnabled()).toBe(false);
  });

  test('when sender is null, no CDP is sent / sender가 null이면 CDP 미전송', async () => {
    setNetworkCDPSender(null as any);
    setNetworkConnectionReady();
    enableNetworkHook();
    mockSender.mockClear();
    const res = await fetch('http://example.com/');
    expect(res).toBeDefined();
    expect(mockSender).not.toHaveBeenCalled();
  });

  test('when server info not set, no CDP is sent / 서버 정보 미설정 시 CDP 미전송', async () => {
    (globalThis as any).__ChromeRemoteDevToolsServerHost = undefined;
    (globalThis as any).__ChromeRemoteDevToolsServerPort = undefined;
    setNetworkCDPSender(mockSender);
    setNetworkConnectionReady();
    enableNetworkHook();
    mockSender.mockClear();
    const res = await fetch('http://example.com/');
    expect(res).toBeDefined();
    expect(mockSender).not.toHaveBeenCalled();
  });

  test('fetch sends requestWillBeSent and loadingFinished with Content-Length when available / fetch 시 requestWillBeSent·loadingFinished, Content-Length 사용', async () => {
    const res = new Response('hello', {
      headers: { 'Content-Length': '5' },
    });
    const origFetch = (globalThis as any).fetch;
    (globalThis as any).fetch = () => Promise.resolve(res);
    setNetworkCDPSender(mockSender);
    setNetworkConnectionReady();
    enableNetworkHook();
    mockSender.mockClear();
    await fetch('http://example.com/');
    disableNetworkHook();
    (globalThis as any).fetch = origFetch;
    expect(mockSender).toHaveBeenCalled();
    const calls = mockSender.mock.calls;
    const requestSent = calls.find(
      (c) => JSON.parse(c![2] as string).method === 'Network.requestWillBeSent'
    );
    const loadingFinished = calls.find(
      (c) => JSON.parse(c![2] as string).method === 'Network.loadingFinished'
    );
    expect(requestSent).toBeDefined();
    expect(loadingFinished).toBeDefined();
    expect(JSON.parse(loadingFinished![2] as string).params.encodedDataLength).toBe(5);
  });

  test('fetch loadingFinished uses 0 when Content-Length absent / Content-Length 없을 때 encodedDataLength 0', async () => {
    const res = new Response('body', { headers: {} });
    const origFetch = (globalThis as any).fetch;
    (globalThis as any).fetch = () => Promise.resolve(res);
    setNetworkCDPSender(mockSender);
    setNetworkConnectionReady();
    enableNetworkHook();
    mockSender.mockClear();
    await fetch('http://example.com/');
    disableNetworkHook();
    (globalThis as any).fetch = origFetch;
    const loadingFinished = mockSender.mock.calls.find(
      (c) => JSON.parse(c![2] as string).method === 'Network.loadingFinished'
    );
    expect(loadingFinished).toBeDefined();
    expect(JSON.parse(loadingFinished![2] as string).params.encodedDataLength).toBe(0);
  });
});
