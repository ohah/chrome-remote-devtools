/**
 * DevTools URL builder tests / DevTools URL 빌더 테스트
 * Sets window origin so new URL(path, base) works in happy-dom / happy-dom에서 new URL(base) 동작하도록 origin 설정
 */
import { describe, test, expect, beforeEach } from 'bun:test';
import { buildDevToolsUrl, buildDevToolsReplayUrl } from '../devtools-url';

describe('devtools-url', () => {
  beforeEach(() => {
    const win = (globalThis as any).window;
    if (win?.happyDOM?.setURL) {
      win.happyDOM.setURL('http://localhost:3000/');
    }
  });

  test('buildDevToolsUrl builds URL with default server when only clientId / clientId만 주어져도 기본 서버로 URL 생성', () => {
    const url = buildDevToolsUrl({ clientId: 'c1' });
    expect(url).toContain('/devtools-frontend/');
    expect(url).toContain('ws=');
  });

  test('buildDevToolsUrl builds URL when serverUrl option provided / serverUrl 옵션 시 URL 생성', () => {
    const url = buildDevToolsUrl({
      clientId: 'client-1',
      serverUrl: 'http://localhost:8080',
    });
    expect(url).toContain('/devtools-frontend/');
    expect(url).toContain('ws=');
    expect(url).toContain('client-1');
  });

  test('buildDevToolsUrl appends clientType when provided / clientType 옵션 시 쿼리 추가', () => {
    const url = buildDevToolsUrl({
      clientId: 'c2',
      serverUrl: 'https://host:8443',
      clientType: 'react-native',
    });
    expect(url).toContain('clientType=react-native');
  });

  test('buildDevToolsReplayUrl returns replay URL with postMessage / replay URL 반환', () => {
    const url = buildDevToolsReplayUrl();
    expect(url).toContain('/devtools-frontend/');
    expect(url).toContain('replay=true');
    expect(url).toContain('postMessage=true');
  });
});
