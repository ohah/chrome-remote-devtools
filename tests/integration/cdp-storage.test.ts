// Storage domain integration tests / Storage 도메인 통합 테스트
import { test, expect } from './fixtures/server';
import { createInspectorWebSocket } from './fixtures/websocket';
import {
  createStorageGetStorageKeyMessage,
  createDOMStorageEnableMessage,
  createDOMStorageGetItemsMessage,
  createDOMStorageSetItemMessage,
  createDOMStorageRemoveItemMessage,
  createDOMStorageClearMessage,
  createPageEnableMessage,
  createPageGetResourceTreeMessage,
  isCDPResponse,
  isCDPEvent,
} from './helpers/cdp-messages';
import { createTestPageHTML } from './helpers/test-page';

test.describe('Storage Domain Integration', () => {
  test('should get storage key / storage key 가져오기', async ({ page, serverUrl, wsUrl }) => {
    // Create test page with client script / 클라이언트 스크립트가 있는 테스트 페이지 생성
    const testPageHTML = createTestPageHTML(
      `
      <h1>Storage Test Page</h1>
      <script>
        localStorage.setItem('test-key', 'test-value');
      </script>
    `,
      serverUrl
    );

    await page.setContent(testPageHTML);
    await page.waitForTimeout(500); // Wait for client script to load / 클라이언트 스크립트 로드 대기

    // Get client ID from page / 페이지에서 클라이언트 ID 가져오기
    const clientId = await page.evaluate(() => {
      return sessionStorage.getItem('debug_id');
    });

    expect(clientId).toBeTruthy();

    if (!clientId) return;

    // Connect as Inspector / Inspector로 연결
    const inspector = await createInspectorWebSocket(wsUrl, clientId);
    await page.waitForTimeout(500); // Wait for connection / 연결 대기

    // Enable Page domain to get frame info / Page 도메인 활성화하여 프레임 정보 가져오기
    inspector.send(createPageEnableMessage());
    inspector.send(createPageGetResourceTreeMessage());

    // Get storage key / storage key 가져오기
    const getStorageKeyMessage = createStorageGetStorageKeyMessage();
    inspector.send(getStorageKeyMessage);

    const response = await inspector.receive();
    expect(isCDPResponse(response)).toBe(true);

    if (isCDPResponse(response) && response.id === getStorageKeyMessage.id) {
      expect(response.result).toHaveProperty('storageKey');
      expect(typeof (response.result as { storageKey?: string })?.storageKey).toBe('string');
    }

    inspector.close();
  });

  test('should enable DOMStorage and get items / DOMStorage 활성화 및 항목 가져오기', async ({
    page,
    serverUrl,
    wsUrl,
  }) => {
    const testPageHTML = createTestPageHTML(
      `
      <h1>Storage Test Page</h1>
      <script>
        localStorage.setItem('test-key-1', 'test-value-1');
        localStorage.setItem('test-key-2', 'test-value-2');
        sessionStorage.setItem('session-key', 'session-value');
      </script>
    `,
      serverUrl
    );

    await page.setContent(testPageHTML);
    await page.waitForTimeout(500);

    const clientId = await page.evaluate(() => {
      return sessionStorage.getItem('debug_id');
    });

    expect(clientId).toBeTruthy();
    if (!clientId) return;

    const inspector = await createInspectorWebSocket(wsUrl, clientId);
    await page.waitForTimeout(500);

    // Get storage key first / 먼저 storage key 가져오기
    const getStorageKeyMessage = createStorageGetStorageKeyMessage();
    inspector.send(getStorageKeyMessage);
    const storageKeyResponse = await inspector.receive();

    let storageKey: string | undefined;
    if (isCDPResponse(storageKeyResponse) && storageKeyResponse.id === getStorageKeyMessage.id) {
      storageKey = (storageKeyResponse.result as { storageKey?: string })?.storageKey;
    }

    expect(storageKey).toBeTruthy();
    if (!storageKey) {
      inspector.close();
      return;
    }

    // Enable DOMStorage / DOMStorage 활성화
    inspector.send(createDOMStorageEnableMessage());
    await page.waitForTimeout(200);

    // Get localStorage items / localStorage 항목 가져오기
    const localStorageId = {
      isLocalStorage: true,
      storageKey,
      securityOrigin: storageKey,
    };

    const getItemsMessage = createDOMStorageGetItemsMessage(localStorageId);
    inspector.send(getItemsMessage);

    const response = await inspector.receive();
    expect(isCDPResponse(response)).toBe(true);

    if (isCDPResponse(response) && response.id === getItemsMessage.id) {
      const result = response.result as { entries?: Array<[string, string]> };
      expect(result).toHaveProperty('entries');
      expect(Array.isArray(result.entries)).toBe(true);

      // Check if test items exist / 테스트 항목이 존재하는지 확인
      const entries = result.entries || [];
      const testKey1 = entries.find(([key]) => key === 'test-key-1');
      const testKey2 = entries.find(([key]) => key === 'test-key-2');

      expect(testKey1).toBeTruthy();
      expect(testKey1?.[1]).toBe('test-value-1');
      expect(testKey2).toBeTruthy();
      expect(testKey2?.[1]).toBe('test-value-2');
    }

    inspector.close();
  });

  test('should set and remove DOMStorage items / DOMStorage 항목 설정 및 제거', async ({
    page,
    serverUrl,
    wsUrl,
  }) => {
    const testPageHTML = createTestPageHTML(
      `
      <h1>Storage Test Page</h1>
    `,
      serverUrl
    );

    await page.setContent(testPageHTML);
    await page.waitForTimeout(500);

    const clientId = await page.evaluate(() => {
      return sessionStorage.getItem('debug_id');
    });

    expect(clientId).toBeTruthy();
    if (!clientId) return;

    const inspector = await createInspectorWebSocket(wsUrl, clientId);
    await page.waitForTimeout(500);

    // Get storage key / storage key 가져오기
    const getStorageKeyMessage = createStorageGetStorageKeyMessage();
    inspector.send(getStorageKeyMessage);
    const storageKeyResponse = await inspector.receive();

    let storageKey: string | undefined;
    if (isCDPResponse(storageKeyResponse) && storageKeyResponse.id === getStorageKeyMessage.id) {
      storageKey = (storageKeyResponse.result as { storageKey?: string })?.storageKey;
    }

    expect(storageKey).toBeTruthy();
    if (!storageKey) {
      inspector.close();
      return;
    }

    // Enable DOMStorage / DOMStorage 활성화
    inspector.send(createDOMStorageEnableMessage());
    await page.waitForTimeout(200);

    const localStorageId = {
      isLocalStorage: true,
      storageKey,
      securityOrigin: storageKey,
    };

    // Set item / 항목 설정
    const setItemMessage = createDOMStorageSetItemMessage(localStorageId, 'new-key', 'new-value');
    inspector.send(setItemMessage);

    const setResponse = await inspector.receive();
    expect(isCDPResponse(setResponse)).toBe(true);

    // Verify item was set / 항목이 설정되었는지 확인
    const getItemsMessage = createDOMStorageGetItemsMessage(localStorageId);
    inspector.send(getItemsMessage);

    const getResponse = await inspector.receive();
    if (isCDPResponse(getResponse) && getResponse.id === getItemsMessage.id) {
      const result = getResponse.result as { entries?: Array<[string, string]> };
      const entries = result.entries || [];
      const newItem = entries.find(([key]) => key === 'new-key');
      expect(newItem).toBeTruthy();
      expect(newItem?.[1]).toBe('new-value');
    }

    // Remove item / 항목 제거
    const removeItemMessage = createDOMStorageRemoveItemMessage(localStorageId, 'new-key');
    inspector.send(removeItemMessage);

    const removeResponse = await inspector.receive();
    expect(isCDPResponse(removeResponse)).toBe(true);

    // Verify item was removed / 항목이 제거되었는지 확인
    const getItemsAfterRemove = createDOMStorageGetItemsMessage(localStorageId);
    inspector.send(getItemsAfterRemove);

    const getAfterRemoveResponse = await inspector.receive();
    if (
      isCDPResponse(getAfterRemoveResponse) &&
      getAfterRemoveResponse.id === getItemsAfterRemove.id
    ) {
      const result = getAfterRemoveResponse.result as { entries?: Array<[string, string]> };
      const entries = result.entries || [];
      const removedItem = entries.find(([key]) => key === 'new-key');
      expect(removedItem).toBeFalsy();
    }

    inspector.close();
  });

  test('should clear DOMStorage / DOMStorage 전체 삭제', async ({ page, serverUrl, wsUrl }) => {
    const testPageHTML = createTestPageHTML(
      `
      <h1>Storage Test Page</h1>
      <script>
        localStorage.setItem('key1', 'value1');
        localStorage.setItem('key2', 'value2');
      </script>
    `,
      serverUrl
    );

    await page.setContent(testPageHTML);
    await page.waitForTimeout(500);

    const clientId = await page.evaluate(() => {
      return sessionStorage.getItem('debug_id');
    });

    expect(clientId).toBeTruthy();
    if (!clientId) return;

    const inspector = await createInspectorWebSocket(wsUrl, clientId);
    await page.waitForTimeout(500);

    // Get storage key / storage key 가져오기
    const getStorageKeyMessage = createStorageGetStorageKeyMessage();
    inspector.send(getStorageKeyMessage);
    const storageKeyResponse = await inspector.receive();

    let storageKey: string | undefined;
    if (isCDPResponse(storageKeyResponse) && storageKeyResponse.id === getStorageKeyMessage.id) {
      storageKey = (storageKeyResponse.result as { storageKey?: string })?.storageKey;
    }

    expect(storageKey).toBeTruthy();
    if (!storageKey) {
      inspector.close();
      return;
    }

    // Enable DOMStorage / DOMStorage 활성화
    inspector.send(createDOMStorageEnableMessage());
    await page.waitForTimeout(200);

    const localStorageId = {
      isLocalStorage: true,
      storageKey,
      securityOrigin: storageKey,
    };

    // Verify items exist before clear / clear 전에 항목이 존재하는지 확인
    const getItemsBeforeClear = createDOMStorageGetItemsMessage(localStorageId);
    inspector.send(getItemsBeforeClear);

    const beforeClearResponse = await inspector.receive();
    if (isCDPResponse(beforeClearResponse) && beforeClearResponse.id === getItemsBeforeClear.id) {
      const result = beforeClearResponse.result as { entries?: Array<[string, string]> };
      expect((result.entries || []).length).toBeGreaterThan(0);
    }

    // Clear storage / storage 전체 삭제
    const clearMessage = createDOMStorageClearMessage(localStorageId);
    inspector.send(clearMessage);

    const clearResponse = await inspector.receive();
    expect(isCDPResponse(clearResponse)).toBe(true);

    // Verify storage is cleared / storage가 삭제되었는지 확인
    const getItemsAfterClear = createDOMStorageGetItemsMessage(localStorageId);
    inspector.send(getItemsAfterClear);

    const afterClearResponse = await inspector.receive();
    if (isCDPResponse(afterClearResponse) && afterClearResponse.id === getItemsAfterClear.id) {
      const result = afterClearResponse.result as { entries?: Array<[string, string]> };
      expect((result.entries || []).length).toBe(0);
    }

    inspector.close();
  });

  test('should receive storage change events / storage 변경 이벤트 수신', async ({
    page,
    serverUrl,
    wsUrl,
  }) => {
    const testPageHTML = createTestPageHTML(
      `
      <h1>Storage Test Page</h1>
    `,
      serverUrl
    );

    await page.setContent(testPageHTML);
    await page.waitForTimeout(500);

    const clientId = await page.evaluate(() => {
      return sessionStorage.getItem('debug_id');
    });

    expect(clientId).toBeTruthy();
    if (!clientId) return;

    const inspector = await createInspectorWebSocket(wsUrl, clientId);
    await page.waitForTimeout(500);

    // Get storage key / storage key 가져오기
    const getStorageKeyMessage = createStorageGetStorageKeyMessage();
    inspector.send(getStorageKeyMessage);
    const storageKeyResponse = await inspector.receive();

    let storageKey: string | undefined;
    if (isCDPResponse(storageKeyResponse) && storageKeyResponse.id === getStorageKeyMessage.id) {
      storageKey = (storageKeyResponse.result as { storageKey?: string })?.storageKey;
    }

    expect(storageKey).toBeTruthy();
    if (!storageKey) {
      inspector.close();
      return;
    }

    // Enable DOMStorage / DOMStorage 활성화
    inspector.send(createDOMStorageEnableMessage());
    await page.waitForTimeout(200);

    const localStorageId = {
      isLocalStorage: true,
      storageKey,
      securityOrigin: storageKey,
    };

    // Set item and wait for event / 항목 설정하고 이벤트 대기
    const setItemMessage = createDOMStorageSetItemMessage(
      localStorageId,
      'event-test-key',
      'event-test-value'
    );
    inspector.send(setItemMessage);

    // Wait for both response and event / 응답과 이벤트 모두 대기
    const messages: unknown[] = [];
    for (let i = 0; i < 2; i++) {
      const message = await inspector.receive();
      messages.push(message);
    }

    // Check for setItem response / setItem 응답 확인
    const setResponse = messages.find(
      (msg) => isCDPResponse(msg) && (msg as { id: number }).id === setItemMessage.id
    );
    expect(setResponse).toBeTruthy();

    // Check for domStorageItemAdded event / domStorageItemAdded 이벤트 확인
    const addedEvent = messages.find(
      (msg) =>
        isCDPEvent(msg) && (msg as { method: string }).method === 'DOMStorage.domStorageItemAdded'
    );
    expect(addedEvent).toBeTruthy();

    if (addedEvent && isCDPEvent(addedEvent)) {
      const params = addedEvent.params as {
        storageId?: { isLocalStorage?: boolean };
        key?: string;
        newValue?: string;
      };
      expect(params.key).toBe('event-test-key');
      expect(params.newValue).toBe('event-test-value');
    }

    inspector.close();
  });
});
