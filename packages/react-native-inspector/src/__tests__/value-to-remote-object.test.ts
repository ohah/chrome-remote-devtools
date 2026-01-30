/**
 * value-to-remote-object tests / value-to-remote-object 테스트
 * Covers conversion of JS values to CDP RemoteObject for Runtime.consoleAPICalled / Runtime.consoleAPICalled용 RemoteObject 변환
 */
import { describe, test, expect } from 'bun:test';
import { valueToRemoteObject, type RemoteObject } from '../console/value-to-remote-object';

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

  test('converts array to object subtype array / array를 object subtype array로 변환', () => {
    expect(valueToRemoteObject([1, 2])).toEqual({
      type: 'object',
      subtype: 'array',
      description: 'Array',
      value: undefined,
    });
  });

  test('converts Error to object subtype error with message / Error를 message와 함께 변환', () => {
    const err = new Error('oops');
    expect(valueToRemoteObject(err)).toEqual({
      type: 'object',
      subtype: 'error',
      description: 'oops',
    });
  });

  test('converts plain object to type object with JSON description / 일반 객체를 JSON description으로 변환', () => {
    const obj = { a: 1 };
    const out = valueToRemoteObject(obj) as RemoteObject;
    expect(out.type).toBe('object');
    expect(out.description).toBe('{"a":1}');
  });

  test('truncates long object description to 100 chars / 긴 객체 설명은 100자로 자름', () => {
    const obj = { x: 'a'.repeat(150) };
    const out = valueToRemoteObject(obj) as RemoteObject;
    expect(out.type).toBe('object');
    expect(out.description!.length).toBeLessThanOrEqual(103);
    expect(out.description).toContain('...');
  });
});
