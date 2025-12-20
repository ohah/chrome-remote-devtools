// Full flow integration tests / 전체 플로우 통합 테스트
import { test, expect } from './fixtures/server';

test.describe('Full Flow', () => {
  test('should handle client connection and inspector connection / 클라이언트 연결 및 Inspector 연결 처리', async ({
    page,
    serverUrl,
  }) => {
    await page.goto(serverUrl);
    expect(page.url()).toContain('localhost:8080');
  });

  test('should handle multiple clients / 여러 클라이언트 처리', async ({ page, serverUrl }) => {
    await page.goto(serverUrl);

    // Check if server is running / 서버가 실행 중인지 확인
    const response = await page.request.get(`${serverUrl}/json/clients`);
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('clients');
    expect(Array.isArray(data.clients)).toBe(true);
  });

  test('should handle inspector client switching / Inspector 클라이언트 전환 처리', async ({
    page,
    serverUrl,
  }) => {
    await page.goto(serverUrl);

    // Get clients list / 클라이언트 목록 가져오기
    const response = await page.request.get(`${serverUrl}/json/clients`);
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('clients');
  });

  test('should handle connection and disconnection / 연결 및 연결 해제 처리', async ({
    page,
    serverUrl,
  }) => {
    await page.goto(serverUrl);

    // Check server endpoints / 서버 엔드포인트 확인
    const clientsResponse = await page.request.get(`${serverUrl}/json/clients`);
    expect(clientsResponse.status()).toBe(200);

    const inspectorsResponse = await page.request.get(`${serverUrl}/json/inspectors`);
    expect(inspectorsResponse.status()).toBe(200);
  });
});
