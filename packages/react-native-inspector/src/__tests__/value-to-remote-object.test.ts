/**
 * value-to-remote-object tests / value-to-remote-object 테스트
 * Covers conversion of JS values to CDP RemoteObject for Runtime.consoleAPICalled / Runtime.consoleAPICalled용 RemoteObject 변환
 */
import { describe, test, expect } from 'bun:test';
import { valueToRemoteObject, type RemoteObject } from '../cdp/common/value-to-remote-object';

describe('valueToRemoteObject', () => {
  test('converts null to object subtype null / null을 object subtype null로 변환', () => {
    expect(valueToRemoteObject(null)).toEqual({
      type: 'object',
      subtype: 'null',
      value: null,
    });
  });

  test('converts undefined to type undefined / undefined를 type undefined로 변환', () => {
    expect(valueToRemoteObject(undefined)).toEqual({ type: 'undefined' });
  });

  test('converts boolean to type boolean with value / boolean을 value와 함께 변환', () => {
    expect(valueToRemoteObject(true)).toEqual({ type: 'boolean', value: true });
    expect(valueToRemoteObject(false)).toEqual({ type: 'boolean', value: false });
  });

  test('converts number to type number with value / number를 value와 함께 변환', () => {
    expect(valueToRemoteObject(0)).toEqual({ type: 'number', value: 0 });
    expect(valueToRemoteObject(42)).toEqual({ type: 'number', value: 42 });
    expect(valueToRemoteObject(NaN)).toEqual({ type: 'number', value: NaN });
  });

  test('converts string to type string with value / string을 value와 함께 변환', () => {
    expect(valueToRemoteObject('hello')).toEqual({ type: 'string', value: 'hello' });
  });

  test('converts symbol to type symbol with description / symbol을 description과 함께 변환', () => {
    const sym = Symbol('foo');
    const out = valueToRemoteObject(sym) as RemoteObject;
    expect(out.type).toBe('symbol');
    expect(out.description).toContain('foo');
  });

  test('converts function to type function with description / function을 description과 함께 변환', () => {
    const fn = function bar() {};
    const out = valueToRemoteObject(fn) as RemoteObject;
    expect(out.type).toBe('function');
    expect(out.description).toMatch(/function/);
  });

  test('converts array to object subtype array with objectId and preview (like web) / array를 objectId·preview와 함께 변환 (웹과 동일)', () => {
    const out = valueToRemoteObject([1, 2]) as RemoteObject;
    expect(out.type).toBe('object');
    expect(out.subtype).toBe('array');
    expect(out.objectId).toBeDefined();
    expect(out.description).toBe('[1,2]');
    expect(out.preview).toBeDefined();
    expect(out.preview!.type).toBe('object');
    expect(out.preview!.subtype).toBe('array');
    expect(out.preview!.properties).toHaveLength(2);
    expect(out.preview!.properties[0]).toEqual({ name: '0', type: 'number', value: '1' });
    expect(out.preview!.properties[1]).toEqual({ name: '1', type: 'number', value: '2' });
  });

  test('converts Error to object subtype error with objectId and preview / Error를 objectId·preview와 함께 변환', () => {
    const err = new Error('oops');
    const out = valueToRemoteObject(err) as RemoteObject;
    expect(out.type).toBe('object');
    expect(out.subtype).toBe('error');
    expect(out.objectId).toBeDefined();
    expect(out.description).toBe('oops');
    expect(out.preview).toBeDefined();
    expect(out.preview!.properties).toBeDefined();
  });

  test('converts plain object to type object with objectId, JSON description and preview (like web) / 일반 객체를 objectId·JSON description·preview로 변환 (웹과 동일)', () => {
    const obj = { a: 1, status: 'ok' };
    const out = valueToRemoteObject(obj) as RemoteObject;
    expect(out.type).toBe('object');
    expect(out.objectId).toBeDefined();
    expect(out.description).toBe('{"a":1,"status":"ok"}');
    expect(out.preview).toBeDefined();
    expect(out.preview!.properties).toHaveLength(2);
    expect(out.preview!.properties.find((p) => p.name === 'a')).toEqual({
      name: 'a',
      type: 'number',
      value: '1',
    });
    expect(out.preview!.properties.find((p) => p.name === 'status')).toEqual({
      name: 'status',
      type: 'string',
      value: 'ok',
    });
  });

  test('object with many keys sets overflow and limits properties / 많은 키는 overflow 설정·properties 제한', () => {
    const obj: Record<string, number> = {};
    for (let i = 0; i < 30; i++) obj[`k${i}`] = i;
    const out = valueToRemoteObject(obj) as RemoteObject;
    expect(out.preview).toBeDefined();
    expect(out.preview!.overflow).toBe(true);
    expect(out.preview!.properties.length).toBeLessThanOrEqual(20);
  });

  test('object that throws on JSON.stringify returns fallback description with objectId / JSON.stringify 예외 시 objectId·폴백 description', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const out = valueToRemoteObject(circular) as RemoteObject;
    expect(out.type).toBe('object');
    expect(out.objectId).toBeDefined();
    expect(out.description).toBe('Object');
    expect(out.preview).toBeDefined();
  });
});
