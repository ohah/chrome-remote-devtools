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

/**
 * Get stable device ID / 안정적 device ID 반환
 * Uses AsyncStorage when provided or when @react-native-async-storage/async-storage is installed, so ID persists across app reloads / 전달된 AsyncStorage 또는 앱에 설치된 AsyncStorage 사용 시 앱 리로드 후에도 유지
 * Otherwise same ID only for reconnects (in-memory) / 없으면 재연결 시에만 동일 ID (메모리)
 * @param storage Optional AsyncStorage; when omitted, tries to use app's AsyncStorage / (선택) 생략 시 앱의 AsyncStorage 자동 사용 시도
 * @returns Promise resolving to device ID string / device ID 문자열로 resolve되는 Promise
 */
export async function getStableDeviceId(storage?: AsyncStorageType): Promise<string> {
  const effectiveStorage = storage ?? getOptionalAsyncStorage();
  if (effectiveStorage != null) {
    try {
      const existing = await effectiveStorage.getItem(STORAGE_KEY);
      if (existing != null && existing.length > 0) {
        cachedDeviceId = existing;
        return existing;
      }
      const id = generateDeviceId();
      await effectiveStorage.setItem(STORAGE_KEY, id);
      cachedDeviceId = id;
      return id;
    } catch {
      // Fallback to in-memory if storage fails / 스토리지 실패 시 메모리 fallback
    }
  }
  if (cachedDeviceId != null) return cachedDeviceId;
  cachedDeviceId = generateDeviceId();
  return cachedDeviceId;
}
