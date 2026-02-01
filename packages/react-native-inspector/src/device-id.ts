// Stable device ID for inspector WebSocket / Inspector WebSocket용 안정적 device ID
// Prefer AsyncStorage when available so ID persists across app reloads / 가능하면 AsyncStorage 사용해 앱 리로드 후에도 유지

import type { AsyncStorageType } from './async-storage/types';

const STORAGE_KEY = '@ohah/crd-inspector-device-id';

/** In-memory cache so same ID is used for reconnects in same session / 동일 세션 내 재연결 시 같은 ID 사용 */
let cachedDeviceId: string | null = null;

/**
 * Try to get AsyncStorage from app if @react-native-async-storage/async-storage is installed / 앱에 설치된 경우 AsyncStorage 반환
 * Does not add a hard dependency; returns undefined when not available / 강제 의존성 없음, 없으면 undefined
 */
function getOptionalAsyncStorage(): AsyncStorageType | undefined {
  try {
    const m = require('@react-native-async-storage/async-storage');
    const storage = m?.default ?? m;
    return typeof storage?.getItem === 'function' && typeof storage?.setItem === 'function'
      ? (storage as AsyncStorageType)
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Generate a new device ID string / 새 device ID 문자열 생성
 */
function generateDeviceId(): string {
  return 'js-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
}

const STORAGE_READY_DELAY_MS = 300;
const STORAGE_READY_RETRIES = 2;
/** Short delay before first read on cold start so native AsyncStorage can be ready / 콜드 스타트 시 네이티브 AsyncStorage 준비를 위한 첫 읽기 전 짧은 대기 */
const COLD_START_INITIAL_DELAY_MS = 100;

/**
 * Get stable device ID from AsyncStorage only (no in-memory fallback) / AsyncStorage에서만 안정적 device ID 반환 (메모리 fallback 없음)
 * Requires AsyncStorage so ID persists across app restarts and same device is not shown as multiple tabs / 앱 재시작 후에도 동일 ID 유지·같은 기기가 여러 탭으로 나오지 않도록 AsyncStorage 필수
 * On cold start waits briefly and retries so native module has time to be ready / 콜드 스타트 시 짧은 대기 후 재시도하여 네이티브 모듈 준비 시간 확보
 * @param storage Optional AsyncStorage; when omitted, tries to use app's AsyncStorage / (선택) 생략 시 앱의 AsyncStorage 자동 사용 시도
 * @returns Promise resolving to device ID string / device ID 문자열로 resolve되는 Promise
 * @throws When AsyncStorage is not available or all read/write attempts fail / AsyncStorage 없거나 모든 읽기·쓰기 시도 실패 시
 */
export async function getStableDeviceId(storage?: AsyncStorageType): Promise<string> {
  const effectiveStorage = storage ?? getOptionalAsyncStorage();
  if (effectiveStorage == null) {
    throw new Error(
      '[ChromeRemoteDevTools] AsyncStorage is required for stable device ID. ' +
        'Install @react-native-async-storage/async-storage and ensure it is linked, or pass asyncStorage in connect(options).'
    );
  }
  let lastError: unknown;
  for (let attempt = 0; attempt <= STORAGE_READY_RETRIES; attempt++) {
    try {
      if (attempt === 0 && cachedDeviceId == null) {
        await new Promise((r) => setTimeout(r, COLD_START_INITIAL_DELAY_MS));
      } else if (attempt > 0) {
        await new Promise((r) => setTimeout(r, STORAGE_READY_DELAY_MS));
      }
      const existing = await effectiveStorage.getItem(STORAGE_KEY);
      if (existing != null && existing.length > 0) {
        cachedDeviceId = existing;
        return existing;
      }
      const id = generateDeviceId();
      await effectiveStorage.setItem(STORAGE_KEY, id);
      cachedDeviceId = id;
      return id;
    } catch (err) {
      lastError = err;
      if (attempt === STORAGE_READY_RETRIES) {
        throw new Error(
          '[ChromeRemoteDevTools] Failed to read or write device ID from AsyncStorage after retries. ' +
            'Ensure AsyncStorage is linked and native module is ready.',
          { cause: err }
        );
      }
    }
  }
  throw new Error('[ChromeRemoteDevTools] Failed to get stable device ID from AsyncStorage.', {
    cause: lastError,
  });
}
