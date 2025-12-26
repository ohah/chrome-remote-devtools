// Message sender utilities tests / 메시지 전송 유틸리티 테스트
import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import {
  sendFakeResponse,
  sendBufferedMessages,
  sendStorageItemsAsEvents,
} from '../message-sender';
import { createResponseBodyStore } from '../response-body-store';
import type { PostMessageCDPMessage } from '@/shared/lib/file-to-cdp';

describe('sendFakeResponse', () => {
  let mockWindow: Window;
  let postMessageSpy: ReturnType<typeof mock>;

  beforeEach(() => {
    postMessageSpy = mock(() => {});
    mockWindow = {
      postMessage: postMessageSpy,
    } as unknown as Window;
  });

  afterEach(() => {
    // Clear any pending timers / 대기 중인 타이머 정리
  });

  test('should send postMessage response / postMessage로 응답 전송', async () => {
    sendFakeResponse(mockWindow, 1, { result: 'test' });

    // Should not be called immediately / 즉시 호출되지 않아야 함
    expect(postMessageSpy).toHaveBeenCalledTimes(0);

    // Wait for setTimeout / setTimeout 대기
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(postMessageSpy).toHaveBeenCalledTimes(1);
    const callArgs = postMessageSpy.mock.calls[0];
    expect(callArgs[0].type).toBe('CDP_MESSAGE');
    const message = JSON.parse(callArgs[0].message);
    expect(message.id).toBe(1);
    expect(message.result).toEqual({ result: 'test' });
  });

  test('should send response after 10ms delay / 10ms 후 응답 전송되는지 확인', async () => {
    const startTime = Date.now();
    sendFakeResponse(mockWindow, 1);

    await new Promise((resolve) => setTimeout(resolve, 20));

    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeGreaterThanOrEqual(10);
    expect(postMessageSpy).toHaveBeenCalledTimes(1);
  });

  test('should use empty object when result is not provided / result가 제공되지 않으면 빈 객체 사용', async () => {
    sendFakeResponse(mockWindow, 1);

    await new Promise((resolve) => setTimeout(resolve, 20));

    const callArgs = postMessageSpy.mock.calls[0];
    const message = JSON.parse(callArgs[0].message);
    expect(message.result).toEqual({});
  });
});

describe('sendBufferedMessages', () => {
  let mockWindow: Window;
  let postMessageSpy: ReturnType<typeof mock>;
  let responseBodyStore: ReturnType<typeof createResponseBodyStore>;

  beforeEach(() => {
    postMessageSpy = mock(() => {});
    mockWindow = {
      postMessage: postMessageSpy,
    } as unknown as Window;
    responseBodyStore = createResponseBodyStore();
  });

  test('should send messages in batches / 메시지 배치 전송', async () => {
    const messages: PostMessageCDPMessage[] = Array.from({ length: 150 }, (_, i) => ({
      type: 'CDP_MESSAGE',
      message: JSON.stringify({ method: `Test.${i}`, params: {} }),
    }));

    await sendBufferedMessages(messages, mockWindow, responseBodyStore);

    // Should send all messages / 모든 메시지가 전송되어야 함
    expect(postMessageSpy).toHaveBeenCalledTimes(150);
  });

  test('should extract and store response bodies from responseReceived events / responseReceived 이벤트에서 body 추출 및 저장', async () => {
    const messages: PostMessageCDPMessage[] = [
      {
        type: 'CDP_MESSAGE',
        message: JSON.stringify({
          method: 'Network.responseReceived',
          params: {
            requestId: 'req-1',
            response: {
              body: 'test body',
            },
          },
        }),
      },
    ];

    await sendBufferedMessages(messages, mockWindow, responseBodyStore);

    expect(responseBodyStore.has('req-1')).toBe(true);
    expect(responseBodyStore.get('req-1')).toBe('test body');
  });

  test('should delay 10ms between batches / 배치 간 10ms 지연 확인', async () => {
    const messages: PostMessageCDPMessage[] = Array.from({ length: 150 }, (_, i) => ({
      type: 'CDP_MESSAGE',
      message: JSON.stringify({ method: `Test.${i}`, params: {} }),
    }));

    const startTime = Date.now();
    await sendBufferedMessages(messages, mockWindow, responseBodyStore);
    const elapsed = Date.now() - startTime;

    // Should have at least one 10ms delay between batches / 배치 간 최소 1번의 10ms 지연이 있어야 함
    expect(elapsed).toBeGreaterThanOrEqual(10);
  });

  test('should return early when messages array is empty / 메시지 배열이 비어있으면 조기 반환', async () => {
    await sendBufferedMessages([], mockWindow, responseBodyStore);

    expect(postMessageSpy).toHaveBeenCalledTimes(0);
  });
});

describe('sendStorageItemsAsEvents', () => {
  let mockWindow: Window;
  let postMessageSpy: ReturnType<typeof mock>;
  let sentEvents: Array<{ method: string; params: unknown }>;

  beforeEach(() => {
    sentEvents = [];
    postMessageSpy = mock((msg: unknown) => {
      const parsed = JSON.parse((msg as { message: string }).message);
      sentEvents.push({
        method: parsed.method,
        params: parsed.params,
      });
    });
    mockWindow = {
      postMessage: postMessageSpy,
    } as unknown as Window;

    // Mock window.location.origin / window.location.origin 모킹
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:1420' },
      writable: true,
    });
  });

  test('should send localStorage and sessionStorage items as events / localStorage/sessionStorage 항목을 이벤트로 전송', () => {
    const storageItems = {
      localStorage: [
        ['key1', 'value1'],
        ['key2', 'value2'],
      ],
      sessionStorage: [['sessionKey', 'sessionValue']],
    };

    sendStorageItemsAsEvents(storageItems, mockWindow);

    expect(postMessageSpy).toHaveBeenCalledTimes(3);
    expect(sentEvents).toHaveLength(3);
  });

  test('should send localStorage items first, then sessionStorage / localStorage 먼저, sessionStorage 나중에 전송', () => {
    const storageItems = {
      localStorage: [['localKey', 'localValue']],
      sessionStorage: [['sessionKey', 'sessionValue']],
    };

    sendStorageItemsAsEvents(storageItems, mockWindow);

    // First two should be localStorage / 처음 두 개는 localStorage여야 함
    expect(sentEvents[0].method).toBe('DOMStorage.domStorageItemAdded');
    expect(
      (sentEvents[0].params as { storageId: { isLocalStorage: boolean } }).storageId.isLocalStorage
    ).toBe(true);

    // Last one should be sessionStorage / 마지막은 sessionStorage여야 함
    expect(sentEvents[1].method).toBe('DOMStorage.domStorageItemAdded');
    expect(
      (sentEvents[1].params as { storageId: { isLocalStorage: boolean } }).storageId.isLocalStorage
    ).toBe(false);
  });

  test('should send all localStorage items before sessionStorage / 모든 localStorage 항목을 sessionStorage 전에 전송', () => {
    const storageItems = {
      localStorage: [
        ['localKey1', 'localValue1'],
        ['localKey2', 'localValue2'],
      ],
      sessionStorage: [['sessionKey', 'sessionValue']],
    };

    sendStorageItemsAsEvents(storageItems, mockWindow);

    // All localStorage events should come first / 모든 localStorage 이벤트가 먼저 와야 함
    expect(sentEvents[0].method).toBe('DOMStorage.domStorageItemAdded');
    expect(
      (sentEvents[0].params as { storageId: { isLocalStorage: boolean } }).storageId.isLocalStorage
    ).toBe(true);
    expect(sentEvents[1].method).toBe('DOMStorage.domStorageItemAdded');
    expect(
      (sentEvents[1].params as { storageId: { isLocalStorage: boolean } }).storageId.isLocalStorage
    ).toBe(true);

    // Then sessionStorage / 그 다음 sessionStorage
    expect(sentEvents[2].method).toBe('DOMStorage.domStorageItemAdded');
    expect(
      (sentEvents[2].params as { storageId: { isLocalStorage: boolean } }).storageId.isLocalStorage
    ).toBe(false);
  });

  test('should include correct storageId in events / 이벤트에 올바른 storageId 포함', () => {
    const storageItems = {
      localStorage: [['key1', 'value1']],
      sessionStorage: [],
    };

    sendStorageItemsAsEvents(storageItems, mockWindow);

    const eventParams = sentEvents[0].params as {
      storageId: { isLocalStorage: boolean; storageKey: string; securityOrigin: string };
      key: string;
      newValue: string;
    };
    expect(eventParams.storageId.isLocalStorage).toBe(true);
    expect(eventParams.storageId.storageKey).toBe('http://localhost:1420');
    expect(eventParams.storageId.securityOrigin).toBe('http://localhost:1420');
    expect(eventParams.key).toBe('key1');
    expect(eventParams.newValue).toBe('value1');
  });
});
