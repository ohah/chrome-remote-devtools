import { describe, test, expect } from 'bun:test';
import App from './App';

// Test App component / App 컴포넌트 테스트
describe('App', () => {
  test('should export App component', () => {
    expect(App).toBeDefined();
    expect(typeof App).toBe('function');
  });

  test('should be a valid React component', () => {
    // Basic component structure check / 기본 컴포넌트 구조 확인
    expect(App).toBeTruthy();
  });
});

