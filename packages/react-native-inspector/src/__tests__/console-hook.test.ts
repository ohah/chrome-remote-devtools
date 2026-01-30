/**
 * Console hook tests / 콘솔 훅 테스트
 * Covers CDP sender, connection ready, enable/disable, and Runtime.consoleAPICalled dispatch / CDP 전송·연결 준비·활성화/비활성화·Runtime.consoleAPICalled 전송
 */
import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import {
  setConsoleCDPSender,
  setConsoleConnectionReady,
  enableConsoleHook,
  disableConsoleHook,
  isConsoleHookEnabled,
} from '../console/console-hook';

describe('console-hook', () => {
  let mockSender: ReturnType<typeof mock>;

  beforeEach(() => {
    mockSender = mock(() => {});
    (globalThis as any).__ChromeRemoteDevToolsServerHost = 'localhost';
    (globalThis as any).__ChromeRemoteDevToolsServerPort = 8080;
  });

  afterEach(() => {
    disableConsoleHook();
    setConsoleCDPSender(null as any);
    (globalThis as any).__ChromeRemoteDevToolsServerHost = undefined;
    (globalThis as any).__ChromeRemoteDevToolsServerPort = undefined;
  });

  test('isConsoleHookEnabled is false when not enabled / 비활성화 시 false', () => {
    expect(isConsoleHookEnabled()).toBe(false);
  });

  test('enableConsoleHook installs hooks and isConsoleHookEnabled is true / 활성화 시 훅 설치 및 true', () => {
    setConsoleCDPSender(mockSender);
    setConsoleConnectionReady();
    const ok = enableConsoleHook();
    expect(ok).toBe(true);
    expect(isConsoleHookEnabled()).toBe(true);
  });

  test('disableConsoleHook restores originals and isConsoleHookEnabled is false / 비활성화 시 원본 복원 및 false', () => {
    setConsoleCDPSender(mockSender);
    setConsoleConnectionReady();
    enableConsoleHook();
    const ok = disableConsoleHook();
    expect(ok).toBe(true);
    expect(isConsoleHookEnabled()).toBe(false);
  });

  test('when sender and connection ready, console.log sends Runtime.consoleAPICalled / sender·연결 준비 시 console.log가 Runtime.consoleAPICalled 전송', () => {
    setConsoleCDPSender(mockSender);
    setConsoleConnectionReady();
    enableConsoleHook();
    mockSender.mockClear();
    console.log('hello');
    expect(mockSender).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(mockSender.mock.calls[0]![2] as string);
    expect(payload.method).toBe('Runtime.consoleAPICalled');
    expect(payload.params.type).toBe('log');
    expect(payload.params.args).toHaveLength(1);
    expect(payload.params.args[0]).toEqual({ type: 'string', value: 'hello' });
  });

  test('when sender is null, console.log does not send CDP / sender가 null이면 CDP 미전송', () => {
    setConsoleCDPSender(null as any);
    setConsoleConnectionReady();
    enableConsoleHook();
    mockSender.mockClear();
    console.log('nope');
    expect(mockSender).not.toHaveBeenCalled();
  });

  test('when server info not set, console.log does not send CDP / 서버 정보 미설정 시 CDP 미전송', () => {
    (globalThis as any).__ChromeRemoteDevToolsServerHost = undefined;
    (globalThis as any).__ChromeRemoteDevToolsServerPort = undefined;
    setConsoleCDPSender(mockSender);
    setConsoleConnectionReady();
    enableConsoleHook();
    mockSender.mockClear();
    console.log('nope');
    expect(mockSender).not.toHaveBeenCalled();
  });

  test('console.warn sends type warning / console.warn은 type warning 전송', () => {
    setConsoleCDPSender(mockSender);
    setConsoleConnectionReady();
    enableConsoleHook();
    mockSender.mockClear();
    console.warn('warn');
    const payload = JSON.parse(mockSender.mock.calls[0]![2] as string);
    expect(payload.params.type).toBe('warning');
  });

  test('console.error sends type error / console.error는 type error 전송', () => {
    setConsoleCDPSender(mockSender);
    setConsoleConnectionReady();
    enableConsoleHook();
    mockSender.mockClear();
    console.error('err');
    const payload = JSON.parse(mockSender.mock.calls[0]![2] as string);
    expect(payload.params.type).toBe('error');
  });
});
