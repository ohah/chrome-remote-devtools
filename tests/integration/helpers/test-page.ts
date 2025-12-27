// Test page helpers / 테스트 페이지 헬퍼
import type { Page } from '@playwright/test';

export function createTestPageHTML(content: string, serverUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Test Page</title>
  <script src="${serverUrl}/client.js" data-server-url="${serverUrl}"></script>
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
