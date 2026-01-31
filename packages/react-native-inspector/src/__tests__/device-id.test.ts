/**
 * Device ID tests / device ID 테스트
 * Covers getStableDeviceId with and without storage / AsyncStorage 유무에 따른 getStableDeviceId
 */
import { describe, test, expect, beforeEach } from 'bun:test';
import { getStableDeviceId } from '../device-id';
import type { AsyncStorageType } from '../async-storage/types';

describe('device-id', () => {
  beforeEach(() => {
    // Reset module cache so cachedDeviceId is cleared between tests that need fresh state
    // We cannot clear in-module cache from here; tests use same process so in-memory ID persists.
    // So we test: without storage we get same ID on second call; with storage we get stored ID.
  });

  test('getStableDeviceId without storage returns id in js-xxx format / storage 없으면 js-xxx 형식', async () => {
    const id = await getStableDeviceId();
    expect(id).toMatch(/^js-[a-z0-9]+-[a-z0-9]+$/);
  });

  test('getStableDeviceId without storage returns same id on second call / storage 없어도 두 번째 호출 시 동일 ID', async () => {
    const id1 = await getStableDeviceId();
    const id2 = await getStableDeviceId();
    expect(id1).toBe(id2);
  });

  test('getStableDeviceId with storage returns stored id on second call / storage 있으면 두 번째 호출 시 저장된 ID', async () => {
    const store: Record<string, string> = {};
    const storage: AsyncStorageType = {
      getItem: async (key) => store[key] ?? null,
      setItem: async (key, value) => {
        store[key] = value;
      },
      mergeItem: async () => {},
      removeItem: async (key) => {
        delete store[key];
      },
      getAllKeys: async () => Object.keys(store),
      multiGet: async (keys) => keys.map((k) => [k, store[k] ?? null] as [string, string | null]),
      multiSet: async (entries) => {
        for (const [k, v] of entries) store[k] = v;
      },
      multiMerge: async () => {},
      multiRemove: async (keys) => {
        for (const k of keys) delete store[k];
      },
      clear: async () => {
        for (const k of Object.keys(store)) delete store[k];
      },
    };
    const id1 = await getStableDeviceId(storage);
    expect(id1).toMatch(/^js-[a-z0-9]+-[a-z0-9]+$/);
    expect(store['@ohah/crd-inspector-device-id']).toBe(id1);
    const id2 = await getStableDeviceId(storage);
    expect(id2).toBe(id1);
  });
});
