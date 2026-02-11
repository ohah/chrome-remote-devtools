// MMKV types / MMKV 타입

// Buffer type accepted from MMKV (ArrayBufferLike includes ArrayBuffer and SharedArrayBuffer in some runtimes) / MMKV에서 허용하는 버퍼 타입 (일부 런타임에서 SharedArrayBuffer 반환)
type MMKVBuffer = ArrayBufferLike;

// MMKV v4 type (default, has 'remove' method) / MMKV v4 타입 (기본, 'remove' 메서드 있음)
type MMKVV4 = {
  set(key: string, value: boolean | string | number | ArrayBuffer): void;
  getBoolean(key: string): boolean | undefined;
  getString(key: string): string | undefined;
  getNumber(key: string): number | undefined;
  getBuffer(key: string): MMKVBuffer | undefined;
  remove(key: string): boolean;
  getAllKeys(): string[];
  addOnValueChangedListener(callback: (key: string) => void): { remove: () => void };
};

// MMKV v3 type (legacy support; id optional so library MMKV with private id is assignable) / MMKV v3 타입 (하위 호환, id 선택적이라 private id인 라이브러리 MMKV 할당 가능)
type MMKVV3 = {
  id?: string;
  set(key: string, value: boolean | string | number | ArrayBuffer): void;
  getBoolean(key: string): boolean | undefined;
  getString(key: string): string | undefined;
  getNumber(key: string): number | undefined;
  getBuffer(key: string): MMKVBuffer | undefined;
  delete(key: string): void;
  getAllKeys(): string[];
  addOnValueChangedListener(callback: (key: string) => void): { remove: () => void };
};

/**
 * MMKV type (v4 is default, v3 is for legacy support) / MMKV 타입 (v4가 기본, v3는 하위 호환용)
 */
export type MMKV = MMKVV4 | MMKVV3;

/**
 * Input type for registerMMKVDevTools: accepts both react-native-mmkv v4 and v3 instances.
 * v4 class has private `id` so it is not assignable to MMKVV3; this type omits id so both are accepted.
 * registerMMKVDevTools용 입력 타입: v4·v3 인스턴스 모두 허용 (v4는 id가 private라 MMKVV3에 할당 불가하므로 id 없이 정의)
 */
export type MMKVStorageInput =
  | MMKVStorageInstance
  | MMKVStorageInstance[]
  | Record<string, MMKVStorageInstance>;

type MMKVStorageInstance = {
  set(key: string, value: boolean | string | number | ArrayBuffer): void;
  getBoolean(key: string): boolean | undefined;
  getString(key: string): string | undefined;
  getNumber(key: string): number | undefined;
  getBuffer(key: string): MMKVBuffer | undefined;
  getAllKeys(): string[];
  addOnValueChangedListener(callback: (key: string) => void): { remove: () => void };
  remove?(key: string): boolean;
  delete?(key: string): void;
};

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
