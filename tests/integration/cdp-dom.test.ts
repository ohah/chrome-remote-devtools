// DOM domain integration tests / DOM 도메인 통합 테스트
import { test, expect } from './fixtures/server';

test.describe('DOM Domain Integration', () => {
  test('should connect to server / 서버에 연결', async ({ page, serverUrl }) => {
    await page.goto(serverUrl);
    expect(page.url()).toContain('localhost:8080');
  });

  test('should get server endpoints / 서버 엔드포인트 가져오기', async ({ page, serverUrl }) => {
    const response = await page.request.get(`${serverUrl}/json/clients`);
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('clients');
  });
});
