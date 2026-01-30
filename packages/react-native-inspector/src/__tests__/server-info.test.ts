/**
 * Server info tests / 서버 정보 유틸 테스트
 * Covers setServerInfo, getServerInfo / 서버 정보 저장·조회
 */
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { setServerInfo, getServerInfo } from '../server-info';

describe('server-info', () => {
  beforeEach(() => {
    (global as any).__ChromeRemoteDevToolsServerHost = undefined;
    (global as any).__ChromeRemoteDevToolsServerPort = undefined;
  });

  afterEach(() => {
    (global as any).__ChromeRemoteDevToolsServerHost = undefined;
    (global as any).__ChromeRemoteDevToolsServerPort = undefined;
  });

  test('getServerInfo returns null when not set / 미설정 시 null', () => {
    expect(getServerInfo()).toBeNull();
  });

  test('setServerInfo and getServerInfo round-trip / 설정 후 조회', () => {
    setServerInfo('localhost', 8080);
    const info = getServerInfo();
    expect(info).not.toBeNull();
    expect(info!.host).toBe('localhost');
    expect(info!.port).toBe(8080);
  });

  test('getServerInfo returns null when only host set / host만 설정 시 null', () => {
    (global as any).__ChromeRemoteDevToolsServerHost = 'example.com';
    expect(getServerInfo()).toBeNull();
  });

  test('getServerInfo returns null when only port set / port만 설정 시 null', () => {
    (global as any).__ChromeRemoteDevToolsServerPort = 9090;
    expect(getServerInfo()).toBeNull();
  });

  test('setServerInfo overwrites previous value / 재설정 시 덮어씀', () => {
    setServerInfo('host1', 1111);
    setServerInfo('host2', 2222);
    const info = getServerInfo();
    expect(info!.host).toBe('host2');
    expect(info!.port).toBe(2222);
  });
});
