// AsyncStorage types / AsyncStorage 타입

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
