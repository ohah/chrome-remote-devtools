// MMKV DevTools / MMKV DevTools
// Register MMKV instances for DevTools inspection / DevTools 검사를 위해 MMKV 인스턴스 등록

import { getServerInfo } from '../server-info';
import { getMMKVView, type MMKVView } from './mmkv-view';
import { normalizeStoragesConfigProperty, type MMKV } from './utils';
import type { MMKVEvent } from './messaging';

// Store MMKV views / MMKV 뷰 저장
let mmkvViews: Map<string, MMKVView> | null = null;
let subscriptions: Array<{ remove: () => void }> = [];
let cdpMessageSender: ((host: string, port: number, message: string) => void) | null = null;
let isConnected = false;

/**
 * Set CDP message sender / CDP 메시지 전송자 설정
 */
export function setMMKVCDPSender(
  sender: (host: string, port: number, message: string) => void
): void {
  cdpMessageSender = sender;
}

/**
 * Mark connection as ready / 연결 준비 완료 표시
 */
export function setMMKVConnectionReady(): void {
  isConnected = true;
  // Send initial snapshots / 초기 스냅샷 전송
  if (mmkvViews) {
    mmkvViews.forEach((view) => {
      sendSnapshot(view.getId(), view.getAllEntries());
    });
  }
}

/**
 * Send CDP message / CDP 메시지 전송
 */
function sendCDPMessageInternal(event: MMKVEvent): void {
  const serverInfo = getServerInfo();

  if (!isConnected || !cdpMessageSender || !serverInfo) {
    // Queue for later / 나중에 전송하도록 대기열에 추가
    return;
  }

  try {
    // Format as CDP message / CDP 메시지 형식으로 포맷팅
    const cdpMessage = {
      method: 'MMKV.event',
      params: event,
    };
    cdpMessageSender(serverInfo.host, serverInfo.port, JSON.stringify(cdpMessage));
  } catch (e) {
    console.error('[MMKVDevTools] Error sending CDP message:', e);
  }
}

/**
 * Send snapshot event / 스냅샷 이벤트 전송
 */
function sendSnapshot(id: string, entries: ReturnType<MMKVView['getAllEntries']>): void {
  sendCDPMessageInternal({
    type: 'snapshot',
    id,
    entries,
  });
}

/**
 * Send set entry event / 엔트리 설정 이벤트 전송
 */
function sendSetEntry(id: string, entry: ReturnType<MMKVView['get']>): void {
  if (!entry) {
    return;
  }
  sendCDPMessageInternal({
    type: 'set-entry',
    id,
    entry,
  });
}

/**
 * Send delete entry event / 엔트리 삭제 이벤트 전송
 */
function sendDeleteEntry(id: string, key: string): void {
  sendCDPMessageInternal({
    type: 'delete-entry',
    id,
    key,
  });
}

/**
 * Register MMKV DevTools / MMKV DevTools 등록
 * @param storages MMKV instance(s) to monitor / 모니터링할 MMKV 인스턴스(들)
 * @param blacklist Optional RegExp to blacklist properties / 속성을 블랙리스트에 추가할 선택적 RegExp
 */
export function registerMMKVDevTools(
  storages: MMKV | MMKV[] | Record<string, MMKV>,
  blacklist?: RegExp
): void {
  try {
    // Cleanup existing subscriptions / 기존 구독 정리
    unregisterMMKVDevTools();

    // Normalize storages / 스토리지 정규화
    const normalizedStorages = normalizeStoragesConfigProperty(storages);

    // Create views / 뷰 생성
    mmkvViews = new Map();
    subscriptions = [];

    Object.entries(normalizedStorages).forEach(([id, storage]) => {
      try {
        const view = getMMKVView(id, storage, blacklist);
        mmkvViews?.set(id, view);

        // Send initial snapshot asynchronously to avoid blocking / 블로킹 방지를 위해 비동기로 초기 스냅샷 전송
        if (isConnected) {
          // Use setTimeout to defer snapshot sending / 스냅샷 전송을 지연시키기 위해 setTimeout 사용
          setTimeout(() => {
            try {
              sendSnapshot(id, view.getAllEntries());
            } catch (error) {
              console.error(`[MMKVDevTools] Error sending snapshot for ${id}:`, error);
            }
          }, 0);
        }

        // Listen for changes / 변경사항 리스닝
        const subscription = view.onChange((key) => {
          try {
            const entry = view.get(key);

            if (!entry) {
              // Key was deleted / 키가 삭제됨
              sendDeleteEntry(id, key);
              return;
            }

            // Key was set / 키가 설정됨
            sendSetEntry(id, entry);
          } catch (error) {
            console.error(`[MMKVDevTools] Error handling change for ${id}:${key}:`, error);
          }
        });

        subscriptions.push(subscription);
      } catch (error) {
        console.error(`[MMKVDevTools] Error registering storage ${id}:`, error);
      }
    });
  } catch (error) {
    console.error('[MMKVDevTools] Error registering MMKV DevTools:', error);
    // Don't throw - allow app to continue / throw하지 않음 - 앱이 계속 작동하도록 함
  }
}

/**
 * Unregister MMKV DevTools / MMKV DevTools 등록 해제
 */
export function unregisterMMKVDevTools(): void {
  // Remove all subscriptions / 모든 구독 제거
  subscriptions.forEach((subscription) => subscription.remove());
  subscriptions = [];
  mmkvViews = null;
}

/**
 * Handle CDP message from Inspector / Inspector로부터 CDP 메시지 처리
 * This should be called when Inspector sends commands / Inspector가 명령을 보낼 때 호출되어야 함
 */
export function handleMMKVCDPMessage(message: { method?: string; params?: unknown }): void {
  if (message.method !== 'MMKV.command') {
    return;
  }

  const event = message.params as MMKVEvent;

  if (!event || !mmkvViews) {
    return;
  }

  switch (event.type) {
    case 'set-entry': {
      const view = mmkvViews.get(event.id);
      if (view) {
        view.set(event.entry.key, event.entry.value);
      }
      break;
    }
    case 'delete-entry': {
      const view = mmkvViews.get(event.id);
      if (view) {
        view.delete(event.key);
      }
      break;
    }
    case 'get-snapshot': {
      if (event.id === 'all') {
        mmkvViews.forEach((view) => {
          sendSnapshot(view.getId(), view.getAllEntries());
        });
      } else {
        const view = mmkvViews.get(event.id);
        if (view) {
          sendSnapshot(view.getId(), view.getAllEntries());
        }
      }
      break;
    }
  }
}
