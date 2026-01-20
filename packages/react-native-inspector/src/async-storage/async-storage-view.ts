// AsyncStorage view / AsyncStorage 뷰
// Wraps AsyncStorage instance to provide unified interface / AsyncStorage 인스턴스를 래핑하여 통일된 인터페이스 제공

import type { AsyncStorageType, AsyncStorageEntry } from './types';

/**
 * AsyncStorage view interface / AsyncStorage 뷰 인터페이스
 */
export type AsyncStorageView = {
  set: (key: string, value: string) => Promise<void>;
  get: (key: string) => Promise<AsyncStorageEntry | undefined>;
  delete: (key: string) => Promise<void>;
  getAllEntries: () => Promise<AsyncStorageEntry[]>;
  getId: () => string;
  onChange: (callback: (key: string) => void) => { remove: () => void };
  notifyChange: (key: string) => void; // Notify about change / 변경사항 알림
};

/**
 * Get AsyncStorage view / AsyncStorage 뷰 가져오기
 */
export const getAsyncStorageView = (
  storageId: string,
  storage: AsyncStorageType,
  blacklist?: RegExp
): AsyncStorageView => {
  // Helper function to check if a key should be blacklisted / 키가 블랙리스트에 포함되어야 하는지 확인하는 헬퍼 함수
  const isBlacklisted = (key: string): boolean => {
    if (!blacklist) return false;

    const fullKey = `${storageId}:${key}`;
    return blacklist.test(fullKey);
  };

  // Store change listeners / 변경 리스너 저장
  const changeListeners = new Set<(key: string) => void>();

  const asyncStorageView: AsyncStorageView = {
    set: async (key, value) => {
      if (isBlacklisted(key)) {
        return;
      }
      await storage.setItem(key, value);
      // Notify change / 변경사항 알림
      asyncStorageView.notifyChange(key);
    },
    get: async (key: string) => {
      // Check if key is blacklisted / 키가 블랙리스트에 포함되어 있는지 확인
      if (isBlacklisted(key)) {
        return undefined;
      }

      const value = await storage.getItem(key);
      if (value === null) {
        return undefined;
      }

      return {
        key,
        type: 'string',
        value,
      };
    },
    delete: async (key: string) => {
      await storage.removeItem(key);
      // Notify change / 변경사항 알림
      asyncStorageView.notifyChange(key);
    },
    getAllEntries: async () => {
      const keys = await storage.getAllKeys();
      const entries = await Promise.all(
        keys
          .filter((key) => !isBlacklisted(key))
          .map(async (key) => {
            const entry = await asyncStorageView.get(key);
            return entry;
          })
      );
      return entries.filter((entry): entry is AsyncStorageEntry => entry !== undefined);
    },
    getId: () => storageId,
    onChange: (callback) => {
      changeListeners.add(callback);
      return {
        remove: () => {
          changeListeners.delete(callback);
        },
      };
    },
    notifyChange: (key: string) => {
      // Notify all listeners / 모든 리스너에 알림
      changeListeners.forEach((listener) => listener(key));
    },
  };

  return asyncStorageView;
};
