/**
 * CDP domain protocol tests / CDP domain protocol 테스트
 * Covers Event constants (aligned with web client protocol.ts) / Event 상수 (웹 클라이언트 protocol과 동일)
 */
import { describe, test, expect } from 'bun:test';
import { Event } from '../cdp/domain/protocol';

describe('cdp/domain/protocol', () => {
  test('Event.consoleAPICalled equals Runtime.consoleAPICalled / Event.consoleAPICalled는 Runtime.consoleAPICalled', () => {
    expect(Event.consoleAPICalled).toBe('Runtime.consoleAPICalled');
  });

  test('Event.executionContextCreated equals Runtime.executionContextCreated / Event.executionContextCreated는 Runtime.executionContextCreated', () => {
    expect(Event.executionContextCreated).toBe('Runtime.executionContextCreated');
  });

  test('Event.exceptionThrown equals Runtime.exceptionThrown / Event.exceptionThrown는 Runtime.exceptionThrown', () => {
    expect(Event.exceptionThrown).toBe('Runtime.exceptionThrown');
  });

  test('Event.requestWillBeSent equals Network.requestWillBeSent / Event.requestWillBeSent는 Network.requestWillBeSent', () => {
    expect(Event.requestWillBeSent).toBe('Network.requestWillBeSent');
  });

  test('Event.loadingFinished equals Network.loadingFinished / Event.loadingFinished는 Network.loadingFinished', () => {
    expect(Event.loadingFinished).toBe('Network.loadingFinished');
  });

  test('Event.loadingFailed equals Network.loadingFailed / Event.loadingFailed는 Network.loadingFailed', () => {
    expect(Event.loadingFailed).toBe('Network.loadingFailed');
  });

  test('Event.responseReceived equals Network.responseReceived / Event.responseReceived는 Network.responseReceived', () => {
    expect(Event.responseReceived).toBe('Network.responseReceived');
  });

  test('Event.responseReceivedExtraInfo equals Network.responseReceivedExtraInfo / Event.responseReceivedExtraInfo는 Network.responseReceivedExtraInfo', () => {
    expect(Event.responseReceivedExtraInfo).toBe('Network.responseReceivedExtraInfo');
  });

  test('all Event values are CDP method strings (Domain.method) / Event 값은 CDP 메서드 문자열(Domain.method)', () => {
    const values = Object.values(Event);
    expect(values.length).toBeGreaterThan(0);
    for (const v of values) {
      expect(typeof v).toBe('string');
      expect(v).toMatch(/^[A-Za-z]+\.[a-zA-Z]+$/);
    }
  });
});
