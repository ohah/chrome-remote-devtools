// Page domain integration tests / Page 도메인 통합 테스트
import { test, expect } from './fixtures/server';

test.describe('Page Domain Integration', () => {
  test('should connect to server / 서버에 연결', async ({ page, serverUrl }) => {
    await page.goto(serverUrl, { waitUntil: 'networkidle' });
    expect(page.url()).toContain('localhost:8080');
  });

  test('should get server endpoints / 서버 엔드포인트 가져오기', async ({ page, serverUrl }) => {
    const response = await page.request.get(`${serverUrl}/json`);
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('targets');
  });
});
