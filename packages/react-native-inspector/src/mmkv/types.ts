// MMKV types / MMKV 타입

// MMKV v4 type (default, has 'remove' method) / MMKV v4 타입 (기본, 'remove' 메서드 있음)
type MMKVV4 = {
  set(key: string, value: boolean | string | number | ArrayBuffer): void;
  getBoolean(key: string): boolean | undefined;
  getString(key: string): string | undefined;
  getNumber(key: string): number | undefined;
  getBuffer(key: string): ArrayBuffer | undefined;
  remove(key: string): boolean;
  getAllKeys(): string[];
  addOnValueChangedListener(callback: (key: string) => void): { remove: () => void };
};

// MMKV v3 type (legacy support, has 'id' property and 'delete' method) / MMKV v3 타입 (하위 호환 지원, 'id' 속성과 'delete' 메서드 있음)
type MMKVV3 = {
  id: string;
  set(key: string, value: boolean | string | number | ArrayBuffer): void;
  getBoolean(key: string): boolean | undefined;
  getString(key: string): string | undefined;
  getNumber(key: string): number | undefined;
  getBuffer(key: string): ArrayBuffer | undefined;
  delete(key: string): void;
  getAllKeys(): string[];
  addOnValueChangedListener(callback: (key: string) => void): { remove: () => void };
};

/**
 * MMKV type (v4 is default, v3 is for legacy support) / MMKV 타입 (v4가 기본, v3는 하위 호환용)
 */
export type MMKV = MMKVV4 | MMKVV3;

/**
 * MMKV entry types / MMKV 엔트리 타입
 */
export type MMKVEntry =
  | { key: string; type: 'string'; value: string }
  | { key: string; type: 'number'; value: number }
  | { key: string; type: 'boolean'; value: boolean }
  | { key: string; type: 'buffer'; value: number[] };

export type MMKVEntryType = MMKVEntry['type'];
export type MMKVEntryValue = MMKVEntry['value'];
