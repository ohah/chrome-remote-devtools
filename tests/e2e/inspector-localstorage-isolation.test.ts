// Inspector localStorage isolation E2E tests / Inspector localStorage 격리 E2E 테스트
import { test, expect, Page, TestInfo } from '@playwright/test';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const INSPECTOR_URL = 'http://localhost:3420';
const TEST_SERVER_PORT = 8080; // Use default port to match Inspector app default / Inspector 앱 기본값과 일치하도록 기본 포트 사용
const TEST_SERVER_URL = `http://localhost:${TEST_SERVER_PORT}`;

// Mock WebSocket server for testing / 테스트용 Mock WebSocket 서버
let mockServer: ReturnType<typeof createServer> | null = null;
let wss: WebSocketServer | null = null;

// Start mock server with dummy clients / 더미 클라이언트가 있는 Mock 서버 시작
async function startMockServer(): Promise<void> {
  return new Promise((resolve) => {
    mockServer = createServer((req, res) => {
      const url = new URL(req.url || '/', `http://${req.headers.host}`);

      // CORS headers / CORS 헤더
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      // Return dummy clients (web and react-native) / 더미 클라이언트 반환 (web 및 react-native)
      if (url.pathname === '/json/clients') {
        const dummyClients = [
          {
            id: 'test-client-web-1',
            type: 'web' as const,
            url: 'http://example.com/page1',
            title: 'Test Web Page 1',
          },
          {
            id: 'test-client-web-2',
            type: 'web' as const,
            url: 'http://example.com/page2',
            title: 'Test Web Page 2',
          },
          {
            id: 'test-client-rn-1',
            type: 'react-native' as const,
            deviceName: 'iPhone 15 Pro',
            appName: 'TestApp',
            deviceId: 'device-rn-1',
          },
          {
            id: 'test-client-rn-2',
            type: 'react-native' as const,
            deviceName: 'Android Emulator',
            appName: 'TestApp',
            deviceId: 'device-rn-2',
          },
        ];

        console.log(`[Mock Server] Returning ${dummyClients.length} clients`);
        res.writeHead(200);
        res.end(JSON.stringify({ clients: dummyClients }));
        return;
      }

      // WebSocket upgrade handler / WebSocket 업그레이드 핸들러
      if (req.url?.includes('/remote/debug/devtools/')) {
        wss?.handleUpgrade(req, res as any, Buffer.alloc(0), (ws) => {
          // Mock DevTools WebSocket connection / Mock DevTools WebSocket 연결
          ws.on('message', (_data) => {
            // Echo back or handle messages as needed / 필요에 따라 메시지 에코 또는 처리
          });
        });
        return;
      }

      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not Found' }));
    });

    wss = new WebSocketServer({ noServer: true });

    mockServer.on('upgrade', (request, socket, head) => {
      if (request.url?.includes('/remote/debug/devtools/')) {
        wss?.handleUpgrade(request, socket, head, (ws) => {
          // Mock DevTools WebSocket connection / Mock DevTools WebSocket 연결
          ws.on('message', (_data) => {
            // Handle messages as needed / 필요에 따라 메시지 처리
          });
        });
      }
    });

    mockServer.listen(TEST_SERVER_PORT, () => {
      resolve();
    });
  });
}

// Stop mock server / Mock 서버 중지
async function stopMockServer(): Promise<void> {
  return new Promise((resolve) => {
    if (wss) {
      wss.close(() => {
        if (mockServer) {
          mockServer.close(() => {
            resolve();
          });
        } else {
          resolve();
        }
      });
    } else if (mockServer) {
      mockServer.close(() => {
        resolve();
      });
    } else {
      resolve();
    }
  });
}

// Wait for DevTools iframe to load / DevTools iframe 로드 대기
async function waitForDevToolsIframe(page: Page, clientId: string): Promise<void> {
  // Map client IDs to expected tab labels / 클라이언트 ID를 예상 탭 라벨로 매핑
  const clientLabelMap: Record<string, string> = {
    'test-client-web-1': 'http://example.com/page1',
    'test-client-web-2': 'http://example.com/page2',
    'test-client-rn-1': 'iPhone 15 Pro',
    'test-client-rn-2': 'Android Emulator',
  };

  const expectedLabel = clientLabelMap[clientId];

  // Use more specific selector based on tab label / 탭 라벨을 기반으로 더 구체적인 셀렉터 사용
  const iframeSelector = expectedLabel
    ? `iframe[title="DevTools - ${expectedLabel}"]`
    : `iframe[title*="${clientId}"]`;

  // Try multiple selectors for iframe / iframe을 위한 여러 셀렉터 시도
  const iframeSelectors = [iframeSelector, `iframe[title*="${clientId}"]`, 'iframe'];

  let iframeFound = false;
  for (const selector of iframeSelectors) {
    try {
      await page.waitForSelector(selector, { timeout: 10000, state: 'attached' });
      iframeFound = true;
      break;
    } catch {
      continue;
    }
  }

  if (!iframeFound) {
    // Debug: log page content / 디버그: 페이지 내용 로그
    const bodyText = await page.locator('body').textContent();
    console.log('Page body content:', bodyText?.substring(0, 500));
    throw new Error(`Iframe not found for client ${clientId}`);
  }

  // Wait for iframe content to load / iframe 내용이 로드될 때까지 대기
  const iframe = page.frameLocator(iframeSelector).first();
  await iframe.locator('body').waitFor({ timeout: 30000 });
}

// Verify DevTools UI is rendered correctly after tab switch / 탭 전환 후 DevTools UI가 올바르게 렌더링되었는지 확인
async function verifyDevToolsUIAfterTabSwitch(page: Page, clientId: string): Promise<void> {
  // Wait for iframe to load / iframe 로드 대기
  // waitForDevToolsIframe already waits for body, so no additional check needed
  // / waitForDevToolsIframe이 이미 body를 기다리므로 추가 확인 불필요
  await waitForDevToolsIframe(page, clientId);
}

// Navigate to client DevTools tab by clicking tab / 탭을 클릭하여 클라이언트 DevTools 탭으로 이동
async function navigateToClientTab(page: Page, clientId: string): Promise<void> {
  const expectedUrl = `${INSPECTOR_URL}/devtools/${clientId}`;

  // Wait for tabs to be visible / 탭이 보일 때까지 대기
  await page.waitForSelector('[role="tab"]', { timeout: 30000 });

  // Get all tabs / 모든 탭 가져오기
  const tabs = page.locator('[role="tab"]');
  const tabCount = await tabs.count();

  console.log(`[Test] Found ${tabCount} tabs, looking for client: ${clientId}`);
  console.log(`[Test] Current URL: ${page.url()}`);

  // Map client IDs to expected tab labels / 클라이언트 ID를 예상 탭 라벨로 매핑
  const clientLabelMap: Record<string, string> = {
    'test-client-web-1': 'http://example.com/page1',
    'test-client-web-2': 'http://example.com/page2',
    'test-client-rn-1': 'iPhone 15 Pro',
    'test-client-rn-2': 'Android Emulator',
  };

  const expectedLabel = clientLabelMap[clientId];

  // Find the correct tab / 올바른 탭 찾기
  let targetTab: ReturnType<typeof page.locator> | null = null;
  for (let i = 0; i < tabCount; i++) {
    const tab = tabs.nth(i);
    const tabText = await tab.textContent();
    const isActive = (await tab.getAttribute('aria-selected')) === 'true';

    console.log(`[Test] Tab ${i}: text="${tabText}", active=${isActive}`);

    // Check if tab text matches expected label / 탭 텍스트가 예상 라벨과 일치하는지 확인
    if (expectedLabel && tabText?.includes(expectedLabel)) {
      console.log(`[Test] Found matching tab by label: ${tabText}`);
      targetTab = tab;
      break;
    }

    // Fallback: check if tab text contains client ID / 대체: 탭 텍스트에 클라이언트 ID가 포함되어 있는지 확인
    if (tabText?.includes(clientId)) {
      console.log(`[Test] Found matching tab by client ID: ${tabText}`);
      targetTab = tab;
      break;
    }
  }

  if (targetTab) {
    // Check if tab is already active / 탭이 이미 활성화되어 있는지 확인
    const isActive = (await targetTab.getAttribute('aria-selected')) === 'true';

    if (!isActive) {
      console.log(`[Test] Clicking tab to navigate to /devtools/${clientId}`);

      // Click tab and wait for navigation / 탭 클릭 후 네비게이션 대기
      await Promise.all([
        page.waitForURL(
          new RegExp(`/devtools/${clientId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
          { timeout: 10000 }
        ),
        targetTab.click(),
      ]);

      console.log(`[Test] Successfully navigated to /devtools/${clientId}`);
    } else {
      console.log(`[Test] Tab is already active, verifying URL`);
      // Verify we're on the correct URL / 올바른 URL에 있는지 확인
      const currentUrl = page.url();
      if (!currentUrl.includes(`/devtools/${clientId}`)) {
        console.log(`[Test] URL mismatch, navigating directly`);
        await page.goto(expectedUrl, { waitUntil: 'domcontentloaded' });
      }
    }
  } else {
    console.log(`[Test] Tab not found, navigating directly to /devtools/${clientId}`);
    // Fallback: navigate directly to devtools page / 대체: DevTools 페이지로 직접 이동
    await page.goto(expectedUrl, { waitUntil: 'domcontentloaded' });
  }

  // Verify we're on the correct URL / 올바른 URL에 있는지 확인
  const finalUrl = page.url();
  console.log(`[Test] Final URL: ${finalUrl}`);
  if (!finalUrl.includes(`/devtools/${clientId}`)) {
    throw new Error(`Failed to navigate to /devtools/${clientId}. Current URL: ${finalUrl}`);
  }

  // Wait for React to render / React 렌더링 대기
  await page.waitForTimeout(2000);

  // Wait for page to be fully loaded / 페이지가 완전히 로드될 때까지 대기
  await page.waitForLoadState('networkidle');

  // Wait for iframe to appear / iframe이 나타날 때까지 대기
  await waitForDevToolsIframe(page, clientId);
}

// Setup server URL in Inspector / Inspector에 서버 URL 설정
async function setupServerUrl(page: Page, serverUrl: string): Promise<void> {
  // Navigate to main page / 메인 페이지로 이동
  await page.goto(INSPECTOR_URL);
  await page.waitForLoadState('networkidle');

  // Set server URL in localStorage using zustand persist format / zustand persist 형식으로 localStorage에 서버 URL 설정
  // zustand persist stores data as JSON with version / zustand persist는 버전과 함께 JSON으로 데이터 저장
  await page.evaluate((url) => {
    // Clear any existing server URL / 기존 서버 URL 제거
    localStorage.removeItem('chrome-remote-devtools-server-url');

    // Set server URL using zustand persist format / zustand persist 형식으로 서버 URL 설정
    // zustand persist format: {"state": {"serverUrl": "http://localhost:8080"}, "version": 0}
    const persistData = {
      state: { serverUrl: url },
      version: 0,
    };
    localStorage.setItem('chrome-remote-devtools-server-url', JSON.stringify(persistData));

    console.log('[Test] Set server URL in localStorage:', url);
  }, serverUrl);

  // Reload page to apply server URL / 서버 URL 적용을 위해 페이지 새로고침
  await page.reload();
  await page.waitForLoadState('networkidle');

  // Verify server URL is set correctly / 서버 URL이 올바르게 설정되었는지 확인
  const storedUrl = await page.evaluate(() => {
    const stored = localStorage.getItem('chrome-remote-devtools-server-url');
    if (!stored) return null;
    try {
      const data = JSON.parse(stored);
      return data.state?.serverUrl || null;
    } catch {
      return null;
    }
  });
  console.log('[Test] Stored server URL:', storedUrl);

  // Wait for React Query to fetch clients / React Query가 클라이언트를 가져올 때까지 대기
  // First verify API returns clients / 먼저 API가 클라이언트를 반환하는지 확인
  await page.waitForFunction(
    async (url) => {
      try {
        const response = await fetch(`${url}/json/clients`);
        if (!response.ok) {
          console.error(`[Test] API returned ${response.status}`);
          return false;
        }
        const data = await response.json();
        console.log(`[Test] API returned ${data.clients?.length || 0} clients`);
        if (!Array.isArray(data.clients) || data.clients.length < 2) {
          console.error('[Test] API did not return enough clients:', data);
          return false;
        }
        return true;
      } catch (error) {
        console.error('[Test] Error fetching clients:', error);
        return false;
      }
    },
    serverUrl,
    { timeout: 30000 }
  );

  // Wait a bit for React to process the data / React가 데이터를 처리할 시간을 줌
  await page.waitForTimeout(2000);

  // Then wait for tabs to appear in the UI / 그 다음 UI에 탭이 나타날 때까지 대기
  // Tabs appear when clients are loaded and filtered / 클라이언트가 로드되고 필터링되면 탭이 나타남
  await page.waitForSelector('[role="tab"]', { timeout: 30000 });

  // Verify tabs are visible / 탭이 보이는지 확인
  const tabs = page.locator('[role="tab"]');
  const tabCount = await tabs.count();
  if (tabCount < 2) {
    // Debug: check what's on the page / 디버그: 페이지에 무엇이 있는지 확인
    const bodyText = await page.locator('body').textContent();
    console.error('[Test] Page body text (first 1000 chars):', bodyText?.substring(0, 1000));
    throw new Error(
      `Expected at least 2 tabs, but found ${tabCount}. Page might not have loaded clients.`
    );
  }
}

test.describe('Inspector localStorage Isolation', () => {
  // Setup: Start mock server before all tests / 모든 테스트 전에 Mock 서버 시작
  // Use serial mode to avoid port conflicts / 포트 충돌을 피하기 위해 serial 모드 사용
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    // Check if server is already running / 서버가 이미 실행 중인지 확인
    if (!mockServer) {
      await startMockServer();
    }
  });

  // Teardown: Stop mock server after all tests / 모든 테스트 후에 Mock 서버 중지
  test.afterAll(async () => {
    await stopMockServer();
  });

  test('should render DevTools UI correctly when switching tabs / 탭 전환 시 DevTools UI가 올바르게 렌더링되어야 함', async ({
    page,
  }, testInfo: TestInfo) => {
    await setupServerUrl(page, TEST_SERVER_URL);

    const clients = [
      { id: 'test-client-web-1', type: 'web' },
      { id: 'test-client-web-2', type: 'web' },
      { id: 'test-client-rn-1', type: 'react-native' },
      { id: 'test-client-rn-2', type: 'react-native' },
    ];

    const screenshots: Array<{ clientId: string; path: string }> = [];

    // Switch between all clients and verify UI is rendered / 모든 클라이언트 간 전환하며 UI 렌더링 확인
    for (const client of clients) {
      console.log(`[Test] Navigating to client: ${client.id}`);
      await navigateToClientTab(page, client.id);

      // Verify URL changed / URL 변경 확인
      const currentUrl = page.url();
      expect(currentUrl).toContain(`/devtools/${client.id}`);
      console.log(`[Test] Verified URL: ${currentUrl}`);

      // Wait for iframe to be ready / iframe이 준비될 때까지 대기
      await verifyDevToolsUIAfterTabSwitch(page, client.id);

      // Take screenshot of this tab / 이 탭의 스크린샷 캡처
      const screenshotPath = `test-results/screenshots/${client.id}.png`;
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
      });
      screenshots.push({ clientId: client.id, path: screenshotPath });
      console.log(`[Test] Screenshot saved: ${screenshotPath}`);
    }

    // Switch back to first client and verify UI is still rendered / 첫 번째 클라이언트로 다시 전환하며 UI가 여전히 렌더링되는지 확인
    await navigateToClientTab(page, clients[0].id);
    const finalUrl = page.url();
    expect(finalUrl).toContain(`/devtools/${clients[0].id}`);
    await verifyDevToolsUIAfterTabSwitch(page, clients[0].id);

    // Store screenshots in test info for artifact upload / 아티팩트 업로드를 위해 스크린샷을 테스트 정보에 저장
    testInfo.attachments.push(
      ...screenshots.map((s) => ({
        name: `screenshot-${s.clientId}`,
        path: s.path,
        contentType: 'image/png',
      }))
    );
  });
});
