// MMKV DevTools / MMKV DevTools
// Register MMKV instances for DevTools inspection / DevTools 검사를 위해 MMKV 인스턴스 등록

import { getServerInfo } from '../server-info';
import { getMMKVView, type MMKVView } from './mmkv-view';
import { normalizeStoragesConfigProperty, type MMKV } from './utils';
import type { MMKVEntry } from './types';
import { registerCDPMessageHandler } from '../cdp-message-handler';

// Store MMKV views / MMKV 뷰 저장
let mmkvViews: Map<string, MMKVView> | null = null;
let subscriptions: Array<{ remove: () => void }> = [];
let cdpMessageSender: ((host: string, port: number, message: string) => void) | null = null;
let isConnected = false;
let unregisterHandlers: Array<() => void> = [];

/**
 * Send snapshots for all registered storages / 등록된 모든 스토리지에 대한 스냅샷 전송
 * This is called when DevTools sends MMKVStorage.enable / DevTools가 MMKVStorage.enable을 보내면 호출됨
 */
function sendAllSnapshots(): void {
  if (!mmkvViews || !cdpMessageSender || !isConnected) {
    console.warn(
      `[MMKVDevTools] Cannot send snapshots: mmkvViews=${!!mmkvViews}, cdpMessageSender=${!!cdpMessageSender}, isConnected=${isConnected}`
    );
    return;
  }

  const serverInfo = getServerInfo();
  if (!serverInfo) {
    console.warn('[MMKVDevTools] serverInfo not available');
    return;
  }

  console.log(`[MMKVDevTools] Sending snapshots for ${mmkvViews.size} storages`);

  mmkvViews.forEach((view) => {
    try {
      const entries = view.getAllEntries();
      console.log(`[MMKVDevTools] Sending snapshot for ${view.getId()}: ${entries.length} entries`);
      sendSnapshot(view.getId(), entries);
    } catch (error) {
      console.error(`[MMKVDevTools] Error sending snapshot for ${view.getId()}:`, error);
    }
  });
}

/**
 * Set CDP message sender / CDP 메시지 전송자 설정
 */
export function setMMKVCDPSender(
  sender: (host: string, port: number, message: string) => void
): void {
  cdpMessageSender = sender;
  console.log('[MMKVDevTools] CDP sender set');
}

/**
 * Mark connection as ready / 연결 준비 완료 표시
 */
export function setMMKVConnectionReady(): void {
  isConnected = true;
  console.log(
    `[MMKVDevTools] Connection ready, mmkvViews: ${mmkvViews ? mmkvViews.size : 0} storages`
  );
}

/**
 * Convert MMKV entry value to string / MMKV 엔트리 값을 문자열로 변환
 * Protocol requires newValue to be string / Protocol은 newValue를 문자열로 요구함
 */
function entryValueToString(entry: MMKVEntry): string {
  if (entry.type === 'string') {
    return entry.value;
  } else if (entry.type === 'number') {
    return String(entry.value);
  } else if (entry.type === 'boolean') {
    return String(entry.value);
  } else {
    // buffer is array of numbers, convert to JSON / buffer는 숫자 배열이므로 JSON으로 변환
    return JSON.stringify(entry.value);
  }
}

/**
 * Send CDP message in Protocol format / Protocol 형식으로 CDP 메시지 전송
 */
function sendCDPMessageInternal(method: string, params: unknown): void {
  const serverInfo = getServerInfo();

  if (!isConnected || !cdpMessageSender || !serverInfo) {
    return;
  }

  try {
    const cdpMessage = { method, params };
    cdpMessageSender(serverInfo.host, serverInfo.port, JSON.stringify(cdpMessage));
  } catch (e) {
    console.error('[MMKVDevTools] Error sending CDP message:', e);
  }
}

/**
 * Send snapshot event in Protocol format / Protocol 형식으로 스냅샷 이벤트 전송
 * Sends mmkvInstanceCreated first, then mmkvItemAdded for each entry / 먼저 mmkvInstanceCreated를 보내고, 각 entry마다 mmkvItemAdded를 보냄
 */
function sendSnapshot(instanceId: string, entries: ReturnType<MMKVView['getAllEntries']>): void {
  // 1. Send instance created event / 인스턴스 생성 이벤트 전송
  sendCDPMessageInternal('MMKVStorage.mmkvInstanceCreated', {
    instanceId,
  });

  // 2. Send item added event for each entry / 각 entry마다 아이템 추가 이벤트 전송
  entries.forEach((entry) => {
    const valueStr = entryValueToString(entry);
    sendCDPMessageInternal('MMKVStorage.mmkvItemAdded', {
      instanceId,
      key: entry.key,
      newValue: valueStr,
    });
  });

  // Debug log / 디버그 로그
  console.log(
    `[MMKVDevTools] Sent snapshot for ${instanceId}: ${entries.length} entries / ${instanceId}에 대한 스냅샷 전송: ${entries.length}개 엔트리`
  );
}

/**
 * Send set entry event in Protocol format / Protocol 형식으로 엔트리 설정 이벤트 전송
 * Uses mmkvItemAdded (oldValue is not tracked, so we use ItemAdded instead of ItemUpdated) / mmkvItemAdded 사용 (oldValue를 추적하지 않으므로 ItemUpdated 대신 ItemAdded 사용)
 */
function sendSetEntry(instanceId: string, entry: ReturnType<MMKVView['get']>): void {
  if (!entry) {
    return;
  }
  const valueStr = entryValueToString(entry);
  sendCDPMessageInternal('MMKVStorage.mmkvItemAdded', {
    instanceId,
    key: entry.key,
    newValue: valueStr,
  });
}

/**
 * Send delete entry event in Protocol format / Protocol 형식으로 엔트리 삭제 이벤트 전송
 */
function sendDeleteEntry(instanceId: string, key: string): void {
  sendCDPMessageInternal('MMKVStorage.mmkvItemRemoved', {
    instanceId,
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

    console.log(
      `[MMKVDevTools] Registered ${mmkvViews.size} storages, waiting for DevTools enable signal`
    );

    // Register CDP message handlers / CDP 메시지 핸들러 등록
    // Route based on method name / 메서드 이름을 기준으로 라우팅
    unregisterHandlers = [
      // Handle enable command from DevTools - send all snapshots when DevTools panel opens
      // DevTools에서 enable 명령 처리 - DevTools 패널이 열리면 모든 스냅샷 전송
      registerCDPMessageHandler('MMKVStorage.enable', () => {
        console.log('[MMKVDevTools] Received enable command from DevTools, sending snapshots');
        sendAllSnapshots();
      }),

      registerCDPMessageHandler('MMKVStorage.getMMKVItems', (message) => {
        const params = message.params as { instanceId?: string };
        if (!params?.instanceId || !mmkvViews) {
          return;
        }

        const view = mmkvViews.get(params.instanceId);
        if (!view) {
          return;
        }

        const entries = view.getAllEntries();
        const cdpEntries: Array<[string, string]> = entries.map((entry) => [
          entry.key,
          entryValueToString(entry),
        ]);

        // Send CDP response with id / id를 포함한 CDP 응답 전송
        if (message.id !== undefined && cdpMessageSender && isConnected) {
          const serverInfo = getServerInfo();
          if (serverInfo) {
            const response = {
              id: message.id,
              result: {
                entries: cdpEntries,
              },
            };
            cdpMessageSender(serverInfo.host, serverInfo.port, JSON.stringify(response));
            console.log(
              `[MMKVDevTools] Sent getMMKVItems response for ${params.instanceId}: ${cdpEntries.length} entries / ${params.instanceId}에 대한 getMMKVItems 응답 전송: ${cdpEntries.length}개 엔트리`
            );
          }
        }
      }),

      registerCDPMessageHandler('MMKVStorage.setMMKVItem', (message) => {
        const params = message.params as { instanceId?: string; key?: string; value?: string };
        if (
          !params?.instanceId ||
          params.key === undefined ||
          params.value === undefined ||
          !mmkvViews
        ) {
          return;
        }

        const view = mmkvViews.get(params.instanceId);
        if (!view) {
          return;
        }

        // Try to infer type from string value / 문자열 값에서 타입 추론 시도
        const numValue = Number(params.value);
        if (!isNaN(numValue) && String(numValue) === params.value) {
          view.set(params.key, numValue);
        } else if (params.value === 'true' || params.value === 'false') {
          view.set(params.key, params.value === 'true');
        } else {
          view.set(params.key, params.value);
        }
      }),

      registerCDPMessageHandler('MMKVStorage.removeMMKVItem', (message) => {
        const params = message.params as { instanceId?: string; key?: string };
        if (!params?.instanceId || params.key === undefined || !mmkvViews) {
          return;
        }

        const view = mmkvViews.get(params.instanceId);
        if (!view) {
          return;
        }

        view.delete(params.key);
      }),

      registerCDPMessageHandler('MMKVStorage.clear', (message) => {
        const params = message.params as { instanceId?: string };
        if (!params?.instanceId || !mmkvViews) {
          return;
        }

        const view = mmkvViews.get(params.instanceId);
        if (!view) {
          return;
        }

        const allEntries = view.getAllEntries();
        allEntries.forEach((entry: MMKVEntry) => {
          view.delete(entry.key);
        });
      }),
    ];

    console.log('[MMKVDevTools] Registered CDP message handlers / CDP 메시지 핸들러 등록됨');
  } catch (error) {
    console.error('[MMKVDevTools] Error registering MMKV DevTools:', error);
    // Don't throw - allow app to continue / throw하지 않음 - 앱이 계속 작동하도록 함
  }
}

/**
 * Unregister MMKV DevTools / MMKV DevTools 등록 해제
 */
export function unregisterMMKVDevTools(): void {
  // Unregister CDP handlers / CDP 핸들러 등록 해제
  unregisterHandlers.forEach((unregister) => unregister());
  unregisterHandlers = [];

  // Remove all subscriptions / 모든 구독 제거
  subscriptions.forEach((subscription) => subscription.remove());
  subscriptions = [];

  mmkvViews = null;
}
