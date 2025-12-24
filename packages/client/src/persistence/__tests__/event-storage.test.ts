// Event storage tests / 이벤트 저장소 테스트
import 'fake-indexeddb/auto'; // Import fake-indexeddb for testing / 테스트를 위한 fake-indexeddb import
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { EventStorage } from '../event-storage';

describe('EventStorage', () => {
  let storage1: EventStorage;
  let storage2: EventStorage;
  const clientId1 = 'client-1';
  const clientId2 = 'client-2';

  beforeEach(async () => {
    // Create separate storage instances for different clients / 다른 클라이언트를 위한 별도 저장소 인스턴스 생성
    storage1 = new EventStorage({
      clientId: clientId1,
      enableCompression: false, // Disable compression for simpler testing / 테스트 단순화를 위해 압축 비활성화
      maxStoredEvents: 100,
      maxStorageSize: 10 * 1024 * 1024, // 10MB for testing / 테스트용 10MB
    });
    await storage1.init();

    storage2 = new EventStorage({
      clientId: clientId2,
      enableCompression: false,
      maxStoredEvents: 100,
      maxStorageSize: 10 * 1024 * 1024,
    });
    await storage2.init();
  });

  afterEach(async () => {
    // Clean up / 정리
    try {
      await storage1.clearEvents();
      await storage2.clearEvents();
    } catch {
      // Ignore cleanup errors / 정리 에러 무시
    }
  });

  test('should initialize database / 데이터베이스 초기화', async () => {
    const storage = new EventStorage({
      clientId: 'test-client',
      enableCompression: false,
    });
    await storage.init();
    expect(storage).toBeDefined();
  });

  test('should require clientId / clientId 필수', () => {
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new EventStorage({} as any);
    }).toThrow('clientId is required');
  });

  test('should save and retrieve events / 이벤트 저장 및 조회', async () => {
    const method = 'Runtime.consoleAPICalled';
    const params = {
      type: 'log',
      args: ['Hello', 'World'],
      executionContextId: 1,
      timestamp: Date.now(),
    };

    await storage1.saveEvent(method, params);
    const events = await storage1.getEvents();

    expect(events.length).toBe(1);
    const event = events[0];
    expect(event).toBeDefined();
    expect(event?.method).toBe(method);
    expect(event?.params).toEqual(params);
    expect(event?.timestamp).toBeDefined();
  });

  test('should filter events by clientId / clientId로 이벤트 필터링', async () => {
    // Save events for different clients / 다른 클라이언트의 이벤트 저장
    await storage1.saveEvent('Runtime.consoleAPICalled', { type: 'log', args: ['Client 1'] });
    await storage2.saveEvent('Runtime.consoleAPICalled', { type: 'log', args: ['Client 2'] });

    const events1 = await storage1.getEvents();
    const events2 = await storage2.getEvents();

    expect(events1.length).toBe(1);
    expect(events2.length).toBe(1);
    const event1 = events1[0];
    const event2 = events2[0];
    expect(event1).toBeDefined();
    expect(event2).toBeDefined();
    if (event1 && event2) {
      expect((event1.params as { args: string[] }).args[0]).toBe('Client 1');
      expect((event2.params as { args: string[] }).args[0]).toBe('Client 2');
    }
  });

  test('should only store allowed events / 허용된 이벤트만 저장', async () => {
    // Allowed events / 허용된 이벤트
    await storage1.saveEvent('Runtime.consoleAPICalled', { type: 'log' });
    await storage1.saveEvent('Network.requestWillBeSent', { requestId: '123' });
    await storage1.saveEvent('SessionReplay.eventRecorded', { events: [] });

    // Disallowed events (DOM events) / 허용되지 않은 이벤트 (DOM 이벤트)
    await storage1.saveEvent('DOM.childNodeInserted', { nodeId: 1 });
    await storage1.saveEvent('DOM.attributeModified', { nodeId: 1 });

    const events = await storage1.getEvents();
    // Should only have 3 events (console, network, session replay) / 3개 이벤트만 있어야 함 (console, network, session replay)
    expect(events.length).toBe(3);
    expect(events.every((e) => e && !e.method.startsWith('DOM.'))).toBe(true);
  });

  test('should get events after timestamp / 타임스탬프 이후 이벤트 조회', async () => {
    // Save first event / 첫 번째 이벤트 저장
    await storage1.saveEvent('Runtime.consoleAPICalled', { type: 'log', args: ['First'] });
    // Wait to ensure timestamp difference / 타임스탬프 차이를 보장하기 위해 대기
    await new Promise((resolve) => setTimeout(resolve, 20));

    // Capture timestamp after first event / 첫 번째 이벤트 이후 타임스탬프 캡처
    const afterTime = Date.now();
    // Wait to ensure subsequent events have later timestamps / 이후 이벤트가 더 늦은 타임스탬프를 갖도록 대기
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Save events after the captured timestamp / 캡처된 타임스탬프 이후 이벤트 저장
    await storage1.saveEvent('Runtime.consoleAPICalled', { type: 'log', args: ['Second'] });
    await storage1.saveEvent('Network.requestWillBeSent', { requestId: '123' });

    const eventsAfter = await storage1.getEventsAfter(afterTime);
    // Should have exactly 2 events saved after afterTime / afterTime 이후에 저장된 정확히 2개 이벤트
    expect(eventsAfter.length).toBe(2);
    expect(eventsAfter.every((e) => e.timestamp >= afterTime)).toBe(true);
    // Verify event order / 이벤트 순서 확인
    expect(eventsAfter[0]?.method).toBe('Runtime.consoleAPICalled');
    expect(eventsAfter[1]?.method).toBe('Network.requestWillBeSent');
  });

  test('should clear all events / 모든 이벤트 삭제', async () => {
    await storage1.saveEvent('Runtime.consoleAPICalled', { type: 'log' });
    await storage1.saveEvent('Network.requestWillBeSent', { requestId: '123' });

    await storage1.clearEvents();
    const events = await storage1.getEvents();
    expect(events.length).toBe(0);
  });

  test('should clear events before timestamp / 타임스탬프 이전 이벤트 삭제', async () => {
    await storage1.saveEvent('Runtime.consoleAPICalled', { type: 'log', args: ['First'] });

    await new Promise((resolve) => setTimeout(resolve, 10));
    const cutoffTime = Date.now();

    await storage1.saveEvent('Runtime.consoleAPICalled', { type: 'log', args: ['Second'] });
    await storage1.saveEvent('Network.requestWillBeSent', { requestId: '123' });

    await storage1.clearEventsBefore(cutoffTime);
    const events = await storage1.getEvents();
    expect(events.length).toBe(2);
    expect(events.every((e) => e.timestamp >= cutoffTime)).toBe(true);
  });

  test('should handle compression when enabled / 압축 활성화 시 처리', async () => {
    if (typeof CompressionStream === 'undefined' || typeof DecompressionStream === 'undefined') {
      console.log(
        'CompressionStream not supported, skipping test / CompressionStream 미지원, 테스트 건너뛰기'
      );
      return;
    }

    const compressedStorage = new EventStorage({
      clientId: 'compressed-client',
      enableCompression: true,
      maxStoredEvents: 100,
    });
    await compressedStorage.init();

    const method = 'Network.requestWillBeSent';
    const params = {
      requestId: '12345',
      request: {
        url: 'https://example.com',
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      },
    };

    const savePromise = compressedStorage.saveEvent(method, params);
    const saveTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Save timeout')), 3000)
    );
    await Promise.race([savePromise, saveTimeout]);

    const getPromise = compressedStorage.getEvents();
    const getTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Get timeout')), 3000)
    );
    const events = await Promise.race([getPromise, getTimeout]);

    expect(events.length).toBe(1);
    const event = events[0];
    expect(event).toBeDefined();
    expect(event?.method).toBe(method);
    expect(event?.params).toEqual(params);

    await compressedStorage.clearEvents();
  });

  test('should enforce max event count limit / 최대 이벤트 수 제한 적용', async () => {
    const limitedStorage = new EventStorage({
      clientId: 'limited-client',
      enableCompression: false,
      maxStoredEvents: 5, // Limit to 5 events / 5개 이벤트로 제한
    });
    await limitedStorage.init();

    // Save more than limit / 제한보다 많이 저장
    for (let i = 0; i < 10; i++) {
      await limitedStorage.saveEvent('Runtime.consoleAPICalled', {
        type: 'log',
        args: [`Event ${i}`],
      });
    }

    const events = await limitedStorage.getEvents();
    // Should not exceed max / 최대값을 초과하지 않아야 함
    expect(events.length).toBeLessThanOrEqual(5);

    await limitedStorage.clearEvents();
  });

  test('should handle storage errors gracefully / 저장 에러를 우아하게 처리', async () => {
    // Save valid event / 유효한 이벤트 저장
    await storage1.saveEvent('Runtime.consoleAPICalled', { type: 'log' });

    // Should not throw on subsequent saves / 이후 저장에서 에러를 던지지 않아야 함
    // saveEvent returns Promise<void> and resolves even on errors / saveEvent는 Promise<void>를 반환하고 에러 시에도 resolve
    await expect(
      storage1.saveEvent('Network.requestWillBeSent', { requestId: '123' })
    ).resolves.toBeUndefined();
  });

  test('should maintain event order by timestamp / 타임스탬프 순서 유지', async () => {
    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => setTimeout(resolve, 5)); // Small delay / 작은 지연
      await storage1.saveEvent('Runtime.consoleAPICalled', { type: 'log', args: [`Event ${i}`] });
    }

    const retrieved = await storage1.getEvents();
    expect(retrieved.length).toBe(5);

    // Check if events are in chronological order / 이벤트가 시간순으로 정렬되었는지 확인
    for (let i = 1; i < retrieved.length; i++) {
      const prev = retrieved[i - 1];
      const curr = retrieved[i];
      expect(prev).toBeDefined();
      expect(curr).toBeDefined();
      expect(curr?.timestamp).toBeGreaterThanOrEqual(prev?.timestamp || 0);
    }
  });

  test('should handle multiple clients independently / 여러 클라이언트를 독립적으로 처리', async () => {
    // Save events for both clients / 두 클라이언트 모두에 이벤트 저장
    await storage1.saveEvent('Runtime.consoleAPICalled', {
      type: 'log',
      args: ['Client 1 - Event 1'],
    });
    await storage1.saveEvent('Network.requestWillBeSent', { requestId: 'client1-123' });

    await storage2.saveEvent('Runtime.consoleAPICalled', {
      type: 'log',
      args: ['Client 2 - Event 1'],
    });
    await storage2.saveEvent('Network.requestWillBeSent', { requestId: 'client2-456' });
    await storage2.saveEvent('SessionReplay.eventRecorded', { events: [] });

    const events1 = await storage1.getEvents();
    const events2 = await storage2.getEvents();

    expect(events1.length).toBe(2);
    expect(events2.length).toBe(3);

    // Verify client isolation / 클라이언트 격리 확인
    expect(
      events1.every((e) => {
        const params = e.params as { requestId?: string };
        return params?.requestId !== 'client2-456';
      })
    ).toBe(true);
    expect(
      events2.every((e) => {
        const params = e.params as { requestId?: string };
        return params?.requestId !== 'client1-123';
      })
    ).toBe(true);
  });
});
