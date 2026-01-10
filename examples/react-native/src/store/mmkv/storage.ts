// MMKV storage instances / MMKV 스토리지 인스턴스
// v4 is default, v3 is for legacy support / v4가 기본, v3는 하위 호환용
import { createMMKV } from 'react-native-mmkv';
import { MMKV as MMKVV3 } from 'react-native-mmkv-v3';

/**
 * User storage (v4, default) / 사용자 스토리지 (v4, 기본)
 * Uses createMMKV() function (v4 API) / createMMKV() 함수 사용 (v4 API)
 */
export const userStorage = createMMKV({ id: 'user-storage' });

/**
 * Cache storage (v4, default) / 캐시 스토리지 (v4, 기본)
 * Uses createMMKV() function (v4 API) / createMMKV() 함수 사용 (v4 API)
 */
export const cacheStorage = createMMKV({ id: 'cache-storage' });

/**
 * Default storage (v4, default) / 기본 스토리지 (v4, 기본)
 * Uses createMMKV() function without id (uses default) / createMMKV() 함수 사용, id 없음 (기본값 사용)
 */
export const defaultStorage = createMMKV();

/**
 * Legacy storage (v3, for backward compatibility) / 레거시 스토리지 (v3, 하위 호환용)
 * Uses new MMKV() constructor (v3 API) / new MMKV() 생성자 사용 (v3 API)
 */
export const legacyStorage = new MMKVV3({ id: 'legacy-storage' });
