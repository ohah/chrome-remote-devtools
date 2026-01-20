// MMKV utilities / MMKV 유틸리티

import type { MMKV } from './types';

// MMKV v4 type (default, has 'remove' method) / MMKV v4 타입 (기본, 'remove' 메서드 있음)
type MMKVV4 = Extract<MMKV, { remove: (key: string) => boolean }>;

// MMKV v3 type (legacy support, has 'id' property and 'delete' method) / MMKV v3 타입 (하위 호환 지원, 'id' 속성과 'delete' 메서드 있음)
type MMKVV3 = Extract<MMKV, { id: string; delete: (key: string) => void }>;

/**
 * Check if MMKV instance is v4 (default) / MMKV 인스턴스가 v4인지 확인 (기본)
 */
export const isMMKVV4 = (mmkv: MMKV): mmkv is MMKVV4 => {
  // v4 has 'remove' method, v3 has 'delete' method / v4는 'remove' 메서드가 있고, v3는 'delete' 메서드가 있음
  // https://github.com/mrousavy/react-native-mmkv/blob/main/docs/V4_UPGRADE_GUIDE.md
  return 'remove' in mmkv;
};

/**
 * Check if MMKV instance is v3 (legacy) / MMKV 인스턴스가 v3인지 확인 (하위 호환)
 */
export const isMMKVV3 = (mmkv: MMKV): mmkv is MMKVV3 => {
  return 'id' in mmkv && 'delete' in mmkv && !('remove' in mmkv);
};

/**
 * Normalize storages config property / 스토리지 설정 속성 정규화
 * Converts array to record format / 배열을 레코드 형식으로 변환
 */
export const normalizeStoragesConfigProperty = (
  storages: MMKV | MMKV[] | Record<string, MMKV>
): Record<string, MMKV> => {
  // Single instance / 단일 인스턴스
  if (
    !Array.isArray(storages) &&
    typeof storages === 'object' &&
    storages !== null &&
    'set' in storages
  ) {
    // Check if it's a Record or a single MMKV instance / Record인지 단일 MMKV 인스턴스인지 확인
    const keys = Object.keys(storages);
    // If it has 'set' method and is not a plain object with string keys, it's a single MMKV instance / 'set' 메서드가 있고 문자열 키를 가진 일반 객체가 아니면 단일 MMKV 인스턴스
    if (typeof (storages as any).set === 'function' && keys.length === 0) {
      return { default: storages as MMKV };
    }
    // Otherwise it's a Record / 그렇지 않으면 Record
    return storages as Record<string, MMKV>;
  }

  // Array / 배열
  if (Array.isArray(storages)) {
    const isAnyStorageV4 = storages.some(isMMKVV4);

    if (isAnyStorageV4) {
      // v4 doesn't have 'id' property, so we need explicit names / v4는 'id' 속성이 없으므로 명시적 이름이 필요함
      throw new Error(
        '[ChromeRemoteDevTools] MMKV DevTools: `storages` must be a record (object) of storage IDs and MMKV instances. Arrays are not supported in MMKV v4 because storage IDs are no longer accessible. Use a record format instead: { "storage-name": storageInstance }'
      );
    }

    // v3 supports array format (legacy) / v3는 배열 형식 지원 (하위 호환)
    console.warn(
      '[ChromeRemoteDevTools] MMKV DevTools: `storages` should be a record (object) of storage IDs and MMKV instances, not an array. Array format is only supported for MMKV v3 (legacy).'
    );

    return Object.fromEntries(
      (storages as MMKVV3[]).map((storage) => [storage.id || 'default', storage])
    );
  }

  // Record / 레코드
  return storages;
};
