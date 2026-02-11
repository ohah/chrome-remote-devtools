// MMKV DevTools / MMKV DevTools
// Register MMKV instances for DevTools inspection / DevTools 검사를 위해 MMKV 인스턴스 등록

import { getServerInfo } from '../server-info';
import { getMMKVView, type MMKVView } from './mmkv-view';
import { normalizeStoragesConfigProperty } from './utils';
import type { MMKV, MMKVEntry, MMKVStorageInput } from './types';
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
    return;
  }

  const serverInfo = getServerInfo();
  if (!serverInfo) {
    return;
  }

  mmkvViews.forEach((view) => {
    try {
      const entries = view.getAllEntries();
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
}

/**
 * Mark connection as ready / 연결 준비 완료 표시
 * Sends all MMKV snapshots so DevTools that already opened the MMKV tab get data (avoids race where enable was sent before connection) / 이미 MMKV 탭을 연 DevTools가 데이터를 받도록 스냅샷 전송 (연결 전 enable 수신 시 누락 방지)
 */
export function setMMKVConnectionReady(): void {
  isConnected = true;
  sendAllSnapshots();
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
      valueType: String(entry.type),
    });
  });
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
    valueType: String(entry.type),
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
 * @param storages MMKV instance(s) to monitor (v4 and v3 library instances accepted) / 모니터링할 MMKV 인스턴스(들), v4·v3 라이브러리 인스턴스 허용
 * @param blacklist Optional RegExp to blacklist properties / 속성을 블랙리스트에 추가할 선택적 RegExp
 *
 * Note: Each key (e.g. default, cache, legacy, user) should be a distinct MMKV instance. If you pass the same
 * MMKV instance under multiple keys, add/edit/delete in DevTools will appear in all sidebar lists because they
 * share the same backing store. / 각 키(default, cache 등)는 서로 다른 MMKV 인스턴스여야 함. 같은 인스턴스를 여러 키로 등록하면
 * DevTools에서 추가/수정/삭제 시 모든 사이드바 목록에 반영됨(동일 스토리지 공유).
 */
export function registerMMKVDevTools(storages: MMKVStorageInput, blacklist?: RegExp): void {
  try {
    // Cleanup existing subscriptions / 기존 구독 정리
    unregisterMMKVDevTools();

    // Normalize storages / 스토리지 정규화
    const normalizedStorages = normalizeStoragesConfigProperty(
      storages as MMKV | MMKV[] | Record<string, MMKV>
    );

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

    // Register CDP message handlers / CDP 메시지 핸들러 등록
    // Route based on method name / 메서드 이름을 기준으로 라우팅
    unregisterHandlers = [
      // Handle enable command from DevTools - send all snapshots when DevTools panel opens
      // DevTools에서 enable 명령 처리 - DevTools 패널이 열리면 모든 스냅샷 전송
      registerCDPMessageHandler('MMKVStorage.enable', () => {
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
        // Protocol Item = string[]; ensure every cell is string so number type is not lost over JSON
        // / 프로토콜 Item = string[]; JSON 직렬화 시 숫자 등이 바뀌지 않도록 모든 셀을 문자열로 보냄
        const cdpEntries: Array<[string, string, string]> = entries.map((entry) => [
          String(entry.key),
          entryValueToString(entry),
          String(entry.type),
        ]);

        // Send CDP response with id (use number so DevTools callback matches)
        // / id를 포함한 CDP 응답 전송 (DevTools 콜백 매칭을 위해 숫자 id 사용)
        const rawId = message.id;
        const responseId =
          typeof rawId === 'number' && Number.isFinite(rawId)
            ? rawId
            : typeof rawId === 'string'
              ? Number(rawId)
              : undefined;
        if (
          responseId !== undefined &&
          !Number.isNaN(responseId) &&
          cdpMessageSender &&
          isConnected
        ) {
          const serverInfo = getServerInfo();
          if (serverInfo) {
            const response = {
              id: responseId,
              result: {
                entries: cdpEntries,
              },
            };
            cdpMessageSender(serverInfo.host, serverInfo.port, JSON.stringify(response));
          }
        }
      }),

      registerCDPMessageHandler('MMKVStorage.setMMKVItem', (message) => {
        const params = message.params as {
          instanceId?: string;
          key?: string;
          value?: string;
          valueType?: 'string' | 'number' | 'boolean' | 'buffer';
        };
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

        // Normalize valueType to string (CDP sends string; ensure correct branch)
        // / valueType을 문자열로 정규화 (CDP는 문자열 전송; 올바른 분기 보장)
        const valueType = typeof params.valueType === 'string' ? params.valueType : undefined;

        if (valueType === 'number') {
          const numValue = Number(params.value);
          view.set(params.key, isNaN(numValue) ? 0 : numValue);
          return;
        }
        if (valueType === 'boolean') {
          view.set(params.key, params.value === 'true');
          return;
        }
        if (valueType === 'buffer') {
          try {
            const arr = JSON.parse(params.value) as number[];
            view.set(params.key, Array.isArray(arr) ? arr : []);
          } catch {
            view.set(params.key, []);
          }
          return;
        }

        // string or undefined: use as string, or infer for backward compat
        if (valueType === 'string') {
          view.set(params.key, params.value);
          return;
        }
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
