// MMKV messaging types / MMKV 메시징 타입

import { MMKVEntry } from './types';

/**
 * MMKV snapshot event / MMKV 스냅샷 이벤트
 */
export type MMKVSnapshotEvent = {
  type: 'snapshot';
  id: string;
  entries: MMKVEntry[];
};

/**
 * MMKV set entry event / MMKV 엔트리 설정 이벤트
 */
export type MMKVSetEntryEvent = {
  type: 'set-entry';
  id: string;
  entry: MMKVEntry;
};

/**
 * MMKV delete entry event / MMKV 엔트리 삭제 이벤트
 */
export type MMKVDeleteEntryEvent = {
  type: 'delete-entry';
  id: string;
  key: string;
};

/**
 * MMKV get snapshot event / MMKV 스냅샷 요청 이벤트
 */
export type MMKVGetSnapshotEvent = {
  type: 'get-snapshot';
  id: string | 'all';
};

/**
 * MMKV event union type / MMKV 이벤트 유니온 타입
 */
export type MMKVEvent =
  | MMKVSnapshotEvent
  | MMKVSetEntryEvent
  | MMKVDeleteEntryEvent
  | MMKVGetSnapshotEvent;

/**
 * MMKV event map / MMKV 이벤트 맵
 */
export type MMKVEventMap = {
  [K in MMKVEvent['type']]: Extract<MMKVEvent, { type: K }>;
};
