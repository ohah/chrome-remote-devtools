/**
 * getObjectProperties tests / getObjectProperties 테스트
 * Covers Runtime.getProperties response shape and edge cases / Runtime.getProperties 응답 형태·엣지 케이스
 */
import { describe, test, expect } from 'bun:test';
import { getOrCreateObjectId } from '../cdp/common/object-store';
import { getObjectProperties, type PropertyDescriptor } from '../cdp/common/get-object-properties';

describe('get-object-properties', () => {
  test('getObjectProperties returns [] for unknown objectId / 알 수 없는 objectId는 []', () => {
    expect(getObjectProperties('unknown-id')).toEqual([]);
  });

  test('getObjectProperties returns PropertyDescriptor[] for plain object / 일반 객체는 PropertyDescriptor[]', () => {
    const obj = { a: 1, b: 'two', c: true };
    const id = getOrCreateObjectId(obj);
    const result = getObjectProperties(id);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(3);
    const names = result.map((p: PropertyDescriptor) => p.name).sort();
    expect(names).toEqual(['a', 'b', 'c']);
    const aDesc = result.find((p) => p.name === 'a');
    expect(aDesc?.value).toBeDefined();
    expect(aDesc?.value?.type).toBe('number');
    expect(aDesc?.value?.value).toBe(1);
    const bDesc = result.find((p) => p.name === 'b');
    expect(bDesc?.value?.type).toBe('string');
    expect(bDesc?.value?.value).toBe('two');
  });

  test('getObjectProperties returns properties for array (indices and length) / 배열은 인덱스·length 속성', () => {
    const arr = [10, 20, 30];
    const id = getOrCreateObjectId(arr);
    const result = getObjectProperties(id);
    expect(result.length).toBeGreaterThanOrEqual(3);
    expect(result.find((p) => p.name === '0')?.value?.value).toBe(10);
    expect(result.find((p) => p.name === '1')?.value?.value).toBe(20);
    expect(result.find((p) => p.name === '2')?.value?.value).toBe(30);
  });

  test('getObjectProperties skips __proto__ / __proto__ 제외', () => {
    const obj = { x: 1 };
    const id = getOrCreateObjectId(obj);
    const result = getObjectProperties(id);
    expect(result.some((p) => p.name === '__proto__')).toBe(false);
  });
});
