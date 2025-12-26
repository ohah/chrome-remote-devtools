// Message handlers tests / 메시지 핸들러 테스트
import { describe, test, expect, beforeEach, mock } from 'bun:test';
import {
  handleGetResponseBody,
  handleGetDocument,
  handleGetCookies,
  handleGetResourceTree,
  handleGetStorageKey,
  handleDOMStorageEnable,
  handleGetDOMStorageItems,
  handleCDPCommand,
} from '../message-handlers';
import { createResponseBodyStore } from '../response-body-store';
import type { CommandHandlerContext } from '../message-handlers';
import type { PostMessageCDPMessage } from '@/shared/lib/file-to-cdp';
import { readFileSync } from 'fs';
import { join } from 'path';

// Helper to create File from JSON / JSON에서 File 생성 헬퍼
function createTestFile(data: unknown): File {
  return new File([JSON.stringify(data)], 'test.json', { type: 'application/json' });
}

describe('handleGetResponseBody', () => {
  let context: CommandHandlerContext;
  let postMessageSpy: ReturnType<typeof mock>;

  beforeEach(() => {
    postMessageSpy = mock(() => {});
    const mockWindow = {
      postMessage: postMessageSpy,
    } as unknown as Window;

    context = {
      file: createTestFile({ version: '1.0.0', exportDate: '', clientId: '', events: [] }),
      cdpMessages: [],
      responseBodyStore: createResponseBodyStore(),
      targetWindow: mockWindow,
    };

    context.responseBodyStore.store('req-1', 'test body');
  });

  test('should return body from responseBodyStore / responseBodyStore에서 body 반환', async () => {
    const parsed = {
      method: 'Network.getResponseBody',
      id: 1,
      params: { requestId: 'req-1' },
    };

    const result = handleGetResponseBody(parsed, context);

    expect(result).toBe(true);

    // Wait for setTimeout / setTimeout 대기
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(postMessageSpy).toHaveBeenCalledTimes(1);
    const callArgs = postMessageSpy.mock.calls[0];
    const message = JSON.parse(callArgs[0].message);
    expect(message.result.body).toBe('test body');
  });

  test('should return false for non-matching method / 일치하지 않는 메서드에 대해 false 반환', () => {
    const parsed = {
      method: 'Other.method',
      id: 1,
      params: { requestId: 'req-1' },
    };

    const result = handleGetResponseBody(parsed, context);
    expect(result).toBe(false);
  });
});

describe('handleGetDocument', () => {
  let context: CommandHandlerContext;
  let postMessageSpy: ReturnType<typeof mock>;

  beforeEach(() => {
    postMessageSpy = mock(() => {});
    const mockWindow = {
      postMessage: postMessageSpy,
    } as unknown as Window;

    context = {
      file: createTestFile({
        version: '1.0.0',
        exportDate: '',
        clientId: '',
        events: [],
        domTree: {
          documentURL: 'http://localhost:1420',
          baseURL: 'http://localhost:1420',
          html: '<html><head><title>Test</title></head><body><div>Test</div></body></html>',
        },
      }),
      cdpMessages: [],
      responseBodyStore: createResponseBodyStore(),
      targetWindow: mockWindow,
    };
  });

  test('should return extractDOMTree result / extractDOMTree 결과 반환', async () => {
    const parsed = {
      method: 'DOM.getDocument',
      id: 1,
    };

    const result = handleGetDocument(parsed, context);

    expect(result).toBe(true);

    // Wait for async operation / 비동기 작업 대기
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(postMessageSpy).toHaveBeenCalled();
  });
});

describe('handleGetCookies', () => {
  let context: CommandHandlerContext;
  let postMessageSpy: ReturnType<typeof mock>;

  beforeEach(() => {
    postMessageSpy = mock(() => {});
    const mockWindow = {
      postMessage: postMessageSpy,
    } as unknown as Window;

    context = {
      file: createTestFile({
        version: '1.0.0',
        exportDate: '',
        clientId: '',
        events: [],
        cookies: [{ name: 'test', value: 'cookie', domain: 'localhost', path: '/' }],
      }),
      cdpMessages: [],
      responseBodyStore: createResponseBodyStore(),
      targetWindow: mockWindow,
    };
  });

  test('should return extractCookies result / extractCookies 결과 반환', async () => {
    const parsed = {
      method: 'Network.getCookies',
      id: 1,
    };

    const result = handleGetCookies(parsed, context);

    expect(result).toBe(true);

    // Wait for async operation / 비동기 작업 대기
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(postMessageSpy).toHaveBeenCalled();
  });
});

describe('handleGetResourceTree', () => {
  let context: CommandHandlerContext;
  let postMessageSpy: ReturnType<typeof mock>;

  beforeEach(() => {
    postMessageSpy = mock(() => {});
    const mockWindow = {
      postMessage: postMessageSpy,
    } as unknown as Window;

    context = {
      file: createTestFile({ version: '1.0.0', exportDate: '', clientId: '', events: [] }),
      cdpMessages: [],
      responseBodyStore: createResponseBodyStore(),
      targetWindow: mockWindow,
    };
  });

  test('should return default frameTree / 기본 frameTree 반환', async () => {
    const parsed = {
      method: 'Page.getResourceTree',
      id: 1,
    };

    const result = handleGetResourceTree(parsed, context);

    expect(result).toBe(true);

    // Wait for setTimeout / setTimeout 대기
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(postMessageSpy).toHaveBeenCalledTimes(1);
    const callArgs = postMessageSpy.mock.calls[0];
    const message = JSON.parse(callArgs[0].message);
    expect(message.result.frameTree).toBeDefined();
    expect(message.result.frameTree.frame.id).toBe('main');
  });
});

describe('handleGetStorageKey', () => {
  let context: CommandHandlerContext;
  let postMessageSpy: ReturnType<typeof mock>;

  beforeEach(() => {
    postMessageSpy = mock(() => {});
    const mockWindow = {
      postMessage: postMessageSpy,
    } as unknown as Window;

    // Mock window.location.origin / window.location.origin 모킹
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:1420' },
      writable: true,
    });

    context = {
      file: createTestFile({ version: '1.0.0', exportDate: '', clientId: '', events: [] }),
      cdpMessages: [],
      responseBodyStore: createResponseBodyStore(),
      targetWindow: mockWindow,
    };
  });

  test('should return storageKey / storageKey 반환', async () => {
    const parsed = {
      method: 'Storage.getStorageKey',
      id: 1,
    };

    const result = handleGetStorageKey(parsed, context);

    expect(result).toBe(true);

    // Wait for setTimeout / setTimeout 대기
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(postMessageSpy).toHaveBeenCalledTimes(1);
    const callArgs = postMessageSpy.mock.calls[0];
    const message = JSON.parse(callArgs[0].message);
    expect(message.result.storageKey).toBe('http://localhost:1420');
  });
});

describe('handleDOMStorageEnable', () => {
  let context: CommandHandlerContext;
  let postMessageSpy: ReturnType<typeof mock>;
  let sentEvents: Array<{ id?: number; method?: string; params?: unknown }>;

  beforeEach(() => {
    sentEvents = [];
    postMessageSpy = mock((msg: unknown) => {
      const parsed = JSON.parse((msg as { message: string }).message);
      sentEvents.push({
        id: parsed.id,
        method: parsed.method,
        params: parsed.params,
      });
    });
    const mockWindow = {
      postMessage: postMessageSpy,
    } as unknown as Window;

    // Mock window.location.origin / window.location.origin 모킹
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:1420' },
      writable: true,
    });

    context = {
      file: createTestFile({
        version: '1.0.0',
        exportDate: '',
        clientId: '',
        events: [],
        localStorage: [['key1', 'value1']],
        sessionStorage: [['sessionKey', 'sessionValue']],
      }),
      cdpMessages: [],
      responseBodyStore: createResponseBodyStore(),
      targetWindow: mockWindow,
    };
  });

  test('should send enable response first, then storage items / enable 응답 후 storage items 전송', async () => {
    const parsed = {
      method: 'DOMStorage.enable',
      id: 1,
    };

    const result = handleDOMStorageEnable(parsed, context);

    expect(result).toBe(true);

    // Wait for enable response (10ms) / enable 응답 대기 (10ms)
    await new Promise((resolve) => setTimeout(resolve, 20));

    // Should have enable response / enable 응답이 있어야 함
    const enableResponse = sentEvents.find((e) => e.id === 1);
    expect(enableResponse).toBeDefined();

    // Wait for storage items (200ms) / storage items 대기 (200ms)
    await new Promise((resolve) => setTimeout(resolve, 250));

    // Should have storage item events / storage item 이벤트가 있어야 함
    const storageEvents = sentEvents.filter((e) => e.method === 'DOMStorage.domStorageItemAdded');
    expect(storageEvents.length).toBeGreaterThan(0);
  });

  test('should send storage items after 200ms delay / 200ms 후 storage items 전송되는지 확인', async () => {
    const parsed = {
      method: 'DOMStorage.enable',
      id: 1,
    };

    handleDOMStorageEnable(parsed, context);

    // Immediately after call, storage items should not be sent / 호출 직후에는 storage items가 전송되지 않아야 함
    await new Promise((resolve) => setTimeout(resolve, 50));
    const earlyStorageEvents = sentEvents.filter(
      (e) => e.method === 'DOMStorage.domStorageItemAdded'
    );
    expect(earlyStorageEvents.length).toBe(0);

    // After 200ms, storage items should be sent / 200ms 후에는 storage items가 전송되어야 함
    await new Promise((resolve) => setTimeout(resolve, 200));
    const lateStorageEvents = sentEvents.filter(
      (e) => e.method === 'DOMStorage.domStorageItemAdded'
    );
    expect(lateStorageEvents.length).toBeGreaterThan(0);
  });

  test('should send storage items in correct order / storage items가 올바른 순서로 전송', async () => {
    const parsed = {
      method: 'DOMStorage.enable',
      id: 1,
    };

    handleDOMStorageEnable(parsed, context);

    // Wait for all events / 모든 이벤트 대기
    await new Promise((resolve) => setTimeout(resolve, 300));

    const storageEvents = sentEvents.filter((e) => e.method === 'DOMStorage.domStorageItemAdded');
    expect(storageEvents.length).toBe(2);

    // First should be localStorage / 첫 번째는 localStorage여야 함
    const firstEvent = storageEvents[0].params as { storageId: { isLocalStorage: boolean } };
    expect(firstEvent.storageId.isLocalStorage).toBe(true);

    // Second should be sessionStorage / 두 번째는 sessionStorage여야 함
    const secondEvent = storageEvents[1].params as { storageId: { isLocalStorage: boolean } };
    expect(secondEvent.storageId.isLocalStorage).toBe(false);
  });
});

describe('handleGetDOMStorageItems', () => {
  let context: CommandHandlerContext;
  let postMessageSpy: ReturnType<typeof mock>;

  beforeEach(() => {
    postMessageSpy = mock(() => {});
    const mockWindow = {
      postMessage: postMessageSpy,
    } as unknown as Window;

    context = {
      file: createTestFile({
        version: '1.0.0',
        exportDate: '',
        clientId: '',
        events: [],
        localStorage: [['key1', 'value1']],
        sessionStorage: [['sessionKey', 'sessionValue']],
      }),
      cdpMessages: [],
      responseBodyStore: createResponseBodyStore(),
      targetWindow: mockWindow,
    };
  });

  test('should return localStorage items / localStorage 항목 반환', async () => {
    const parsed = {
      method: 'DOMStorage.getDOMStorageItems',
      id: 1,
      params: {
        storageId: {
          isLocalStorage: true,
        },
      },
    };

    const result = handleGetDOMStorageItems(parsed, context);

    expect(result).toBe(true);

    // Wait for async operation / 비동기 작업 대기
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(postMessageSpy).toHaveBeenCalled();
  });

  test('should return sessionStorage items / sessionStorage 항목 반환', async () => {
    const parsed = {
      method: 'DOMStorage.getDOMStorageItems',
      id: 1,
      params: {
        storageId: {
          isLocalStorage: false,
        },
      },
    };

    const result = handleGetDOMStorageItems(parsed, context);

    expect(result).toBe(true);

    // Wait for async operation / 비동기 작업 대기
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(postMessageSpy).toHaveBeenCalled();
  });
});

describe('handleCDPCommand', () => {
  let context: CommandHandlerContext;
  let postMessageSpy: ReturnType<typeof mock>;

  beforeEach(() => {
    postMessageSpy = mock(() => {});
    const mockWindow = {
      postMessage: postMessageSpy,
    } as unknown as Window;

    // Mock window.location / window.location 모킹
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:1420', href: 'http://localhost:1420' },
      writable: true,
    });

    context = {
      file: createTestFile({ version: '1.0.0', exportDate: '', clientId: '', events: [] }),
      cdpMessages: [],
      responseBodyStore: createResponseBodyStore(),
      targetWindow: mockWindow,
    };
  });

  test('should handle Network.getResponseBody / Network.getResponseBody 처리', () => {
    context.responseBodyStore.store('req-1', 'body');
    const parsed = {
      method: 'Network.getResponseBody',
      id: 1,
      params: { requestId: 'req-1' },
    };

    const result = handleCDPCommand(parsed, context);
    expect(result).toBe(true);
  });

  test('should handle DOM.getDocument / DOM.getDocument 처리', () => {
    const parsed = {
      method: 'DOM.getDocument',
      id: 1,
    };

    const result = handleCDPCommand(parsed, context);
    expect(result).toBe(true);
  });

  test('should handle Network.getCookies / Network.getCookies 처리', () => {
    const parsed = {
      method: 'Network.getCookies',
      id: 1,
    };

    const result = handleCDPCommand(parsed, context);
    expect(result).toBe(true);
  });

  test('should handle Page.getResourceTree / Page.getResourceTree 처리', () => {
    const parsed = {
      method: 'Page.getResourceTree',
      id: 1,
    };

    const result = handleCDPCommand(parsed, context);
    expect(result).toBe(true);
  });

  test('should handle Storage.getStorageKey / Storage.getStorageKey 처리', () => {
    const parsed = {
      method: 'Storage.getStorageKey',
      id: 1,
    };

    const result = handleCDPCommand(parsed, context);
    expect(result).toBe(true);
  });

  test('should return false for unknown command / 알 수 없는 명령에 대해 false 반환', () => {
    const parsed = {
      method: 'Unknown.method',
      id: 1,
    };

    const result = handleCDPCommand(parsed, context);
    expect(result).toBe(false);
  });
});
