/**
 * Server URL store tests / 서버 URL store 테스트
 * Covers set/get/reset and invalid URL throw / 설정·조회·리셋 및 잘못된 URL 시 예외
 */
import { describe, test, expect, beforeEach } from 'bun:test';
import {
  getServerUrl,
  setNormalServerUrl,
  setReactotronServerUrl,
  setReactotronMode,
  resetNormalServerUrl,
  resetReactotronServerUrl,
  setServerUrl,
  resetServerUrl,
} from '../server-url';

describe('server-url', () => {
  beforeEach(() => {
    resetNormalServerUrl();
    resetReactotronServerUrl();
    setReactotronMode(false);
  });

  test('getServerUrl returns default when nothing set / 미설정 시 기본 URL 반환', () => {
    const url = getServerUrl();
    expect(url).toBe('http://localhost:8080');
  });

  test('setNormalServerUrl and getServerUrl round-trip / 일반 서버 URL 설정 후 조회', () => {
    setNormalServerUrl('http://example.com:9000');
    expect(getServerUrl()).toBe('http://example.com:9000');
  });

  test('setNormalServerUrl throws for invalid URL / 잘못된 URL 시 예외', () => {
    expect(() => setNormalServerUrl('not-a-url')).toThrow('Invalid URL format');
  });

  test('setReactotronServerUrl and getServerUrl when Reactotron mode / Reactotron 모드 시 Reactotron URL', () => {
    setReactotronMode(true);
    setReactotronServerUrl('http://localhost:9090');
    expect(getServerUrl()).toBe('http://localhost:9090');
  });

  test('setReactotronServerUrl throws for invalid URL / Reactotron URL 잘못된 형식 시 예외', () => {
    expect(() => setReactotronServerUrl('invalid')).toThrow('Invalid URL format');
  });

  test('resetNormalServerUrl clears normal URL / 리셋 시 일반 URL 초기화', () => {
    setNormalServerUrl('http://a.com');
    resetNormalServerUrl();
    expect(getServerUrl()).toBe('http://localhost:8080');
  });

  test('resetReactotronServerUrl clears Reactotron URL / Reactotron URL 리셋', () => {
    setReactotronMode(true);
    setReactotronServerUrl('http://localhost:9090');
    resetReactotronServerUrl();
    expect(getServerUrl()).toBe('http://localhost:9090');
  });

  test('setServerUrl sets normal URL (backward compat) / setServerUrl은 일반 URL 설정', () => {
    setServerUrl('http://legacy.com');
    expect(getServerUrl()).toBe('http://legacy.com');
  });

  test('resetServerUrl resets normal URL (backward compat) / resetServerUrl은 일반 URL 리셋', () => {
    setServerUrl('http://legacy.com');
    resetServerUrl();
    expect(getServerUrl()).toBe('http://localhost:8080');
  });
});
