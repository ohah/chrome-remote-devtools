// Console domain tests / Console 도메인 테스트
import { test, expect } from './fixtures/server';

test.describe('Console Domain', () => {
  test('hello world', async ({ page, serverUrl }) => {
    await page.goto(serverUrl);
    expect(page.url()).toContain('localhost:8080');
  });
});
