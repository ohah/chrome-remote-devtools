// Response body store tests / 응답 본문 저장소 테스트
import { describe, test, expect, beforeEach } from 'bun:test';
import { createResponseBodyStore } from '../response-body-store';
import type { ResponseBodyStore } from '../../types';

describe('createResponseBodyStore', () => {
  let store: ResponseBodyStore;

  beforeEach(() => {
    store = createResponseBodyStore();
  });

  test('should create response body store / 저장소 생성', () => {
    expect(store).toBeDefined();
    expect(typeof store.store).toBe('function');
    expect(typeof store.get).toBe('function');
    expect(typeof store.has).toBe('function');
    expect(typeof store.clear).toBe('function');
  });

  test('should store requestId and body / requestId와 body 저장', () => {
    store.store('request-1', 'test body');
    expect(store.has('request-1')).toBe(true);
    expect(store.get('request-1')).toBe('test body');
  });

  test('should get stored body / 저장된 body 조회', () => {
    store.store('request-1', 'body 1');
    store.store('request-2', 'body 2');

    expect(store.get('request-1')).toBe('body 1');
    expect(store.get('request-2')).toBe('body 2');
  });

  test('should return undefined for non-existent requestId / 존재하지 않는 requestId에 대해 undefined 반환', () => {
    expect(store.get('non-existent')).toBeUndefined();
  });

  test('should check if response body exists / 응답 본문 존재 여부 확인', () => {
    expect(store.has('request-1')).toBe(false);

    store.store('request-1', 'body');
    expect(store.has('request-1')).toBe(true);
  });

  test('should not store empty requestId or body / 빈 requestId나 body는 저장하지 않음', () => {
    store.store('', 'body');
    store.store('request-1', '');

    expect(store.has('')).toBe(false);
    expect(store.has('request-1')).toBe(false);
  });

  test('should clear all stored response bodies / 저장된 모든 응답 본문 삭제', () => {
    store.store('request-1', 'body 1');
    store.store('request-2', 'body 2');

    expect(store.has('request-1')).toBe(true);
    expect(store.has('request-2')).toBe(true);

    store.clear();

    expect(store.has('request-1')).toBe(false);
    expect(store.has('request-2')).toBe(false);
    expect(store.get('request-1')).toBeUndefined();
    expect(store.get('request-2')).toBeUndefined();
  });
});
