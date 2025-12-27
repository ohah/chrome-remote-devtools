// WebSocket connection tests / WebSocket 연결 테스트
import { test, expect } from './fixtures/server';

test.describe('WebSocket Connections', () => {
  test('hello world', async ({ page, serverUrl }) => {
    await page.goto(serverUrl, { waitUntil: 'networkidle' });
    expect(page.url()).toContain('localhost:8080');
  });
});
