// MMKV view / MMKV 뷰
// Wraps MMKV instance to provide unified interface / MMKV 인스턴스를 래핑하여 통일된 인터페이스 제공

import type { MMKV, MMKVEntry, MMKVEntryValue } from './types';
import { looksLikeGarbled } from './is-garbled';
import { getMMKVAdapter } from './mmkv-adapter';

/**
 * MMKV view interface / MMKV 뷰 인터페이스
 */
export type MMKVView = {
  set: (key: string, value: MMKVEntryValue) => void;
  get: (key: string) => MMKVEntry | undefined;
  delete: (key: string) => void;
  getAllEntries: () => MMKVEntry[];
  getId: () => string;
  onChange: (callback: (key: string) => void) => { remove: () => void };
};

/**
 * Get MMKV view / MMKV 뷰 가져오기
 */
export const getMMKVView = (storageId: string, storage: MMKV, blacklist?: RegExp): MMKVView => {
  const mmkv = getMMKVAdapter(storage);

  // Helper function to check if a key should be blacklisted / 키가 블랙리스트에 포함되어야 하는지 확인하는 헬퍼 함수
  const isBlacklisted = (key: string): boolean => {
    if (!blacklist) return false;

    const fullKey = `${storageId}:${key}`;
    return blacklist.test(fullKey);
  };

  const mmkvView: MMKVView = {
    set: (key, value) => {
      if (Array.isArray(value)) {
        // This is a buffer representation, we need to convert it to an ArrayBuffer.
        mmkv.set(key, new Uint8Array(value).buffer);
        return;
      }

      mmkv.set(key, value);
    },
    get: (key: string) => {
      // Check if key is blacklisted / 키가 블랙리스트에 포함되어 있는지 확인
      if (isBlacklisted(key)) {
        return undefined;
      }

      // Try type-specific getters in order. Check number/boolean before string so that
      // values stored as number or boolean are not misread as string (e.g. getString
      // returning "42" or "true" for a key stored with setNumber/setBoolean).
      // / 타입별 getter를 순서대로 시도. 숫자/불리언을 문자열보다 먼저 확인해 number/boolean으로 저장된 값이 string으로 잘못 읽히지 않도록 함
      const numberValue = mmkv.getNumber(key);
      if (numberValue !== undefined) {
        return {
          key,
          type: 'number',
          value: numberValue,
        };
      }

      const booleanValue = mmkv.getBoolean(key);
      if (booleanValue !== undefined) {
        return {
          key,
          type: 'boolean',
          value: booleanValue,
        };
      }

      const stringValue = mmkv.getString(key);
      // NOTE: Empty string is a valid MMKV string value / 참고: 빈 문자열은 유효한 MMKV string 값입니다
      if (stringValue !== undefined) {
        if (looksLikeGarbled(stringValue)) {
          return {
            key,
            type: 'buffer',
            value: Array.from(new TextEncoder().encode(stringValue)),
          };
        }
        return {
          key,
          type: 'string',
          value: stringValue,
        };
      }

      const bufferValue = mmkv.getBuffer(key);
      if (bufferValue !== undefined) {
        return {
          key,
          type: 'buffer',
          value: Array.from(new Uint8Array(bufferValue)),
        };
      }

      return undefined;
    },
    delete: (key: string) => mmkv.remove(key), // Use v4-style remove method / v4 스타일 remove 메서드 사용
    getAllEntries: () => {
      return mmkv
        .getAllKeys()
        .filter((key) => !isBlacklisted(key))
        .map((key) => {
          const entry = mmkvView.get(key);
          if (!entry) {
            // Skip entries that can't be retrieved instead of throwing / 가져올 수 없는 엔트리는 throw 대신 건너뜀
            return null;
          }
          return entry;
        })
        .filter((entry): entry is MMKVEntry => entry !== null); // Filter out null entries / null 엔트리 제거
    },
    getId: () => storageId,
    onChange: (callback) => mmkv.addOnValueChangedListener(callback),
  };

  return mmkvView;
};
