/**
 * Object store tests / object store 테스트
 * Covers getOrCreateObjectId, getObject, releaseObject, eviction at limit / getOrCreateObjectId·getObject·releaseObject·한도 시 eviction
 */
import { describe, test, expect } from 'bun:test';
import { getOrCreateObjectId, getObject, releaseObject } from '../cdp/common/object-store';

describe('object-store', () => {
  test('getOrCreateObjectId returns same id for same object reference / 동일 참조는 동일 id', () => {
    const obj = { a: 1 };
    const id1 = getOrCreateObjectId(obj);
    const id2 = getOrCreateObjectId(obj);
    expect(id1).toBe(id2);
  });

  test('getOrCreateObjectId returns different ids for different objects / 서로 다른 객체는 다른 id', () => {
    const id1 = getOrCreateObjectId({ a: 1 });
    const id2 = getOrCreateObjectId({ b: 2 });
    expect(id1).not.toBe(id2);
  });

  test('getObject returns stored value for valid objectId / 유효한 objectId로 저장된 값 반환', () => {
    const obj = { x: 'y' };
    const id = getOrCreateObjectId(obj);
    expect(getObject(id)).toBe(obj);
  });

  test('getObject returns undefined for unknown objectId / 알 수 없는 objectId는 undefined', () => {
    expect(getObject('unknown-id-99999')).toBeUndefined();
  });

  test('releaseObject removes object; getObject returns undefined after release / release 후 getObject는 undefined', () => {
    const obj = { z: 1 };
    const id = getOrCreateObjectId(obj);
    expect(getObject(id)).toBe(obj);
    releaseObject(id);
    expect(getObject(id)).toBeUndefined();
  });

  test('releaseObject is no-op for unknown objectId / 알 수 없는 objectId로 release는 no-op', () => {
    releaseObject('nonexistent');
    expect(getObject('nonexistent')).toBeUndefined();
  });

  test('eviction at MAX_OBJECT_STORE_SIZE: oldest entry evicted when limit exceeded / 한도 초과 시 가장 오래된 항목 제거', () => {
    const firstObj = { first: true };
    const firstId = getOrCreateObjectId(firstObj);
    // MAX is 10_000; fill to 10_000 then add one more to evict oldest (firstObj)
    for (let i = 0; i < 10_000; i++) {
      getOrCreateObjectId({ index: i });
    }
    getOrCreateObjectId({ trigger: 'eviction' });
    expect(getObject(firstId)).toBeUndefined();
  });
});
