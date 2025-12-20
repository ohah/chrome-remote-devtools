import { describe, test, expect, beforeEach } from 'bun:test';
import { initCDPClient } from './index';

// Test CDP Client initialization / CDP 클라이언트 초기화 테스트
describe('initCDPClient', () => {
  // Mock browser globals for Node.js test environment / Node.js 테스트 환경을 위한 브라우저 전역 객체 모킹
  beforeEach(() => {
    // Mock location / location 모킹
    if (typeof (globalThis as unknown as { location?: unknown }).location === 'undefined') {
      Object.defineProperty(globalThis, 'location', {
        value: {
          href: 'http://localhost:3000',
          origin: 'http://localhost:3000',
          protocol: 'http:',
          host: 'localhost:3000',
          hostname: 'localhost',
          port: '3000',
          pathname: '/',
          search: '',
          hash: '',
        },
        writable: true,
        configurable: true,
      });
    }
  });

  test('should be a function', () => {
    expect(typeof initCDPClient).toBe('function');
  });

  test('should accept serverUrl parameter', () => {
    const serverUrl = 'ws://localhost:8080';
    expect(() => initCDPClient(serverUrl)).not.toThrow();
  });
});
