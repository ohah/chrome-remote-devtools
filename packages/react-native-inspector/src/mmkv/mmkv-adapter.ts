// MMKV adapter / MMKV 어댑터
// Provides unified interface based on MMKV v4 (default), with v3 (legacy) compatibility / MMKV v4 (기본)를 베이스로 한 통일된 인터페이스 제공, v3 (하위 호환) 지원

import { isMMKVV4, type MMKV } from './utils';

/**
 * MMKV adapter interface (v4-based) / MMKV 어댑터 인터페이스 (v4 베이스)
 * Based on MMKV v4 API, adapted for v3 compatibility / MMKV v4 API를 베이스로 하되, v3 호환성 제공
 */
export type MMKVAdapter = {
  set: (key: string, value: boolean | string | number | ArrayBuffer) => void;
  getBoolean: (key: string) => boolean | undefined;
  getString: (key: string) => string | undefined;
  getNumber: (key: string) => number | undefined;
  getBuffer: (key: string) => ArrayBuffer | undefined;
  remove: (key: string) => boolean; // v4-style: returns boolean / v4 스타일: boolean 반환
  getAllKeys: () => string[];
  addOnValueChangedListener: (callback: (key: string) => void) => {
    remove: () => void;
  };
};

/**
 * Get MMKV adapter for v4 (default, base implementation) / v4용 MMKV 어댑터 가져오기 (기본, 베이스 구현)
 * Direct pass-through to v4 API / v4 API에 직접 전달
 */
const getMMKVAdapterV4 = (
  mmkv: Extract<MMKV, { remove: (key: string) => boolean }>
): MMKVAdapter => {
  return {
    set: (key, value) => mmkv.set(key, value),
    getBoolean: (key) => mmkv.getBoolean(key),
    getString: (key) => mmkv.getString(key),
    getNumber: (key) => mmkv.getNumber(key),
    getBuffer: (key) => mmkv.getBuffer(key),
    remove: (key) => mmkv.remove(key), // v4 API: returns boolean / v4 API: boolean 반환
    getAllKeys: () => mmkv.getAllKeys(),
    addOnValueChangedListener: (callback) => mmkv.addOnValueChangedListener(callback),
  };
};

/**
 * Get MMKV adapter for v3 (legacy support, adapted to v4-style) / v3용 MMKV 어댑터 가져오기 (하위 호환 지원, v4 스타일로 변환)
 * Adapts v3 API to v4-style interface / v3 API를 v4 스타일 인터페이스로 변환
 */
const getMMKVAdapterV3 = (mmkv: Extract<MMKV, { id: string }>): MMKVAdapter => {
  return {
    set: (key, value) => mmkv.set(key, value),
    getBoolean: (key) => mmkv.getBoolean(key),
    getString: (key) => mmkv.getString(key),
    getNumber: (key) => mmkv.getNumber(key),
    getBuffer: (key) => mmkv.getBuffer(key) as ArrayBuffer | undefined,
    // Adapt v3's delete (void) to v4's remove (boolean) / v3의 delete (void)를 v4의 remove (boolean)로 변환
    remove: (key) => {
      mmkv.delete(key);
      // v3's delete doesn't return a value, but v4's remove returns boolean / v3의 delete는 값을 반환하지 않지만, v4의 remove는 boolean을 반환
      // Check if key still exists to determine if deletion was successful / 키가 여전히 존재하는지 확인하여 삭제 성공 여부 판단
      return !mmkv.getAllKeys().includes(key);
    },
    getAllKeys: () => mmkv.getAllKeys(),
    addOnValueChangedListener: (callback) => mmkv.addOnValueChangedListener(callback),
  };
};

/**
 * Get MMKV adapter / MMKV 어댑터 가져오기
 * v4 is default, v3 is for legacy support / v4가 기본, v3는 하위 호환용
 */
export const getMMKVAdapter = (mmkv: MMKV): MMKVAdapter => {
  // Check v4 first (default) / v4를 먼저 확인 (기본)
  if (isMMKVV4(mmkv)) {
    return getMMKVAdapterV4(mmkv);
  }

  // Fallback to v3 (legacy support) / v3로 폴백 (하위 호환 지원)
  return getMMKVAdapterV3(mmkv as Extract<MMKV, { id: string }>);
};
