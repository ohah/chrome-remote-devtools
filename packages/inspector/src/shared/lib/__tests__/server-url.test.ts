/**
 * Server URL store tests / 서버 URL store 테스트
 * Covers set/get/reset and invalid URL throw / 설정·조회·리셋 및 잘못된 URL 시 예외
 */
import { describe, test, expect, beforeEach } from 'bun:test';
import { getServerUrl, setServerUrl, resetServerUrl, parseServerUrlToBind } from '../server-url';

describe('server-url', () => {
  beforeEach(() => {
    resetServerUrl();
  });

  test('getServerUrl returns default when nothing set / 미설정 시 기본 URL 반환', () => {
    const url = getServerUrl();
    expect(url).toBe('http://localhost:8080');
  });

  test('setServerUrl and getServerUrl round-trip / 서버 URL 설정 후 조회', () => {
    setServerUrl('http://example.com:9000');
    expect(getServerUrl()).toBe('http://example.com:9000');
  });

  test('setServerUrl throws for invalid URL / 잘못된 URL 시 예외', () => {
    expect(() => setServerUrl('not-a-url')).toThrow('Invalid URL format');
  });

  test('resetServerUrl clears URL / 리셋 시 URL 초기화', () => {
    setServerUrl('http://a.com');
    resetServerUrl();
    expect(getServerUrl()).toBe('http://localhost:8080');
  });

  test('parseServerUrlToBind parses URL to host and port / URL을 host·port로 파싱', () => {
    expect(parseServerUrlToBind('http://localhost:9999')).toEqual({
      host: '0.0.0.0',
      port: 9999,
    });
    expect(parseServerUrlToBind('http://example.com')).toEqual({
      host: '0.0.0.0',
      port: 8080,
    });
    expect(parseServerUrlToBind('invalid')).toEqual({
      host: '0.0.0.0',
      port: 8080,
    });
  });
});
