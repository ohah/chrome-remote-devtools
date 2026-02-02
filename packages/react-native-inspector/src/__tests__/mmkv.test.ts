/**
 * MMKV CDP handler tests / MMKV CDP 핸들러 테스트
 * Tests setMMKVItem parses value by valueType and calls view.set correctly
 * / setMMKVItem이 valueType에 따라 value를 파싱해 view.set을 올바르게 호출하는지 검증
 */
import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import { handleCDPMessage } from '../cdp-message-handler';
import { registerMMKVDevTools, unregisterMMKVDevTools } from '../mmkv';
import type { MMKV } from '../mmkv/types';

/** Create v4-style mock MMKV (has remove) for getMMKVAdapter / getMMKVAdapter용 v4 스타일 목 MMKV */
function createMockMMKV(): MMKV & { set: ReturnType<typeof mock> } {
  const setMock = mock((_key: string, _value: string | number | boolean | ArrayBuffer) => {});
  return {
    set: setMock,
    getBoolean: () => undefined,
    getString: () => undefined,
    getNumber: () => undefined,
    getBuffer: () => undefined,
    remove: () => true,
    getAllKeys: () => [],
    addOnValueChangedListener: () => ({ remove: () => {} }),
  };
}

describe('mmkv CDP handler', () => {
  let mockMMKV: ReturnType<typeof createMockMMKV>;

  beforeEach(() => {
    mockMMKV = createMockMMKV();
    registerMMKVDevTools({ inst1: mockMMKV });
  });

  afterEach(() => {
    unregisterMMKVDevTools();
  });

  test('setMMKVItem with valueType number parses and sets number / valueType number 시 숫자로 파싱해 저장', () => {
    handleCDPMessage({
      method: 'MMKVStorage.setMMKVItem',
      params: { instanceId: 'inst1', key: 'k', value: '42', valueType: 'number' },
      id: 1,
    });
    expect(mockMMKV.set).toHaveBeenCalledTimes(1);
    expect(mockMMKV.set).toHaveBeenCalledWith('k', 42);
  });

  test('setMMKVItem with valueType number uses 0 when NaN / valueType number이고 NaN이면 0으로 저장', () => {
    handleCDPMessage({
      method: 'MMKVStorage.setMMKVItem',
      params: { instanceId: 'inst1', key: 'k', value: 'invalid', valueType: 'number' },
      id: 1,
    });
    expect(mockMMKV.set).toHaveBeenCalledWith('k', 0);
  });

  test('setMMKVItem with valueType boolean parses and sets boolean / valueType boolean 시 불리언으로 저장', () => {
    handleCDPMessage({
      method: 'MMKVStorage.setMMKVItem',
      params: { instanceId: 'inst1', key: 'k', value: 'true', valueType: 'boolean' },
      id: 1,
    });
    expect(mockMMKV.set).toHaveBeenCalledWith('k', true);

    (mockMMKV.set as ReturnType<typeof mock>).mockClear();
    handleCDPMessage({
      method: 'MMKVStorage.setMMKVItem',
      params: { instanceId: 'inst1', key: 'k', value: 'false', valueType: 'boolean' },
      id: 1,
    });
    expect(mockMMKV.set).toHaveBeenCalledWith('k', false);
  });

  test('setMMKVItem with valueType buffer parses JSON array and sets buffer / valueType buffer 시 JSON 배열로 파싱해 저장', () => {
    handleCDPMessage({
      method: 'MMKVStorage.setMMKVItem',
      params: {
        instanceId: 'inst1',
        key: 'k',
        value: '[1,2,3]',
        valueType: 'buffer',
      },
      id: 1,
    });
    expect(mockMMKV.set).toHaveBeenCalledTimes(1);
    const [, value] = (mockMMKV.set as ReturnType<typeof mock>).mock.calls[0] ?? [];
    expect(value).toBeInstanceOf(ArrayBuffer);
    expect(new Uint8Array(value as ArrayBuffer)).toEqual(new Uint8Array([1, 2, 3]));
  });

  test('setMMKVItem with valueType buffer uses empty array when parse fails / valueType buffer 파싱 실패 시 빈 배열로 저장', () => {
    handleCDPMessage({
      method: 'MMKVStorage.setMMKVItem',
      params: {
        instanceId: 'inst1',
        key: 'k',
        value: 'not json',
        valueType: 'buffer',
      },
      id: 1,
    });
    const [, value] = (mockMMKV.set as ReturnType<typeof mock>).mock.calls[0] ?? [];
    expect(value).toBeInstanceOf(ArrayBuffer);
    expect(new Uint8Array(value as ArrayBuffer).length).toBe(0);
  });

  test('setMMKVItem with valueType string sets string as-is / valueType string 시 문자열 그대로 저장', () => {
    handleCDPMessage({
      method: 'MMKVStorage.setMMKVItem',
      params: { instanceId: 'inst1', key: 'k', value: 'hello', valueType: 'string' },
      id: 1,
    });
    expect(mockMMKV.set).toHaveBeenCalledWith('k', 'hello');
  });

  test('setMMKVItem without valueType infers number when value looks like number / valueType 없으면 숫자 형태면 숫자로 저장', () => {
    handleCDPMessage({
      method: 'MMKVStorage.setMMKVItem',
      params: { instanceId: 'inst1', key: 'k', value: '99' },
      id: 1,
    });
    expect(mockMMKV.set).toHaveBeenCalledWith('k', 99);
  });

  test('setMMKVItem without valueType infers boolean when value is true/false / valueType 없으면 true/false면 불리언으로 저장', () => {
    handleCDPMessage({
      method: 'MMKVStorage.setMMKVItem',
      params: { instanceId: 'inst1', key: 'k', value: 'true' },
      id: 1,
    });
    expect(mockMMKV.set).toHaveBeenCalledWith('k', true);
  });

  test('setMMKVItem without valueType uses string otherwise / valueType 없고 숫자/불리언 아니면 문자열로 저장', () => {
    handleCDPMessage({
      method: 'MMKVStorage.setMMKVItem',
      params: { instanceId: 'inst1', key: 'k', value: 'hello' },
      id: 1,
    });
    expect(mockMMKV.set).toHaveBeenCalledWith('k', 'hello');
  });

  test('setMMKVItem does nothing when instanceId missing / instanceId 없으면 호출 안 함', () => {
    handleCDPMessage({
      method: 'MMKVStorage.setMMKVItem',
      params: { key: 'k', value: 'v' },
      id: 1,
    });
    expect(mockMMKV.set).not.toHaveBeenCalled();
  });

  test('setMMKVItem does nothing when instanceId unknown / 알 수 없는 instanceId면 호출 안 함', () => {
    handleCDPMessage({
      method: 'MMKVStorage.setMMKVItem',
      params: { instanceId: 'unknown', key: 'k', value: 'v', valueType: 'string' },
      id: 1,
    });
    expect(mockMMKV.set).not.toHaveBeenCalled();
  });
});
