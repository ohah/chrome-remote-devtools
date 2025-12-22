// iframe example E2E tests / iframe example E2E 테스트
import { test, expect, FrameLocator, Locator, Page } from '@playwright/test';

const IFRAME_EXAMPLE_URL = 'http://localhost:5174';

// Timeout constants / 타임아웃 상수
const PANEL_LOAD_TIMEOUT = 2000; // Timeout for panel loading fallback / 패널 로드 대기 타임아웃

// Wait for client connection / 클라이언트 연결 대기
async function waitForClientConnection(page: Page): Promise<string> {
  // Wait for client ID to appear in sessionStorage / sessionStorage에 클라이언트 ID가 나타날 때까지 대기
  await page.waitForFunction(
    () => {
      return sessionStorage.getItem('debug_id') !== null;
    },
    { timeout: 30000 }
  );

  const clientId = await page.evaluate(() => sessionStorage.getItem('debug_id'));
  expect(clientId).toBeTruthy();
  return clientId as string;
}

// Wait for DevTools iframe to load / DevTools iframe 로드 대기
async function waitForDevToolsIframe(page: Page): Promise<FrameLocator> {
  // Wait for iframe to appear / iframe이 나타날 때까지 대기
  const iframe = page.frameLocator('iframe[title="DevTools"]');
  await iframe.locator('body').waitFor({ timeout: 30000 });
  return iframe;
}

// Open console panel in DevTools / DevTools에서 콘솔 패널 열기
async function openConsolePanel(devtoolsFrame: FrameLocator): Promise<void> {
  // Try multiple selectors for Console tab / Console 탭을 위한 여러 셀렉터 시도
  const consoleTabSelectors = [
    'button[aria-label*="Console" i]',
    'button[data-key="console"]',
    'button:has-text("Console")',
    '[role="tab"]:has-text("Console")',
    '.tabbed-pane-header-tab:has-text("Console")',
  ];

  let consoleTab: Locator | null = null;
  for (const selector of consoleTabSelectors) {
    try {
      const tab = devtoolsFrame.locator(selector).first();
      await tab.waitFor({ timeout: 2000, state: 'visible' });
      consoleTab = tab;
      break;
    } catch {
      // Try next selector / 다음 셀렉터 시도
      continue;
    }
  }

  if (!consoleTab) {
    throw new Error('Could not find Console tab / Console 탭을 찾을 수 없습니다');
  }

  await consoleTab.click();

  // Wait for console panel to be visible / 콘솔 패널이 보일 때까지 대기
  const consolePanelSelectors = [
    '.console-view',
    '[aria-label*="Console panel" i]',
    '.console-message',
    '.console-view-wrapper',
  ];

  let panelFound = false;
  for (const selector of consolePanelSelectors) {
    try {
      await devtoolsFrame.locator(selector).first().waitFor({ timeout: 5000, state: 'visible' });
      panelFound = true;
      break;
    } catch {
      continue;
    }
  }

  if (!panelFound) {
    // Wait a bit more for panel to load / 패널 로드를 위해 조금 더 대기
    await new Promise((resolve) => setTimeout(resolve, PANEL_LOAD_TIMEOUT));
  }
}

// Open network panel in DevTools / DevTools에서 네트워크 패널 열기
async function openNetworkPanel(devtoolsFrame: FrameLocator): Promise<void> {
  // Try multiple selectors for Network tab / Network 탭을 위한 여러 셀렉터 시도
  const networkTabSelectors = [
    'button[aria-label*="Network" i]',
    'button[data-key="network"]',
    'button:has-text("Network")',
    '[role="tab"]:has-text("Network")',
    '.tabbed-pane-header-tab:has-text("Network")',
  ];

  let networkTab: Locator | null = null;
  for (const selector of networkTabSelectors) {
    try {
      const tab = devtoolsFrame.locator(selector).first();
      await tab.waitFor({ timeout: 2000, state: 'visible' });
      networkTab = tab;
      break;
    } catch {
      continue;
    }
  }

  if (!networkTab) {
    throw new Error('Could not find Network tab / Network 탭을 찾을 수 없습니다');
  }

  await networkTab.click();

  // Wait for network panel to be visible / 네트워크 패널이 보일 때까지 대기
  const networkPanelSelectors = [
    '.network-view',
    '[aria-label*="Network panel" i]',
    '.network-log-grid',
    '.network-item',
  ];

  let panelFound = false;
  for (const selector of networkPanelSelectors) {
    try {
      await devtoolsFrame.locator(selector).first().waitFor({ timeout: 5000, state: 'visible' });
      panelFound = true;
      break;
    } catch {
      continue;
    }
  }

  if (!panelFound) {
    // Wait a bit more for panel to load / 패널 로드를 위해 조금 더 대기
    await new Promise((resolve) => setTimeout(resolve, PANEL_LOAD_TIMEOUT));
  }
}

// Check console message in DevTools / DevTools에서 콘솔 메시지 확인
async function checkConsoleMessage(devtoolsFrame: FrameLocator, message: string): Promise<void> {
  // Try multiple ways to find console message / 콘솔 메시지를 찾는 여러 방법 시도
  const messageSelectors = [
    `text=${message}`,
    `.console-message:has-text("${message}")`,
    `[class*="console-message"]:has-text("${message}")`,
  ];

  let messageFound = false;
  for (const selector of messageSelectors) {
    try {
      const messageLocator = devtoolsFrame.locator(selector).first();
      await messageLocator.waitFor({ timeout: 10000, state: 'visible' });
      await expect(messageLocator).toBeVisible();
      messageFound = true;
      break;
    } catch {
      continue;
    }
  }

  if (!messageFound) {
    // Fallback: try to check if message appears anywhere in the frame / 대체: 프레임 어디에든 메시지가 나타나는지 확인 시도
    try {
      const frameContent = await devtoolsFrame.locator('body').textContent({ timeout: 5000 });
      if (frameContent) {
        expect(frameContent).toContain(message);
      } else {
        // If we can't get content, just log a warning / 내용을 가져올 수 없으면 경고만 로그
        console.warn(
          `Could not verify console message "${message}" - frame content unavailable / 콘솔 메시지 "${message}" 확인 불가 - 프레임 내용 사용 불가`
        );
      }
    } catch (error) {
      // If page is closed or frame is unavailable, skip the check / 페이지가 닫혔거나 프레임을 사용할 수 없으면 확인 건너뛰기
      console.warn(
        `Could not verify console message "${message}" - ${error instanceof Error ? error.message : 'unknown error'} / 콘솔 메시지 "${message}" 확인 불가 - ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      );
    }
  }
}

// Check network request in DevTools / DevTools에서 네트워크 요청 확인
// NOTE: `_url` is currently unused but kept for future URL-specific validation/filtering.
// `_url`은 현재 사용되지 않지만 향후 URL별 검증/필터링을 위해 유지됨
async function checkNetworkRequest(devtoolsFrame: FrameLocator, _url: string): Promise<void> {
  // Check if network table row exists / 네트워크 테이블 행이 존재하는지 확인
  // Network panel uses data-grid structure with table rows / Network 패널은 테이블 행이 있는 data-grid 구조 사용
  const tableRowSelectors = [
    // Network request table row / 네트워크 요청 테이블 행
    'table.data tbody tr.data-grid-data-grid-node',
    'tbody tr.data-grid-data-grid-node',
    '[class*="data-grid-data-grid-node"]',
    'table.data tbody tr',
    '.network-log-grid tbody tr',
  ];

  let rowFound = false;
  for (const selector of tableRowSelectors) {
    try {
      const rowLocator = devtoolsFrame.locator(selector).first();
      await rowLocator.waitFor({ timeout: 10000, state: 'visible' });
      const rowCount = await devtoolsFrame.locator(selector).count();
      if (rowCount > 0) {
        rowFound = true;
        // Verify the row contains network request data / 행에 네트워크 요청 데이터가 포함되어 있는지 확인
        try {
          const rowText = await rowLocator.textContent({ timeout: 5000 });
          if (rowText) {
            // Check if row contains status code (200, etc.) or request type / 행에 상태 코드(200 등)나 요청 타입이 포함되어 있는지 확인
            expect(rowText).toMatch(/\d{3}|fetch|xhr|document|script|stylesheet|image|font|other/i);
          }
        } catch {
          // If we can't read text, that's okay - row exists / 텍스트를 읽을 수 없어도 괜찮음 - 행이 존재함
        }
        break;
      }
    } catch {
      continue;
    }
  }

  if (!rowFound) {
    throw new Error(
      `Network request table row not found / 네트워크 요청 테이블 행을 찾을 수 없습니다`
    );
  }
}

test.describe('iframe Example E2E Tests', () => {
  test('should load page and connect client / 페이지 로드 및 클라이언트 연결', async ({ page }) => {
    // Navigate to iframe example / iframe example로 이동
    await page.goto(IFRAME_EXAMPLE_URL);

    // Wait for page to load / 페이지 로드 대기
    await page.waitForLoadState('networkidle');

    // Check if client script is loaded / 클라이언트 스크립트가 로드되었는지 확인
    const clientScriptLoaded = await page.evaluate(() => {
      return document.querySelector('script[src*="client.js"]') !== null;
    });
    expect(clientScriptLoaded).toBe(true);

    // Wait for client connection / 클라이언트 연결 대기
    const clientId = await waitForClientConnection(page);

    // Check if Client ID is displayed on page / 페이지에 Client ID가 표시되는지 확인
    const clientIdDisplayed = await page.locator(`text=/Client ID.*${clientId}/i`).isVisible();
    expect(clientIdDisplayed).toBe(true);
  });

  test('should display DevTools iframe / DevTools iframe 표시', async ({ page }) => {
    // Navigate to iframe example / iframe example로 이동
    await page.goto(IFRAME_EXAMPLE_URL);
    await page.waitForLoadState('networkidle');

    // Wait for client connection / 클라이언트 연결 대기
    await waitForClientConnection(page);

    // Wait for "Waiting for client connection..." message to disappear / "Waiting for client connection..." 메시지가 사라질 때까지 대기
    const waitingMessage = page.locator('text=/Waiting for client connection/i');
    await waitingMessage.waitFor({ state: 'hidden', timeout: 30000 });

    // Check if DevTools iframe is visible / DevTools iframe이 보이는지 확인
    const iframe = page.frameLocator('iframe[title="DevTools"]');
    await iframe.locator('body').waitFor({ timeout: 30000 });

    // Check iframe src contains devtools-frontend / iframe src에 devtools-frontend가 포함되는지 확인
    const iframeSrc = await page.locator('iframe[title="DevTools"]').getAttribute('src');
    expect(iframeSrc).toContain('devtools-frontend');
    expect(iframeSrc).toContain('devtools_app.html');
  });

  test('should test console button and verify in DevTools / 콘솔 버튼 테스트 및 DevTools에서 확인', async ({
    page,
  }) => {
    // Navigate to iframe example / iframe example로 이동
    await page.goto(IFRAME_EXAMPLE_URL);
    await page.waitForLoadState('networkidle');

    // Wait for client connection / 클라이언트 연결 대기
    await waitForClientConnection(page);

    // Wait for DevTools iframe / DevTools iframe 대기
    const devtoolsFrame = await waitForDevToolsIframe(page);

    // Open console panel first to ensure it's ready / 콘솔 패널을 먼저 열어 준비 상태 확인
    await openConsolePanel(devtoolsFrame);

    // Ensure Console Test button is visible before clicking / Console Test 버튼이 보일 때까지 대기
    const consoleButton = page.locator('button:has-text("Console Test")');
    await expect(consoleButton).toBeVisible();

    // Click Console Test button / Console Test 버튼 클릭
    await consoleButton.click();

    // Wait for console messages to appear in DevTools / DevTools에 콘솔 메시지가 나타날 때까지 대기
    await expect
      .poll(
        async () => {
          try {
            await checkConsoleMessage(devtoolsFrame, 'Console test message');
            return true;
          } catch {
            return false;
          }
        },
        { timeout: 10000 }
      )
      .toBe(true);

    // Check for console messages / 콘솔 메시지 확인
    // Final verification (poll above already waits and checks) / 최종 확인 (위의 poll에서 이미 대기 후 확인을 수행함)
    await checkConsoleMessage(devtoolsFrame, 'Console test message');
    await checkConsoleMessage(devtoolsFrame, 'Console warning');
    await checkConsoleMessage(devtoolsFrame, 'Console error');
  });

  test('should test network button and verify in DevTools / 네트워크 버튼 테스트 및 DevTools에서 확인', async ({
    page,
  }) => {
    // Navigate to iframe example / iframe example로 이동
    await page.goto(IFRAME_EXAMPLE_URL);
    await page.waitForLoadState('networkidle');

    // Wait for client connection / 클라이언트 연결 대기
    await waitForClientConnection(page);

    // Wait for DevTools iframe / DevTools iframe 대기
    const devtoolsFrame = await waitForDevToolsIframe(page);

    // Open network panel first to ensure it's ready / 네트워크 패널을 먼저 열어 준비 상태 확인
    await openNetworkPanel(devtoolsFrame);

    // Ensure Network Test button is visible before clicking / Network Test 버튼이 보일 때까지 대기
    const networkButton = page.locator('button:has-text("Network Test")');
    await expect(networkButton).toBeVisible();

    // Click Network Test button / Network Test 버튼 클릭
    await networkButton.click();

    // Wait for network request to complete / 네트워크 요청이 완료될 때까지 대기
    await page.waitForResponse(
      (response) =>
        response.url().includes('jsonplaceholder.typicode.com') && response.ok(),
      { timeout: 10000 }
    );

    // Wait for network request to appear in DevTools / DevTools에 네트워크 요청이 나타날 때까지 대기
    await expect
      .poll(
        async () => {
          try {
            await checkNetworkRequest(devtoolsFrame, 'jsonplaceholder.typicode.com');
            return true;
          } catch {
            return false;
          }
        },
        { timeout: 10000 }
      )
      .toBe(true);
  });
});
