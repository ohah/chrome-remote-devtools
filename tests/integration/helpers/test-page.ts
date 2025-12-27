// Test page helpers / 테스트 페이지 헬퍼
import type { Page } from '@playwright/test';

export function createTestPageHTML(content: string, serverUrl: string): string {
  const wsUrl = serverUrl.replace('http://', 'ws://').replace('https://', 'wss://');
  return `<!DOCTYPE html>
<html>
<head>
  <title>Test Page</title>
  <script src="${serverUrl}/client.js"></script>
  <script>
    // Wait for script to load before initializing / 스크립트 로드 후 초기화
    (function() {
      var maxRetries = 100;
      function initClient() {
        if (typeof ChromeRemoteDevTools !== 'undefined') {
          ChromeRemoteDevTools.init({
            serverUrl: '${wsUrl}',
          });
        } else if (maxRetries > 0) {
          maxRetries--;
          setTimeout(initClient, 50);
        } else {
          console.error('ChromeRemoteDevTools failed to load after multiple attempts.');
        }
      }
      // Start initialization / 초기화 시작
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initClient);
      } else {
        initClient();
      }
    })();
  </script>
</head>
<body>
  ${content}
</body>
</html>`;
}

export function createSimpleTestPage(serverUrl: string): string {
  return createTestPageHTML(
    `
    <h1>Test Page</h1>
    <button id="test-button">Click Me</button>
    <script>
      console.log('Page loaded');
      document.getElementById('test-button').addEventListener('click', () => {
        console.log('Button clicked');
      });
    </script>
  `,
    serverUrl
  );
}

/**
 * Wait for debug_id to be stored in sessionStorage / sessionStorage에 debug_id가 저장될 때까지 대기
 * @param page - Playwright page instance / Playwright 페이지 인스턴스
 * @param timeout - Maximum time to wait in milliseconds / 최대 대기 시간 (밀리초)
 * @returns Client ID if found, null otherwise / 찾은 경우 클라이언트 ID, 그렇지 않으면 null
 */
export async function waitForDebugId(page: Page, timeout = 10000): Promise<string | null> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const debugId = await page.evaluate(() => {
      return sessionStorage.getItem('debug_id');
    });
    if (debugId) {
      return debugId;
    }
    await page.waitForTimeout(100);
  }
  return null;
}
