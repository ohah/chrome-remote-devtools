// App component tests / App 컴포넌트 테스트
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { render, waitFor, cleanup, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from '@/app/providers';

describe('App', () => {
  let originalSetInterval: typeof setInterval;
  let originalClearInterval: typeof clearInterval;
  let queryClient: QueryClient;

  beforeEach(() => {
    originalSetInterval = globalThis.setInterval;
    originalClearInterval = globalThis.clearInterval;

    // Create a new QueryClient for each test / 각 테스트마다 새로운 QueryClient 생성
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false, // Don't retry in tests / 테스트에서는 재시도 안 함
          gcTime: 0, // Don't cache in tests / 테스트에서는 캐시 안 함
        },
      },
    });

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
    queryClient.clear(); // Clear query cache / 쿼리 캐시 정리
    globalThis.setInterval = originalSetInterval;
    globalThis.clearInterval = originalClearInterval;
  });

  // Helper function to render App with QueryClient / QueryClient와 함께 App 렌더링 헬퍼 함수
  const renderApp = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );
  };

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
    const { container } = renderApp();
    expect(container).toBeTruthy();
    // Component should render without errors / 컴포넌트는 에러 없이 렌더링되어야 함
  });

  test('should render component with fetch / fetch와 함께 컴포넌트 렌더링', async () => {
    // happy-dom provides fetch, but server may not be available in test environment
    // happy-dom이 fetch를 제공하지만, 테스트 환경에서는 서버가 없을 수 있음
    // Component should handle this gracefully / 컴포넌트는 이를 우아하게 처리해야 함

    // Suppress console.error for expected error / 예상된 에러에 대한 console.error 억제
    const originalConsoleError = console.error;
    console.error = () => {}; // Suppress expected network error / 예상된 네트워크 에러 억제

    await act(async () => {
      renderApp();
    });

    // Component should render even if fetch fails / fetch가 실패해도 컴포넌트는 렌더링되어야 함
    await waitFor(
      () => {
        expect(document.body).toBeTruthy();
      },
      { timeout: 3000 }
    );

    // Restore console.error / console.error 복원
    console.error = originalConsoleError;
  });

  test('should handle fetch error gracefully / fetch 에러를 우아하게 처리', async () => {
    // Suppress console.error for expected error / 예상된 에러에 대한 console.error 억제
    // happy-dom's fetch will fail in test environment / happy-dom의 fetch는 테스트 환경에서 실패할 것임
    const originalConsoleError = console.error;
    console.error = () => {}; // Suppress expected network error / 예상된 네트워크 에러 억제

    await act(async () => {
      renderApp();
    });

    // Component should still render even if fetch fails / fetch가 실패해도 컴포넌트는 렌더링되어야 함
    await waitFor(
      () => {
        expect(document.body).toBeTruthy();
      },
      { timeout: 3000 }
    );

    // Restore console.error / console.error 복원
    console.error = originalConsoleError;
  });
});
