/**
 * Network hook tests / 네트워크 훅 테스트
 * Covers CDP sender, connection ready, enable/disable, XHR/fetch and Network.requestWillBeSent·loadingFinished / CDP 전송·연결·활성화/비활성화·XHR/fetch 훅
 */
import { createServer } from 'http';
import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import { setCDPEventSender, setCDPConnectionReady } from '../cdp-message';
import { enableNetworkHook, disableNetworkHook, isNetworkHookEnabled } from '../cdp/domain/network';

describe('network-hook', () => {
  let mockSender: ReturnType<typeof mock>;

  beforeEach(() => {
    mockSender = mock(() => {});
    (globalThis as any).__ChromeRemoteDevToolsServerHost = 'localhost';
    (globalThis as any).__ChromeRemoteDevToolsServerPort = 8080;
  });

  afterEach(() => {
    disableNetworkHook();
    setCDPEventSender(null);
    (globalThis as any).__ChromeRemoteDevToolsServerHost = undefined;
    (globalThis as any).__ChromeRemoteDevToolsServerPort = undefined;
  });

  test('isNetworkHookEnabled is false when not enabled / 비활성화 시 false', () => {
    expect(isNetworkHookEnabled()).toBe(false);
  });

  test('enableNetworkHook installs hooks and isNetworkHookEnabled is true / 활성화 시 훅 설치 및 true', () => {
    setCDPEventSender(mockSender);
    setCDPConnectionReady();
    const ok = enableNetworkHook();
    expect(ok).toBe(true);
    expect(isNetworkHookEnabled()).toBe(true);
  });

  test('disableNetworkHook restores originals and isNetworkHookEnabled is false / 비활성화 시 원본 복원 및 false', () => {
    setCDPEventSender(mockSender);
    setCDPConnectionReady();
    enableNetworkHook();
    const ok = disableNetworkHook();
    expect(ok).toBe(true);
    expect(isNetworkHookEnabled()).toBe(false);
  });

  test('when sender is null, no CDP is sent / sender가 null이면 CDP 미전송', async () => {
    disableNetworkHook();
    setCDPEventSender(null);
    setCDPConnectionReady();
    enableNetworkHook();
    mockSender.mockClear();
    const origFetch = (globalThis as any).fetch;
    (globalThis as any).fetch = () => Promise.resolve(new Response('ok'));
    const res = await fetch('http://example.com/');
    (globalThis as any).fetch = origFetch;
    disableNetworkHook();
    expect(res).toBeDefined();
    expect(mockSender).not.toHaveBeenCalled();
  });

  test('when server info not set, no CDP is sent / 서버 정보 미설정 시 CDP 미전송', async () => {
    disableNetworkHook();
    (globalThis as any).__ChromeRemoteDevToolsServerHost = undefined;
    (globalThis as any).__ChromeRemoteDevToolsServerPort = undefined;
    setCDPEventSender(mockSender);
    setCDPConnectionReady();
    enableNetworkHook();
    mockSender.mockClear();
    const origFetch = (globalThis as any).fetch;
    (globalThis as any).fetch = () => Promise.resolve(new Response('ok'));
    const res = await fetch('http://example.com/');
    (globalThis as any).fetch = origFetch;
    disableNetworkHook();
    expect(res).toBeDefined();
    expect(mockSender).not.toHaveBeenCalled();
  });

  test('fetch sends requestWillBeSent and loadingFinished with Content-Length when available / fetch 시 requestWillBeSent·loadingFinished, Content-Length 사용', async () => {
    const res = new Response('hello', {
      headers: { 'Content-Length': '5' },
    });
    const origFetch = (globalThis as any).fetch;
    (globalThis as any).fetch = () => Promise.resolve(res);
    setCDPEventSender(mockSender);
    setCDPConnectionReady();
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
    setCDPEventSender(mockSender);
    setCDPConnectionReady();
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

  test('XHR sends requestWillBeSent and loadingFinished with real request to own server / 본인 API 서버로 실제 XHR 요청 시 requestWillBeSent·loadingFinished 전송', async () => {
    const body = 'ok';
    const httpServer = createServer((_req, res) => {
      res.writeHead(200, { 'Content-Length': String(body.length) });
      res.end(body);
    });
    await new Promise<void>((resolve) => {
      httpServer.listen(0, '127.0.0.1', () => resolve());
    });
    const port = (httpServer.address() as { port: number }).port;
    const baseUrl = `http://127.0.0.1:${port}`;
    const url = `${baseUrl}/xhr`;
    const win = (globalThis as any).window;
    if (win?.happyDOM?.setURL) {
      win.happyDOM.setURL(baseUrl + '/');
    }
    setCDPEventSender(mockSender);
    setCDPConnectionReady();
    enableNetworkHook();
    mockSender.mockClear();
    const xhr = new (globalThis as any).XMLHttpRequest();
    await new Promise<void>((resolve, reject) => {
      xhr.onload = () => resolve();
      xhr.onerror = () => reject(new Error('XHR error'));
      xhr.open('GET', url);
      xhr.setRequestHeader('X-Custom', 'value');
      xhr.send();
    });
    httpServer.close();
    const requestSent = mockSender.mock.calls.find(
      (c) => JSON.parse(c![2] as string).method === 'Network.requestWillBeSent'
    );
    const loadingFinished = mockSender.mock.calls.find(
      (c) => JSON.parse(c![2] as string).method === 'Network.loadingFinished'
    );
    expect(requestSent).toBeDefined();
    expect(loadingFinished).toBeDefined();
    const params = JSON.parse(requestSent![2] as string).params;
    expect(params.request.url).toBe(url);
    expect(params.request.method).toBe('GET');
    expect(params.request.headers?.['X-Custom']).toBe('value');
    disableNetworkHook();
  });

  test('enableNetworkHook uses defineProperty: XMLHttpRequest replaced and disable restores original / defineProperty로 XHR 교체·복원', () => {
    const origXHR = (globalThis as any).XMLHttpRequest;
    expect(origXHR).toBeDefined();

    setCDPEventSender(mockSender);
    setCDPConnectionReady();
    enableNetworkHook();
    expect((globalThis as any).XMLHttpRequest).not.toBe(origXHR);

    disableNetworkHook();
    expect((globalThis as any).XMLHttpRequest).toBe(origXHR);
  });

  test('enableNetworkHook uses defineProperty: fetch replaced and disable restores original / defineProperty로 fetch 교체·복원', () => {
    const origFetch = (globalThis as any).fetch;
    expect(origFetch).toBeDefined();

    setCDPEventSender(mockSender);
    setCDPConnectionReady();
    enableNetworkHook();
    expect((globalThis as any).fetch).not.toBe(origFetch);

    disableNetworkHook();
    expect((globalThis as any).fetch).toBe(origFetch);
  });

  test('enableNetworkHook is idempotent: second enable leaves same wrapper / 두 번째 enable 시 동일 래퍼 유지', () => {
    setCDPEventSender(mockSender);
    setCDPConnectionReady();
    enableNetworkHook();
    const firstFetch = (globalThis as any).fetch;
    enableNetworkHook();
    expect((globalThis as any).fetch).toBe(firstFetch);
    disableNetworkHook();
  });
});
