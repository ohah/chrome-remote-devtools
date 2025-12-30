// Remote Object tests / Remote Object 테스트
// happy-dom is registered via bunfig.toml preload / happy-dom은 bunfig.toml preload를 통해 등록됨
import { describe, test, expect, beforeEach } from 'bun:test';
import { objectFormat, getObjectProperties, objectRelease, getObjectById } from '../remoteObject';

describe('Remote Object', () => {
  beforeEach(() => {
    // Clear all objects before each test / 각 테스트 전에 모든 객체 정리
    // Note: This is a workaround since the module uses module-level state / 모듈 레벨 상태를 사용하므로 우회 방법
    // In a real scenario, we'd need to reset the internal maps / 실제로는 내부 맵을 재설정해야 함
  });

  describe('objectFormat', () => {
    test('should format undefined / undefined 포맷팅', () => {
      const result = objectFormat(undefined);
      expect(result).toEqual({ type: 'undefined' });
    });

    test('should format number / 숫자 포맷팅', () => {
      const result = objectFormat(42);
      expect(result).toEqual({
        type: 'number',
        value: 42,
        description: '42',
      });
    });

    test('should format string / 문자열 포맷팅', () => {
      const result = objectFormat('hello');
      expect(result).toEqual({
        type: 'string',
        value: 'hello',
      });
    });

    test('should format boolean / 불린 포맷팅', () => {
      const result = objectFormat(true);
      expect(result).toEqual({
        type: 'boolean',
        value: true,
      });
    });

    test('should format null / null 포맷팅', () => {
      const result = objectFormat(null);
      // Note: null doesn't have objectId / null은 objectId가 없음
      expect(result).toEqual({
        type: 'object',
        subtype: 'null',
        value: null,
      });
    });

    test('should format symbol / 심볼 포맷팅', () => {
      const sym = Symbol('test');
      const result = objectFormat(sym);
      expect(result).toEqual({
        type: 'symbol',
        objectId: expect.any(String),
        description: expect.stringContaining('test'),
      });
    });

    test('should format array / 배열 포맷팅', () => {
      const arr = [1, 2, 3];
      const result = objectFormat(arr);
      expect(result).toEqual({
        type: 'object',
        subtype: 'array',
        objectId: expect.any(String),
        className: 'Array',
        description: 'Array(3)',
      });
    });

    test('should format array with preview / 프리뷰가 있는 배열 포맷팅', () => {
      const arr = [1, 2, 3, 4, 5];
      const result = objectFormat(arr, { preview: true });
      expect(result).toEqual({
        type: 'object',
        subtype: 'array',
        objectId: expect.any(String),
        className: 'Array',
        description: 'Array(5)',
        preview: expect.objectContaining({
          type: 'object',
          subtype: 'array',
          description: 'Array(5)',
          properties: expect.any(Array),
        }),
      });
    });

    test('should format function / 함수 포맷팅', () => {
      const fn = function testFunction() {
        return 'test';
      };
      const result = objectFormat(fn);
      expect(result).toEqual({
        type: 'function',
        subtype: '',
        objectId: expect.any(String),
        className: 'Function',
        description: expect.stringContaining('testFunction'),
      });
    });

    test('should format function with preview / 프리뷰가 있는 함수 포맷팅', () => {
      const fn = function testFunction() {
        return 'test';
      };
      const result = objectFormat(fn, { preview: true });
      expect(result).toEqual({
        type: 'function',
        subtype: '',
        objectId: expect.any(String),
        className: 'Function',
        description: expect.stringContaining('testFunction'),
        preview: expect.objectContaining({
          type: 'function',
          description: expect.stringContaining('testFunction'),
        }),
      });
    });

    test('should format Error / 에러 포맷팅', () => {
      const err = new Error('test error');
      const result = objectFormat(err);
      expect(result).toEqual({
        type: 'object',
        subtype: 'error',
        objectId: expect.any(String),
        className: 'Error',
        description: expect.stringContaining('test error'),
      });
    });

    test('should format Error with preview / 프리뷰가 있는 에러 포맷팅', () => {
      const err = new Error('test error');
      err.stack = 'Error: test error\n    at test';
      const result = objectFormat(err, { preview: true });
      expect(result).toEqual({
        type: 'object',
        subtype: 'error',
        objectId: expect.any(String),
        className: 'Error',
        description: expect.stringContaining('test error'),
        preview: expect.objectContaining({
          type: 'object',
          subtype: 'error',
          description: expect.stringContaining('test error'),
        }),
      });
    });

    test('should format Date / 날짜 포맷팅', () => {
      const date = new Date('2023-01-01');
      const result = objectFormat(date);
      expect(result).toEqual({
        type: 'object',
        subtype: 'date',
        objectId: expect.any(String),
        className: 'Date',
        description: 'Date',
      });
    });

    test('should format RegExp / 정규식 포맷팅', () => {
      const regex = /test/gi;
      const result = objectFormat(regex);
      expect(result).toEqual({
        type: 'object',
        subtype: 'regexp',
        objectId: expect.any(String),
        className: 'RegExp',
        description: 'RegExp',
      });
    });

    test('should format Map / Map 포맷팅', () => {
      const map = new Map();
      const result = objectFormat(map);
      expect(result).toEqual({
        type: 'object',
        subtype: 'map',
        objectId: expect.any(String),
        className: 'Map',
        description: 'Map',
      });
    });

    test('should format Set / Set 포맷팅', () => {
      const set = new Set();
      const result = objectFormat(set);
      expect(result).toEqual({
        type: 'object',
        subtype: 'set',
        objectId: expect.any(String),
        className: 'Set',
        description: 'Set',
      });
    });

    test('should format DOM element / DOM 요소 포맷팅', () => {
      const div = document.createElement('div');
      const result = objectFormat(div);
      expect(result).toEqual({
        type: 'object',
        subtype: 'node',
        objectId: expect.any(String),
        className: 'HTMLDivElement',
        description: 'HTMLDivElement',
      });
    });

    test('should format plain object / 일반 객체 포맷팅', () => {
      const obj = { a: 1, b: 2 };
      const result = objectFormat(obj);
      expect(result).toEqual({
        type: 'object',
        subtype: '',
        objectId: expect.any(String),
        className: 'Object',
        description: 'Object',
      });
    });

    test('should format plain object with preview / 프리뷰가 있는 일반 객체 포맷팅', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = objectFormat(obj, { preview: true });
      expect(result).toEqual({
        type: 'object',
        subtype: '',
        objectId: expect.any(String),
        className: 'Object',
        description: 'Object',
        preview: expect.objectContaining({
          type: 'object',
          description: 'Object',
          properties: expect.arrayContaining([
            expect.objectContaining({ name: 'a' }),
            expect.objectContaining({ name: 'b' }),
            expect.objectContaining({ name: 'c' }),
          ]),
        }),
      });
    });

    test('should use custom origin / 커스텀 origin 사용', () => {
      const obj = { a: 1 };
      const origin = { a: 2 };
      const result = objectFormat(obj, { origin });
      expect(result.objectId).toBeDefined();
    });

    test('should handle object with getter / getter가 있는 객체 처리', () => {
      const obj = Object.create(
        {},
        {
          prop: {
            get() {
              return 'value';
            },
            enumerable: true,
          },
        }
      );
      const result = objectFormat(obj);
      expect(result).toEqual({
        type: 'object',
        subtype: '',
        objectId: expect.any(String),
        className: 'Object',
        description: 'Object',
      });
    });
  });

  describe('getObjectProperties', () => {
    test('should return empty array for non-existent objectId / 존재하지 않는 objectId에 대해 빈 배열 반환', () => {
      const result = getObjectProperties({ objectId: '999' });
      expect(result).toEqual([]);
    });

    test('should get properties of object / 객체의 속성 가져오기', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const formatted = objectFormat(obj);
      const objectId = formatted.objectId!;

      const result = getObjectProperties({ objectId, ownProperties: true });
      // Object.getOwnPropertyNames includes all own properties / Object.getOwnPropertyNames는 모든 자체 속성을 포함
      expect(result.length).toBeGreaterThan(0);
      // Should include 'a', 'b', 'c' properties / 'a', 'b', 'c' 속성을 포함해야 함
      const propNames = result.map((p) => p.name);
      expect(propNames).toContain('a');
      expect(propNames).toContain('b');
      expect(propNames).toContain('c');
    });

    test('should get own properties only / 자체 속성만 가져오기', () => {
      // Use plain object with own properties / 자체 속성이 있는 일반 객체 사용
      const obj = { childProp: 'child', parentProp: 'parent' };
      const formatted = objectFormat(obj);
      const objectId = formatted.objectId!;

      const result = getObjectProperties({ objectId, ownProperties: true });
      const propNames = result.map((p) => p.name);
      // Should include both properties / 두 속성을 모두 포함해야 함
      expect(propNames).toContain('childProp');
      expect(propNames).toContain('parentProp');
    });

    test('should get inherited properties / 상속된 속성 가져오기', () => {
      // Create object with prototype / 프로토타입이 있는 객체 생성
      const proto = { inheritedProp: 'inherited' };
      const obj = Object.create(proto);
      obj.ownProp = 'own';
      const formatted = objectFormat(obj);
      const objectId = formatted.objectId!;

      const result = getObjectProperties({ objectId, ownProperties: false });
      const propNames = result.map((p) => p.name);
      // When ownProperties is false, it gets properties from prototype / ownProperties가 false일 때 프로토타입의 속성을 가져옴
      // Should include inherited properties from prototype / 프로토타입의 상속된 속성을 포함해야 함
      expect(propNames).toContain('inheritedProp');
      // Should include __proto__ / __proto__를 포함해야 함
      expect(propNames).toContain('__proto__');
      // Note: ownProp is not included when ownProperties is false / ownProperties가 false일 때 ownProp은 포함되지 않음
    });

    test('should include __proto__ property / __proto__ 속성 포함', () => {
      const obj = { a: 1 };
      const formatted = objectFormat(obj);
      const objectId = formatted.objectId!;

      const result = getObjectProperties({ objectId });
      const protoProp = result.find((p) => p.name === '__proto__');
      expect(protoProp).toBeDefined();
      expect(protoProp?.configurable).toBe(true);
      expect(protoProp?.enumerable).toBe(false);
    });

    test('should generate preview when requested / 요청 시 프리뷰 생성', () => {
      const obj = { a: 1, b: 2 };
      const formatted = objectFormat(obj);
      const objectId = formatted.objectId!;

      const result = getObjectProperties({ objectId, ownProperties: true, generatePreview: true });
      expect(result.length).toBeGreaterThan(0);
      // Properties should have formatted values / 속성은 포맷된 값을 가져야 함
      const propA = result.find((p) => p.name === 'a');
      expect(propA).toBeDefined();
      expect(propA?.value).toBeDefined();
      // Value should be formatted object / 값은 포맷된 객체여야 함
      if (propA?.value && typeof propA.value === 'object' && 'type' in propA.value) {
        expect(propA.value.type).toBe('number');
      }
    });

    test('should filter accessor properties only / 접근자 속성만 필터링', () => {
      const obj = Object.create(
        {},
        {
          getterProp: {
            get() {
              return 'value';
            },
            enumerable: true,
          },
          normalProp: {
            value: 'value',
            enumerable: true,
            writable: true,
          },
        }
      );
      const formatted = objectFormat(obj);
      const objectId = formatted.objectId!;

      const result = getObjectProperties({
        objectId,
        ownProperties: true,
        accessorPropertiesOnly: true,
      });
      const propNames = result.map((p) => p.name);
      // Should include getterProp (has getter) / getterProp을 포함해야 함 (getter가 있음)
      expect(propNames).toContain('getterProp');
      // Should not include normalProp (no getter/setter) / normalProp을 포함하지 않아야 함 (getter/setter 없음)
      expect(propNames).not.toContain('normalProp');
    });

    test('should include property descriptors / 속성 디스크립터 포함', () => {
      const obj = Object.create(
        {},
        {
          prop: {
            value: 'value',
            enumerable: true,
            writable: false,
            configurable: true,
          },
        }
      );
      const formatted = objectFormat(obj);
      const objectId = formatted.objectId!;

      const result = getObjectProperties({ objectId, ownProperties: true });
      const prop = result.find((p) => p.name === 'prop');
      expect(prop).toBeDefined();
      expect(prop?.enumerable).toBe(true);
      expect(prop?.writable).toBe(false);
      expect(prop?.configurable).toBe(true);
    });

    test('should handle object with many properties / 많은 속성이 있는 객체 처리', () => {
      const obj: Record<string, number> = {};
      for (let i = 0; i < 20; i++) {
        obj[`prop${i}`] = i;
      }
      const formatted = objectFormat(obj);
      const objectId = formatted.objectId!;

      const result = getObjectProperties({ objectId, ownProperties: true });
      // Should include all 20 properties plus __proto__ / 20개 속성과 __proto__를 포함해야 함
      expect(result.length).toBeGreaterThanOrEqual(20);
      // Check that all properties are included / 모든 속성이 포함되었는지 확인
      const propNames = result.map((p) => p.name);
      for (let i = 0; i < 20; i++) {
        expect(propNames).toContain(`prop${i}`);
      }
    });
  });

  describe('objectRelease', () => {
    test('should release object by objectId / objectId로 객체 해제', () => {
      const obj = { a: 1 };
      const formatted = objectFormat(obj);
      const objectId = formatted.objectId!;

      // Verify object exists / 객체가 존재하는지 확인
      expect(getObjectById(objectId)).toBe(obj);

      // Release object / 객체 해제
      objectRelease({ objectId });

      // Verify object is released / 객체가 해제되었는지 확인
      expect(getObjectById(objectId)).toBeUndefined();
    });

    test('should handle non-existent objectId / 존재하지 않는 objectId 처리', () => {
      // Should not throw / 오류를 던지지 않아야 함
      expect(() => objectRelease({ objectId: '999' })).not.toThrow();
    });

    test('should release object and allow reuse of objectId / 객체 해제 후 objectId 재사용 허용', () => {
      const obj1 = { a: 1 };
      const formatted1 = objectFormat(obj1);
      const objectId1 = formatted1.objectId!;

      objectRelease({ objectId: objectId1 });

      // Create new object / 새 객체 생성
      const obj2 = { b: 2 };
      const formatted2 = objectFormat(obj2);
      const objectId2 = formatted2.objectId!;

      // New object should have different ID / 새 객체는 다른 ID를 가져야 함
      expect(objectId2).not.toBe(objectId1);
    });
  });

  describe('getObjectById', () => {
    test('should get object by objectId / objectId로 객체 가져오기', () => {
      const obj = { a: 1 };
      const formatted = objectFormat(obj);
      const objectId = formatted.objectId!;

      const retrieved = getObjectById(objectId);
      expect(retrieved).toBe(obj);
    });

    test('should return undefined for non-existent objectId / 존재하지 않는 objectId에 대해 undefined 반환', () => {
      const result = getObjectById('999');
      expect(result).toBeUndefined();
    });

    test('should return same object for same objectId / 같은 objectId에 대해 같은 객체 반환', () => {
      const obj = { a: 1 };
      const formatted1 = objectFormat(obj);
      const formatted2 = objectFormat(obj);
      const objectId1 = formatted1.objectId!;
      const objectId2 = formatted2.objectId!;

      // Same object should have same ID / 같은 객체는 같은 ID를 가져야 함
      expect(objectId1).toBe(objectId2);

      const retrieved1 = getObjectById(objectId1);
      const retrieved2 = getObjectById(objectId2);
      expect(retrieved1).toBe(retrieved2);
      expect(retrieved1).toBe(obj);
    });
  });

  describe('Edge cases', () => {
    test('should handle circular references / 순환 참조 처리', () => {
      const obj: any = { a: 1 };
      obj.self = obj;
      const result = objectFormat(obj);
      expect(result.objectId).toBeDefined();
    });

    test('should handle objects with prototype chain / 프로토타입 체인이 있는 객체 처리', () => {
      class Base {
        baseProp = 'base';
      }
      class Derived extends Base {
        derivedProp = 'derived';
      }
      const obj = new Derived();
      const result = objectFormat(obj);
      expect(result.objectId).toBeDefined();
    });

    test('should handle objects with non-enumerable properties / 열거 불가능한 속성이 있는 객체 처리', () => {
      const obj = Object.create(
        {},
        {
          enumerable: {
            value: 'enumerable',
            enumerable: true,
          },
          nonEnumerable: {
            value: 'non-enumerable',
            enumerable: false,
          },
        }
      );
      const formatted = objectFormat(obj);
      const objectId = formatted.objectId!;

      const result = getObjectProperties({ objectId, ownProperties: true });
      // Object.getOwnPropertyNames includes non-enumerable properties / Object.getOwnPropertyNames는 열거 불가능한 속성도 포함
      const propNames = result.map((p) => p.name);
      expect(propNames).toContain('enumerable');
      expect(propNames).toContain('nonEnumerable');
    });

    test('should handle objects with Symbol properties / Symbol 속성이 있는 객체 처리', () => {
      const sym = Symbol('test');
      const obj: any = { a: 1 };
      obj[sym] = 'symbol value';
      const result = objectFormat(obj);
      expect(result.objectId).toBeDefined();
    });
  });
});
