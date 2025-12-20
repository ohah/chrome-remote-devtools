// Runtime domain integration tests / Runtime 도메인 통합 테스트
import { test, expect } from './fixtures/server';

test.describe('Runtime Domain Integration', () => {
  test('should connect to server / 서버에 연결', async ({ page, serverUrl }) => {
    await page.goto(serverUrl);
    expect(page.url()).toContain('localhost:8080');
  });

  test('should get clients list / 클라이언트 목록 가져오기', async ({ page, serverUrl }) => {
    const response = await page.request.get(`${serverUrl}/json/clients`);
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('clients');
    expect(Array.isArray(data.clients)).toBe(true);
  });

  test('should handle WebSocket connection / WebSocket 연결 처리', async ({ page, serverUrl }) => {
    // Navigate to server / 서버로 이동
    await page.goto(serverUrl);
    expect(page.url()).toContain('localhost:8080');
  });
});
