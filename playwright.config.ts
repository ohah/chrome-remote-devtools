// Playwright configuration / Playwright 설정
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/integration',
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

  webServer: {
    command: 'bun run --filter="@ohah/chrome-remote-devtools-server" dev',
    url: 'http://localhost:8080/json',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
