// Playwright configuration / Playwright 설정
import { defineConfig, devices } from '@playwright/test';

// Determine test type from command line args / 명령줄 인수에서 테스트 타입 결정
const testArgs = process.argv.join(' ');
const isIntegrationTest = testArgs.includes('tests/integration');
const isInspectorIsolationTest = testArgs.includes('inspector-localstorage-isolation');

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.test\.(ts|js)/,
  testIgnore: ['**/node_modules/**', '**/devtools/**', '**/dist/**', '**/build/**'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['junit', { outputFile: 'junit-results.xml' }], ['github']],
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure', // Keep videos for failed tests / 실패한 테스트의 비디오 유지
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: isIntegrationTest
    ? [
        // Integration tests only need server / Integration 테스트는 서버만 필요
        {
          command: 'cargo run --bin chrome-remote-devtools-server -- --port 8080 --host 0.0.0.0',
          url: 'http://localhost:8080/json',
          reuseExistingServer: !process.env.CI,
          timeout: 120000,
        },
      ]
    : isInspectorIsolationTest
      ? [
          // Inspector localStorage isolation tests only need Inspector app / Inspector localStorage 격리 테스트는 Inspector 앱만 필요
          // Mock server is started in the test itself / Mock 서버는 테스트 내에서 시작됨
          {
            command: 'bun run --filter="@ohah/chrome-remote-devtools-inspector" dev',
            url: 'http://localhost:3420',
            reuseExistingServer: !process.env.CI,
            timeout: 120000,
          },
        ]
      : [
          // E2E tests need server, iframe example, and Inspector app / E2E 테스트는 서버, iframe example, Inspector 앱 필요
          {
            // Build client first, then start server / 클라이언트를 먼저 빌드한 후 서버 시작
            command: 'bun scripts/start-server-with-client.ts',
            url: 'http://localhost:8080/json',
            reuseExistingServer: !process.env.CI,
            timeout: 180000, // Increase timeout for client build / 클라이언트 빌드를 위해 타임아웃 증가
          },
          {
            command: 'bun run --filter="iframe" dev',
            url: 'http://localhost:5174',
            reuseExistingServer: !process.env.CI,
            timeout: 120000,
          },
          {
            command: 'bun run --filter="@ohah/chrome-remote-devtools-inspector" dev',
            url: 'http://localhost:3420',
            reuseExistingServer: !process.env.CI,
            timeout: 120000,
          },
        ],
});
