// User scenario E2E tests / 사용자 시나리오 E2E 테스트
import { test, expect } from '@playwright/test';

test.describe('User Scenarios', () => {
  test('should debug web page scenario / 웹페이지 디버깅 시나리오', async ({ page }) => {
    // 1. Navigate to server / 서버로 이동
    await page.goto('http://localhost:8080');

    // 2. Check if server is running / 서버가 실행 중인지 확인
    const response = await page.request.get('http://localhost:8080/json/clients');
    expect(response.status()).toBe(200);

    // 3. Get clients list / 클라이언트 목록 가져오기
    const data = await response.json();
    expect(data).toHaveProperty('clients');
    expect(Array.isArray(data.clients)).toBe(true);
  });

  test('should handle multiple pages debugging / 여러 페이지 동시 디버깅', async ({ page }) => {
    // Navigate to server / 서버로 이동
    await page.goto('http://localhost:8080');

    // Check clients endpoint / 클라이언트 엔드포인트 확인
    const response = await page.request.get('http://localhost:8080/json/clients');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('clients');
  });

  test('should handle inspector reconnection / Inspector 재연결 처리', async ({ page }) => {
    // Navigate to server / 서버로 이동
    await page.goto('http://localhost:8080');

    // Check inspectors endpoint / Inspector 엔드포인트 확인
    const response = await page.request.get('http://localhost:8080/json/inspectors');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('inspectors');
    expect(Array.isArray(data.inspectors)).toBe(true);
  });
});
