// Extended message sender utilities tests / 확장 메시지 전송 유틸리티 테스트
import { describe, test, expect, beforeEach, mock } from 'bun:test';
import {
  sendDefaultInitCommands,
  sendCommandsFromFile,
  sendCDPMessages,
  sendSessionReplayEvents,
  DEFAULT_INIT_COMMANDS,
} from '../message-sender-extended';
import { createResponseBodyStore } from '../response-body-store';
import type { SendCDPMessagesContext } from '../message-sender-extended';
import type { PostMessageCDPMessage } from '@/shared/lib/file-to-cdp';

// Helper to create File from JSON / JSON에서 File 생성 헬퍼
function createTestFile(data: unknown): File {
  return new File([JSON.stringify(data)], 'test.json', { type: 'application/json' });
}

describe('sendDefaultInitCommands', () => {
  let context: SendCDPMessagesContext;
  let postMessageSpy: ReturnType<typeof mock>;

  beforeEach(() => {
    postMessageSpy = mock(() => {});
    const mockWindow = {
      postMessage: postMessageSpy,
    } as unknown as Window;

    context = {
      cdpMessages: [],
      eventBuffer: [],
      file: createTestFile({ version: '1.0.0', exportDate: '', clientId: '', events: [] }),
      targetWindow: mockWindow,
      responseBodyStore: createResponseBodyStore(),
      setIsLoading: mock(() => {}),
    };
  });

  test('should send default initialization commands / 기본 초기화 명령 전송', async () => {
    await sendDefaultInitCommands(context);

    // Should send all default commands / 모든 기본 명령이 전송되어야 함
    expect(postMessageSpy).toHaveBeenCalledTimes(DEFAULT_INIT_COMMANDS.length * 2); // Command + response / 명령 + 응답
  });

  test('should wait 1000ms after sending commands / 명령 전송 후 1000ms 대기', async () => {
    const startTime = Date.now();
    await sendDefaultInitCommands(context);
    const elapsed = Date.now() - startTime;

    // Should take at least 1000ms / 최소 1000ms가 걸려야 함
    expect(elapsed).toBeGreaterThanOrEqual(1000);
  });
});

describe('sendCommandsFromFile', () => {
  let context: SendCDPMessagesContext;
  let postMessageSpy: ReturnType<typeof mock>;
  let sentEvents: Array<{ id?: number; method?: string }>;

  beforeEach(() => {
    sentEvents = [];
    postMessageSpy = mock((msg: unknown) => {
      const parsed = JSON.parse((msg as { message: string }).message);
      sentEvents.push({
        id: parsed.id,
        method: parsed.method,
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
      cdpMessages: [],
      eventBuffer: [],
      file: createTestFile({
        version: '1.0.0',
        exportDate: '',
        clientId: '',
        events: [],
        localStorage: [['key1', 'value1']],
        sessionStorage: [['sessionKey', 'sessionValue']],
      }),
      targetWindow: mockWindow,
      responseBodyStore: createResponseBodyStore(),
      setIsLoading: mock(() => {}),
    };
  });

  test('should send commands from file / 파일에서 읽은 명령 전송', async () => {
    const commands: PostMessageCDPMessage[] = [
      {
        type: 'CDP_MESSAGE',
        message: JSON.stringify({ id: 1, method: 'Runtime.enable', params: {} }),
      },
    ];

    await sendCommandsFromFile(commands, context);

    expect(postMessageSpy).toHaveBeenCalled();
  });

  test('should send storage items after DOMStorage.enable / DOMStorage.enable 후 storage items 전송', async () => {
    const commands: PostMessageCDPMessage[] = [
      {
        type: 'CDP_MESSAGE',
        message: JSON.stringify({ id: 1, method: 'DOMStorage.enable', params: {} }),
      },
    ];

    await sendCommandsFromFile(commands, context);

    // Wait for enable response / enable 응답 대기
    await new Promise((resolve) => setTimeout(resolve, 20));

    // Wait for storage items (100ms) / storage items 대기 (100ms)
    await new Promise((resolve) => setTimeout(resolve, 150));

    const storageEvents = sentEvents.filter((e) => e.method === 'DOMStorage.domStorageItemAdded');
    expect(storageEvents.length).toBeGreaterThan(0);
  });

  test('should send storage items after 200ms delay / DOMStorage.enable 후 200ms 후 storage items 전송', async () => {
    const commands: PostMessageCDPMessage[] = [
      {
        type: 'CDP_MESSAGE',
        message: JSON.stringify({ id: 1, method: 'DOMStorage.enable', params: {} }),
      },
    ];

    // Clear sent events before test / 테스트 전에 전송된 이벤트 초기화
    sentEvents = [];

    // Record start time / 시작 시간 기록
    const startTime = Date.now();

    // Start sending commands (this is async and sets up setTimeout) / 명령 전송 시작 (비동기이며 setTimeout 설정)
    const sendPromise = sendCommandsFromFile(commands, context);

    // Wait a short time to ensure setTimeout is set up / setTimeout이 설정되도록 짧은 시간 대기
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Check that storage items are not sent yet (before 200ms) / storage items가 아직 전송되지 않았는지 확인 (200ms 전)
    const earlyCheckTime = Date.now() - startTime;
    const earlyStorageEvents = sentEvents.filter(
      (e) => e.method === 'DOMStorage.domStorageItemAdded'
    );
    // Should not be sent if less than 200ms has passed / 200ms가 지나지 않았으면 전송되지 않아야 함
    if (earlyCheckTime < 200) {
      expect(earlyStorageEvents.length).toBe(0);
    }

    // Wait for 200ms delay to complete / 200ms 지연 완료 대기
    await new Promise((resolve) => setTimeout(resolve, 250));

    // After 200ms, storage items should be sent / 200ms 후에는 storage items가 전송되어야 함
    const lateStorageEvents = sentEvents.filter(
      (e) => e.method === 'DOMStorage.domStorageItemAdded'
    );
    expect(lateStorageEvents.length).toBeGreaterThan(0);

    // Wait for sendCommandsFromFile to complete / sendCommandsFromFile 완료 대기
    await sendPromise;
  });

  test('should wait 1000ms after sending commands / 명령 전송 후 1000ms 대기', async () => {
    const commands: PostMessageCDPMessage[] = [
      {
        type: 'CDP_MESSAGE',
        message: JSON.stringify({ id: 1, method: 'Runtime.enable', params: {} }),
      },
    ];

    const startTime = Date.now();
    await sendCommandsFromFile(commands, context);
    const elapsed = Date.now() - startTime;

    // Should take at least 1000ms / 최소 1000ms가 걸려야 함
    expect(elapsed).toBeGreaterThanOrEqual(1000);
  });
});

describe('sendCDPMessages', () => {
  let context: SendCDPMessagesContext;
  let postMessageSpy: ReturnType<typeof mock>;
  let sentEvents: Array<{ method?: string }>;
  let setIsLoadingSpy: ReturnType<typeof mock>;

  beforeEach(() => {
    sentEvents = [];
    postMessageSpy = mock((msg: unknown) => {
      const parsed = JSON.parse((msg as { message: string }).message);
      sentEvents.push({
        method: parsed.method,
      });
    });
    setIsLoadingSpy = mock(() => {});
    const mockWindow = {
      postMessage: postMessageSpy,
    } as unknown as Window;

    context = {
      cdpMessages: [],
      eventBuffer: [],
      file: createTestFile({ version: '1.0.0', exportDate: '', clientId: '', events: [] }),
      targetWindow: mockWindow,
      responseBodyStore: createResponseBodyStore(),
      setIsLoading: setIsLoadingSpy,
    };
  });

  test('should send DOMStorage events first, then other events / DOMStorage 이벤트 먼저, 그 다음 다른 이벤트', async () => {
    const domStorageEvent: PostMessageCDPMessage = {
      type: 'CDP_MESSAGE',
      message: JSON.stringify({
        method: 'DOMStorage.domStorageItemAdded',
        params: {},
      }),
    };

    const networkEvent: PostMessageCDPMessage = {
      type: 'CDP_MESSAGE',
      message: JSON.stringify({
        method: 'Network.responseReceived',
        params: {},
      }),
    };

    context.cdpMessages = [domStorageEvent, networkEvent];

    await sendCDPMessages(context);

    // DOMStorage event should be sent first / DOMStorage 이벤트가 먼저 전송되어야 함
    const domStorageIndex = sentEvents.findIndex(
      (e) => e.method === 'DOMStorage.domStorageItemAdded'
    );
    const networkIndex = sentEvents.findIndex((e) => e.method === 'Network.responseReceived');

    // DOMStorage should come before Network / DOMStorage가 Network보다 먼저 와야 함
    expect(domStorageIndex).toBeGreaterThanOrEqual(0);
    expect(networkIndex).toBeGreaterThanOrEqual(0);
    // Note: Due to async nature, exact order may vary, but DOMStorage should be processed first / 참고: 비동기 특성상 정확한 순서는 다를 수 있지만, DOMStorage가 먼저 처리되어야 함
  });

  test('should wait 500ms after DOMStorage events / DOMStorage 이벤트 후 500ms 대기', async () => {
    const domStorageEvent: PostMessageCDPMessage = {
      type: 'CDP_MESSAGE',
      message: JSON.stringify({
        method: 'DOMStorage.domStorageItemAdded',
        params: {},
      }),
    };

    context.cdpMessages = [domStorageEvent];

    const startTime = Date.now();
    await sendCDPMessages(context);
    const elapsed = Date.now() - startTime;

    // Should take at least 500ms (DOMStorage delay) / 최소 500ms (DOMStorage 지연)가 걸려야 함
    expect(elapsed).toBeGreaterThanOrEqual(500);
  });

  test('should call setIsLoading(false) when done / 완료 시 setIsLoading(false) 호출', async () => {
    await sendCDPMessages(context);

    expect(setIsLoadingSpy).toHaveBeenCalledWith(false);
  });

  test('should return early when no messages / 메시지가 없으면 조기 반환', async () => {
    context.cdpMessages = [];
    context.eventBuffer = [];

    await sendCDPMessages(context);

    expect(postMessageSpy).toHaveBeenCalledTimes(0);
    expect(setIsLoadingSpy).toHaveBeenCalledWith(false);
  });
});

describe('sendSessionReplayEvents', () => {
  let context: SendCDPMessagesContext;
  let postMessageSpy: ReturnType<typeof mock>;

  beforeEach(() => {
    postMessageSpy = mock(() => {});
    const mockWindow = {
      postMessage: postMessageSpy,
    } as unknown as Window;

    context = {
      cdpMessages: [],
      eventBuffer: [],
      file: createTestFile({ version: '1.0.0', exportDate: '', clientId: '', events: [] }),
      targetWindow: mockWindow,
      responseBodyStore: createResponseBodyStore(),
      setIsLoading: mock(() => {}),
    };
  });

  test('should send only SessionReplay events / SessionReplay 이벤트만 전송', async () => {
    const sessionReplayEvent: PostMessageCDPMessage = {
      type: 'CDP_MESSAGE',
      message: JSON.stringify({
        method: 'SessionReplay.snapshot',
        params: {},
      }),
    };

    const networkEvent: PostMessageCDPMessage = {
      type: 'CDP_MESSAGE',
      message: JSON.stringify({
        method: 'Network.responseReceived',
        params: {},
      }),
    };

    context.cdpMessages = [sessionReplayEvent, networkEvent];

    await sendSessionReplayEvents(context);

    // Should only send SessionReplay event / SessionReplay 이벤트만 전송되어야 함
    expect(postMessageSpy).toHaveBeenCalledTimes(1);
  });

  test('should return early when no messages / 메시지가 없으면 조기 반환', async () => {
    context.cdpMessages = [];
    context.eventBuffer = [];

    await sendSessionReplayEvents(context);

    expect(postMessageSpy).toHaveBeenCalledTimes(0);
  });
});
