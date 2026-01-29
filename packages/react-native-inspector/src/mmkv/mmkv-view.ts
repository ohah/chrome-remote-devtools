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

      // We are going to go through each type, one by one.
      // Ordering is important here!
      const stringValue = mmkv.getString(key);

      // NOTE: Empty string is a valid MMKV string value / 참고: 빈 문자열은 유효한 MMKV string 값입니다
      // If we treat "" as "missing", initial values can't be loaded and change events look like deletes
      // / ""을 "없음"으로 취급하면 초기값을 못 불러오고 변경 이벤트가 삭제처럼 보일 수 있습니다
      if (stringValue !== undefined) {
        if (looksLikeGarbled(stringValue)) {
          // This is most-likely a buffer as it contains non-printable characters
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
