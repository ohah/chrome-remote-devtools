import { describe, test, expect } from 'bun:test';
import { initCDPClient } from './index';

// Test CDP Client initialization / CDP 클라이언트 초기화 테스트
describe('initCDPClient', () => {
  test('should be a function', () => {
    expect(typeof initCDPClient).toBe('function');
  });
  
});
