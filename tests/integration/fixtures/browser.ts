// Browser fixture for tests / 테스트용 브라우저 픽스처
import { test as base, Page } from '@playwright/test';

interface BrowserFixture {
  loadClientScript: (page: Page, serverUrl: string) => Promise<void>;
}

export const test = base.extend<BrowserFixture>({
  loadClientScript: async ({ page }, use) => {
    await use(async (page, serverUrl: string) => {
      // Load client script and initialize / 클라이언트 스크립트 로드 및 초기화
      const wsUrl = serverUrl.replace('http://', 'ws://').replace('https://', 'wss://');
      await page.addInitScript(
        (url: string, wsUrl: string) => {
          // This will be executed before page loads / 페이지 로드 전에 실행됨
          const script = document.createElement('script');
          script.src = `${url}/client.js`; // Client script URL / 클라이언트 스크립트 URL
          script.onload = () => {
            // Initialize client after script loads / 스크립트 로드 후 클라이언트 초기화
            if (typeof (window as any).ChromeRemoteDevTools !== 'undefined') {
              (window as any).ChromeRemoteDevTools.init({
                serverUrl: wsUrl,
              });
            }
          };
          document.head.appendChild(script);
        },
        serverUrl,
        wsUrl
      );
    });
  },
});

export { expect } from '@playwright/test';
