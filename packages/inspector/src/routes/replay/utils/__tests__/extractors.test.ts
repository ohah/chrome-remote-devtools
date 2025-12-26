// Data extractors tests / 데이터 추출 함수 테스트
import { describe, test, expect } from 'bun:test';
import { extractDOMTree, extractDOMStorageItems, extractCookies } from '../extractors';
import type { PostMessageCDPMessage } from '@/shared/lib/file-to-cdp';

// Helper to create File from JSON / JSON에서 File 생성 헬퍼
function createTestFile(data: unknown): File {
  return new File([JSON.stringify(data)], 'test.json', { type: 'application/json' });
}

describe('extractDOMTree', () => {
  test('should extract DOM tree from file domTree / 파일의 domTree에서 DOM 트리 추출', async () => {
    const testData = {
      version: '1.0.0',
      exportDate: '2025-12-26T08:55:38.567Z',
      clientId: 'test-client',
      events: [],
      domTree: {
        documentURL: 'http://localhost:1420',
        baseURL: 'http://localhost:1420',
        html: '<html><head><title>Test</title></head><body><div>Test</div></body></html>',
      },
    };

    const file = createTestFile(testData);
    const cdpMessages: PostMessageCDPMessage[] = [];

    const result = await extractDOMTree(file, cdpMessages);

    expect(result).not.toBeNull();
    expect(result?.root).toBeDefined();
    const root = result?.root as Record<string, unknown>;
    expect(root.nodeType).toBe(9); // DOCUMENT_NODE
    expect(root.nodeName).toBe('#document');
  });

  test('should fallback to CDP messages when domTree is missing / domTree가 없을 때 CDP 메시지에서 폴백 추출', async () => {
    const testData = {
      version: '1.0.0',
      exportDate: '2025-12-26T08:55:38.567Z',
      clientId: 'test-client',
      events: [],
    };

    const file = createTestFile(testData);
    const cdpMessages: PostMessageCDPMessage[] = [
      {
        type: 'CDP_MESSAGE',
        message: JSON.stringify({
          method: 'DOM.setChildNodes',
          params: {
            parentId: 0,
            nodes: [
              {
                nodeId: 1,
                nodeType: 1,
                nodeName: 'HTML',
              },
            ],
          },
        }),
      },
    ];

    const result = await extractDOMTree(file, cdpMessages);

    expect(result).not.toBeNull();
    expect(result?.root).toBeDefined();
    const root = result?.root as Record<string, unknown>;
    expect(root.nodeType).toBe(9); // DOCUMENT_NODE
    expect(root.nodeName).toBe('#document');
  });

  test('should return null when both domTree and CDP messages are missing / 둘 다 없을 때 null 반환', async () => {
    const testData = {
      version: '1.0.0',
      exportDate: '2025-12-26T08:55:38.567Z',
      clientId: 'test-client',
      events: [],
    };

    const file = createTestFile(testData);
    const cdpMessages: PostMessageCDPMessage[] = [];

    const result = await extractDOMTree(file, cdpMessages);

    expect(result).toBeNull();
  });
});

describe('extractDOMStorageItems', () => {
  test('should extract localStorage and sessionStorage from file / 파일에서 localStorage/sessionStorage 추출', async () => {
    const testData = {
      version: '1.0.0',
      exportDate: '2025-12-26T08:55:38.567Z',
      clientId: 'test-client',
      events: [],
      localStorage: [
        ['key1', 'value1'],
        ['key2', 'value2'],
      ],
      sessionStorage: [['sessionKey', 'sessionValue']],
    };

    const file = createTestFile(testData);
    const cdpMessages: PostMessageCDPMessage[] = [];

    const result = await extractDOMStorageItems(file, cdpMessages);

    expect(result.localStorage).toHaveLength(2);
    expect(result.localStorage[0]).toEqual(['key1', 'value1']);
    expect(result.localStorage[1]).toEqual(['key2', 'value2']);
    expect(result.sessionStorage).toHaveLength(1);
    expect(result.sessionStorage[0]).toEqual(['sessionKey', 'sessionValue']);
  });

  test('should fallback to CDP messages when file data is missing / 파일이 없을 때 CDP 메시지에서 폴백 추출', async () => {
    // Create file with missing localStorage/sessionStorage to force fallback / localStorage/sessionStorage가 없는 파일 생성하여 폴백 강제
    // But readCDPFile will succeed, so we need to make it fail by using invalid JSON / 하지만 readCDPFile이 성공하므로 잘못된 JSON으로 실패하게 만듦
    const file = new File(['{invalid json}'], 'test.json', { type: 'application/json' });
    const cdpMessages: PostMessageCDPMessage[] = [
      {
        type: 'CDP_MESSAGE',
        message: JSON.stringify({
          method: 'DOMStorage.domStorageItemAdded',
          params: {
            storageId: {
              isLocalStorage: true,
              storageKey: 'http://localhost:1420',
            },
            key: 'test',
            newValue: 'value',
          },
        }),
      },
      {
        type: 'CDP_MESSAGE',
        message: JSON.stringify({
          method: 'DOMStorage.domStorageItemAdded',
          params: {
            storageId: {
              isLocalStorage: false,
              storageKey: 'http://localhost:1420',
            },
            key: 'sessionKey',
            newValue: 'sessionValue',
          },
        }),
      },
    ];

    const result = await extractDOMStorageItems(file, cdpMessages);

    expect(result.localStorage).toHaveLength(1);
    expect(result.localStorage[0]).toEqual(['test', 'value']);
    expect(result.sessionStorage).toHaveLength(1);
    expect(result.sessionStorage[0]).toEqual(['sessionKey', 'sessionValue']);
  });

  test('should handle domStorageItemUpdated event / domStorageItemUpdated 이벤트 처리', async () => {
    // Create file with invalid JSON to force fallback to CDP messages / CDP 메시지로 폴백하도록 잘못된 JSON 파일 생성
    const file = new File(['{invalid json}'], 'test.json', { type: 'application/json' });
    const cdpMessages: PostMessageCDPMessage[] = [
      {
        type: 'CDP_MESSAGE',
        message: JSON.stringify({
          method: 'DOMStorage.domStorageItemAdded',
          params: {
            storageId: { isLocalStorage: true },
            key: 'key1',
            newValue: 'value1',
          },
        }),
      },
      {
        type: 'CDP_MESSAGE',
        message: JSON.stringify({
          method: 'DOMStorage.domStorageItemUpdated',
          params: {
            storageId: { isLocalStorage: true },
            key: 'key1',
            newValue: 'value1-updated',
          },
        }),
      },
    ];

    const result = await extractDOMStorageItems(file, cdpMessages);

    expect(result.localStorage).toHaveLength(1);
    expect(result.localStorage[0]).toEqual(['key1', 'value1-updated']);
  });

  test('should handle domStorageItemRemoved event / domStorageItemRemoved 이벤트 처리', async () => {
    const testData = {
      version: '1.0.0',
      exportDate: '2025-12-26T08:55:38.567Z',
      clientId: 'test-client',
      events: [],
    };

    const file = createTestFile(testData);
    const cdpMessages: PostMessageCDPMessage[] = [
      {
        type: 'CDP_MESSAGE',
        message: JSON.stringify({
          method: 'DOMStorage.domStorageItemAdded',
          params: {
            storageId: { isLocalStorage: true },
            key: 'key1',
            newValue: 'value1',
          },
        }),
      },
      {
        type: 'CDP_MESSAGE',
        message: JSON.stringify({
          method: 'DOMStorage.domStorageItemRemoved',
          params: {
            storageId: { isLocalStorage: true },
            key: 'key1',
          },
        }),
      },
    ];

    const result = await extractDOMStorageItems(file, cdpMessages);

    expect(result.localStorage).toHaveLength(0);
  });

  test('should handle domStorageItemsCleared event / domStorageItemsCleared 이벤트 처리', async () => {
    const testData = {
      version: '1.0.0',
      exportDate: '2025-12-26T08:55:38.567Z',
      clientId: 'test-client',
      events: [],
    };

    const file = createTestFile(testData);
    const cdpMessages: PostMessageCDPMessage[] = [
      {
        type: 'CDP_MESSAGE',
        message: JSON.stringify({
          method: 'DOMStorage.domStorageItemAdded',
          params: {
            storageId: { isLocalStorage: true },
            key: 'key1',
            newValue: 'value1',
          },
        }),
      },
      {
        type: 'CDP_MESSAGE',
        message: JSON.stringify({
          method: 'DOMStorage.domStorageItemsCleared',
          params: {
            storageId: { isLocalStorage: true },
          },
        }),
      },
    ];

    const result = await extractDOMStorageItems(file, cdpMessages);

    expect(result.localStorage).toHaveLength(0);
  });
});

describe('extractCookies', () => {
  test('should extract cookies from file / 파일에서 쿠키 추출', async () => {
    const testData = {
      version: '1.0.0',
      exportDate: '2025-12-26T08:55:38.567Z',
      clientId: 'test-client',
      events: [],
      cookies: [
        {
          name: 'test',
          value: 'cookie',
          domain: 'localhost',
          path: '/',
        },
      ],
    };

    const file = createTestFile(testData);

    const result = await extractCookies(file);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('test');
    expect(result[0].value).toBe('cookie');
    expect(result[0].domain).toBe('localhost');
    expect(result[0].path).toBe('/');
  });

  test('should return empty array when cookies are missing / 쿠키가 없을 때 빈 배열 반환', async () => {
    const testData = {
      version: '1.0.0',
      exportDate: '2025-12-26T08:55:38.567Z',
      clientId: 'test-client',
      events: [],
    };

    const file = createTestFile(testData);

    const result = await extractCookies(file);

    expect(result).toEqual([]);
  });
});
