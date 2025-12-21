// Playwright configuration / Playwright 설정
import { defineConfig, devices } from '@playwright/test';

// Determine test type from command line args / 명령줄 인수에서 테스트 타입 결정
const testPath = process.argv.find((arg) => arg.includes('tests/'));
const isIntegrationTest = testPath?.includes('tests/integration') ?? false;

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.test\.(ts|js)/,
  testIgnore: ['**/node_modules/**', '**/devtools/**', '**/dist/**', '**/build/**'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
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
          command: 'bun run --filter="@ohah/chrome-remote-devtools-server" dev',
          url: 'http://localhost:8080/json',
          reuseExistingServer: !process.env.CI,
          timeout: 120000,
        },
      ]
    : [
        // E2E tests need both server and iframe example / E2E 테스트는 서버와 iframe example 모두 필요
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
      ],
});
