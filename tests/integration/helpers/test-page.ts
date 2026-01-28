// Test page helpers / 테스트 페이지 헬퍼
import type { Page } from '@playwright/test';

export function createTestPageHTML(content: string, serverUrl: string): string {
  const wsUrl = serverUrl.replace('http://', 'ws://').replace('https://', 'wss://');
  return `<!DOCTYPE html>
<html>
<head>
  <title>Test Page</title>
  <script src="${serverUrl}/client.js" 
    onload="window.__clientScriptLoaded = true; console.log('[test-page] client.js loaded');"
    onerror="console.error('[test-page] Failed to load client.js from:', '${serverUrl}/client.js');"></script>
  <script>
    // Wait for script to load before initializing / 스크립트 로드 후 초기화
    (function() {
      var maxRetries = 200; // Increase retries for slower environments / 느린 환경을 위해 재시도 증가
      var retryCount = 0;
      function initClient() {
        retryCount++;
        // Check if script is loaded and ChromeRemoteDevTools is available / 스크립트가 로드되었고 ChromeRemoteDevTools가 사용 가능한지 확인
        var scriptLoaded = window.__clientScriptLoaded || document.readyState === 'complete';
        var chromeRemoteDevToolsExists = typeof ChromeRemoteDevTools !== 'undefined';
        var chromeRemoteDevToolsInitExists = chromeRemoteDevToolsExists && ChromeRemoteDevTools && typeof ChromeRemoteDevTools.init === 'function';
        
        if (scriptLoaded && chromeRemoteDevToolsInitExists) {
          console.log('[test-page] Initializing ChromeRemoteDevTools with serverUrl:', '${wsUrl}');
          // Call init and handle errors / init 호출 및 오류 처리
          ChromeRemoteDevTools.init({
            serverUrl: '${wsUrl}',
          }).then(function() {
            console.log('[test-page] ChromeRemoteDevTools.init() completed successfully');
            // Check if debug_id was stored / debug_id가 저장되었는지 확인
            setTimeout(function() {
              var debugId = sessionStorage.getItem('debug_id');
              console.log('[test-page] debug_id in sessionStorage:', debugId ? 'found: ' + debugId : 'not found');
            }, 100);
          }).catch(function(error) {
            console.error('[test-page] Failed to initialize ChromeRemoteDevTools:', error);
          });
        } else if (maxRetries > 0) {
          if (retryCount % 20 === 0) {
            console.log('[test-page] Waiting for ChromeRemoteDevTools... (retry ' + retryCount + '/' + maxRetries + 
              ', scriptLoaded: ' + scriptLoaded + 
              ', ChromeRemoteDevTools: ' + (chromeRemoteDevToolsExists ? 'exists' : 'undefined') +
              ', init: ' + (chromeRemoteDevToolsInitExists ? 'exists' : 'missing') + ')');
          }
          maxRetries--;
          setTimeout(initClient, 50);
        } else {
          console.error('[test-page] ChromeRemoteDevTools failed to load after multiple attempts. ' +
            'Script loaded: ' + scriptLoaded + ', ' +
            'ChromeRemoteDevTools: ' + typeof ChromeRemoteDevTools + ', ' +
            'init function: ' + (chromeRemoteDevToolsInitExists ? 'exists' : 'missing'));
        }
      }
      // Start initialization / 초기화 시작
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initClient);
      } else {
        // If document is already loaded, wait a bit for script to load / 문서가 이미 로드된 경우 스크립트 로드를 위해 잠시 대기
        setTimeout(initClient, 100);
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
