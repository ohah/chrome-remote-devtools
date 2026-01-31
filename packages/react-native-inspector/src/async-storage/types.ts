// AsyncStorage types / AsyncStorage 타입

/**
 * AsyncStorage interface / AsyncStorage 인터페이스
 * Matches @react-native-async-storage/async-storage API (optional callback params allowed for compatibility) / @react-native-async-storage/async-storage API와 일치 (호환용 선택적 callback 허용)
 * Reference: https://react-native-async-storage.github.io/2.0/API/
 */
export interface AsyncStorageType {
  getItem(key: string, ...args: unknown[]): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  mergeItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
  multiGet(keys: string[]): Promise<Array<[string, string | null]>>;
  multiSet(entries: Array<[string, string]>): Promise<void>;
  multiMerge(entries: Array<[string, string]>): Promise<void>;
  multiRemove(keys: string[]): Promise<void>;
  clear(): Promise<void>;
}

/**
 * AsyncStorage entry types / AsyncStorage 엔트리 타입
 * AsyncStorage only stores strings / AsyncStorage는 문자열만 저장함
 */
export type AsyncStorageEntry = {
  key: string;
  type: 'string';
  value: string;
};

export type AsyncStorageEntryType = AsyncStorageEntry['type'];
export type AsyncStorageEntryValue = AsyncStorageEntry['value'];
