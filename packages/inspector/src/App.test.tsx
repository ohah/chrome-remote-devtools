// App component tests / App 컴포넌트 테스트
import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import { render, waitFor, cleanup, act } from '@testing-library/react';
import '@testing-library/jest-dom'; // Add jest-dom matchers / jest-dom matcher 추가
import App from './App';

// Mock fetch API / fetch API 모킹
const mockFetch = mock(() =>
  Promise.resolve({
    json: () => Promise.resolve({ clients: [] }),
    ok: true,
    status: 200,
  } as Response)
);

describe('App', () => {
  let originalFetch: typeof fetch;
  let originalSetInterval: typeof setInterval;
  let originalClearInterval: typeof clearInterval;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    originalSetInterval = globalThis.setInterval;
    originalClearInterval = globalThis.clearInterval;
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    // happy-dom provides window.location, but we need to ensure origin is set for URL constructor
    // happy-dom이 window.location을 제공하지만, URL 생성자를 위해 origin이 설정되어야 함
    if (globalThis.window && globalThis.window.location) {
      // Only set origin if it's not already valid / origin이 유효하지 않은 경우에만 설정
      if (!globalThis.window.location.origin || globalThis.window.location.origin === 'null') {
        Object.defineProperty(globalThis.window.location, 'origin', {
          value: 'http://localhost:5173',
          writable: true,
          configurable: true,
        });
      }
    }
  });

  afterEach(() => {
    cleanup(); // Clean up React Testing Library / React Testing Library 정리
    globalThis.fetch = originalFetch;
    globalThis.setInterval = originalSetInterval;
    globalThis.clearInterval = originalClearInterval;
  });

  test('should export App component / App 컴포넌트를 export해야 함', () => {
    expect(App).toBeDefined();
    expect(typeof App).toBe('function');
  });

  test('should be a valid React component / 유효한 React 컴포넌트여야 함', () => {
    // Basic component structure check / 기본 컴포넌트 구조 확인
    expect(App).toBeTruthy();
  });

  test('should render component / 컴포넌트 렌더링', () => {
    // happy-dom is preloaded via bunfig.toml, so DOM environment is available
    // happy-dom은 bunfig.toml을 통해 preload되므로 DOM 환경이 사용 가능함
    const { container } = render(<App />);
    expect(container).toBeTruthy();
    // Component should render without errors / 컴포넌트는 에러 없이 렌더링되어야 함
  });

  test('should fetch clients list / 클라이언트 목록 가져오기', async () => {
    // Mock fetch to return clients / 클라이언트를 반환하도록 fetch 모킹
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ clients: [{ id: 'client-1', title: 'Test Client' }] }),
      ok: true,
      status: 200,
    } as Response);

    await act(async () => {
      render(<App />);
    });

    // Should call fetch / fetch가 호출되어야 함
    await waitFor(
      () => {
        expect(mockFetch).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );
  });

  test('should handle fetch error / fetch 에러 처리', async () => {
    // Mock fetch to throw error / 에러를 던지도록 fetch 모킹
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    // Suppress console.error for expected error / 예상된 에러에 대한 console.error 억제
    const originalConsoleError = console.error;
    console.error = mock(() => {});

    await act(async () => {
      render(<App />);
    });

    // Should handle error gracefully / 에러를 우아하게 처리해야 함
    // Component should still render even if fetch fails / fetch가 실패해도 컴포넌트는 렌더링되어야 함
    await waitFor(
      () => {
        expect(mockFetch).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    // Restore console.error / console.error 복원
    console.error = originalConsoleError;
  });
});
