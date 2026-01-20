// AsyncStorage DevTools / AsyncStorage DevTools
// Register AsyncStorage instances for DevTools inspection / DevTools 검사를 위해 AsyncStorage 인스턴스 등록

import { getServerInfo } from '../server-info';
import { getAsyncStorageView, type AsyncStorageView } from './async-storage-view';
import { normalizeStoragesConfigProperty } from './utils';
import type { AsyncStorageType, AsyncStorageEntry } from './types';
import { registerCDPMessageHandler } from '../cdp-message-handler';

// Store AsyncStorage views / AsyncStorage 뷰 저장
let asyncStorageViews: Map<string, AsyncStorageView> | null = null;
let subscriptions: Array<{ remove: () => void }> = [];
let cdpMessageSender: ((host: string, port: number, message: string) => void) | null = null;
let isConnected = false;
let unregisterHandlers: Array<() => void> = [];

/**
 * Send snapshots for all registered storages / 등록된 모든 스토리지에 대한 스냅샷 전송
 * This is called when DevTools sends AsyncStorageStorage.enable / DevTools가 AsyncStorageStorage.enable을 보내면 호출됨
 */
async function sendAllSnapshots(): Promise<void> {
  if (!asyncStorageViews || !cdpMessageSender || !isConnected) {
    console.warn(
      `[AsyncStorageDevTools] Cannot send snapshots: asyncStorageViews=${!!asyncStorageViews}, cdpMessageSender=${!!cdpMessageSender}, isConnected=${isConnected}`
    );
    return;
  }

  const serverInfo = getServerInfo();
  if (!serverInfo) {
    console.warn('[AsyncStorageDevTools] serverInfo not available');
    return;
  }

  console.log(`[AsyncStorageDevTools] Sending snapshots for ${asyncStorageViews.size} storages`);

  for (const [id, view] of asyncStorageViews.entries()) {
    try {
      const entries = await view.getAllEntries();
      console.log(
        `[AsyncStorageDevTools] Sending snapshot for ${view.getId()}: ${entries.length} entries`
      );
      sendSnapshot(view.getId(), entries);
    } catch (error) {
      console.error(`[AsyncStorageDevTools] Error sending snapshot for ${view.getId()}:`, error);
    }
  }
}

/**
 * Set CDP message sender / CDP 메시지 전송자 설정
 */
export function setAsyncStorageCDPSender(
  sender: (host: string, port: number, message: string) => void
): void {
  cdpMessageSender = sender;
  console.log('[AsyncStorageDevTools] CDP sender set');
}

/**
 * Mark connection as ready / 연결 준비 완료 표시
 */
export function setAsyncStorageConnectionReady(): void {
  isConnected = true;
  console.log(
    `[AsyncStorageDevTools] Connection ready, asyncStorageViews: ${asyncStorageViews ? asyncStorageViews.size : 0} storages`
  );
}

/**
 * Convert AsyncStorage entry value to string / AsyncStorage 엔트리 값을 문자열로 변환
 * Protocol requires newValue to be string / Protocol은 newValue를 문자열로 요구함
 */
function entryValueToString(entry: AsyncStorageEntry): string {
  return entry.value;
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
    console.error('[AsyncStorageDevTools] Error sending CDP message:', e);
  }
}

/**
 * Send snapshot event in Protocol format / Protocol 형식으로 스냅샷 이벤트 전송
 * Sends asyncStorageInstanceCreated first, then asyncStorageItemAdded for each entry / 먼저 asyncStorageInstanceCreated를 보내고, 각 entry마다 asyncStorageItemAdded를 보냄
 */
function sendSnapshot(instanceId: string, entries: AsyncStorageEntry[]): void {
  // 1. Send instance created event / 인스턴스 생성 이벤트 전송
  sendCDPMessageInternal('AsyncStorageStorage.asyncStorageInstanceCreated', {
    instanceId,
  });

  // 2. Send item added event for each entry / 각 entry마다 아이템 추가 이벤트 전송
  entries.forEach((entry) => {
    const valueStr = entryValueToString(entry);
    sendCDPMessageInternal('AsyncStorageStorage.asyncStorageItemAdded', {
      instanceId,
      key: entry.key,
      newValue: valueStr,
    });
  });

  // Debug log / 디버그 로그
  console.log(
    `[AsyncStorageDevTools] Sent snapshot for ${instanceId}: ${entries.length} entries / ${instanceId}에 대한 스냅샷 전송: ${entries.length}개 엔트리`
  );
}

/**
 * Send set entry event in Protocol format / Protocol 형식으로 엔트리 설정 이벤트 전송
 * Uses asyncStorageItemAdded (oldValue is not tracked, so we use ItemAdded instead of ItemUpdated) / asyncStorageItemAdded 사용 (oldValue를 추적하지 않으므로 ItemUpdated 대신 ItemAdded 사용)
 */
async function sendSetEntry(
  instanceId: string,
  entry: AsyncStorageEntry | undefined
): Promise<void> {
  if (!entry) {
    return;
  }
  const valueStr = entryValueToString(entry);
  sendCDPMessageInternal('AsyncStorageStorage.asyncStorageItemAdded', {
    instanceId,
    key: entry.key,
    newValue: valueStr,
  });
}

/**
 * Send delete entry event in Protocol format / Protocol 형식으로 엔트리 삭제 이벤트 전송
 */
function sendDeleteEntry(instanceId: string, key: string): void {
  sendCDPMessageInternal('AsyncStorageStorage.asyncStorageItemRemoved', {
    instanceId,
    key,
  });
}

/**
 * Hook AsyncStorage methods to intercept all calls / 모든 호출을 가로채도록 AsyncStorage 메서드 훅
 * This allows us to detect changes even when AsyncStorage is called directly / AsyncStorage가 직접 호출되어도 변경사항을 감지할 수 있음
 */
function hookAsyncStorageMethods(
  instanceId: string,
  storage: AsyncStorageType,
  view: ReturnType<typeof getAsyncStorageView>
): void {
  // Store original methods / 원본 메서드 저장
  const original = {
    setItem: storage.setItem.bind(storage),
    removeItem: storage.removeItem.bind(storage),
    clear: storage.clear.bind(storage),
    multiSet: storage.multiSet.bind(storage),
    multiRemove: storage.multiRemove.bind(storage),
    multiMerge: storage.multiMerge.bind(storage),
  };

  // Override setItem / setItem 오버라이드
  (storage as any).setItem = async (key: string, value: string): Promise<void> => {
    await original.setItem(key, value);
    // Notify view about change / 뷰에 변경사항 알림
    view.notifyChange(key);
  };

  // Override removeItem / removeItem 오버라이드
  (storage as any).removeItem = async (key: string): Promise<void> => {
    await original.removeItem(key);
    // Notify view about change / 뷰에 변경사항 알림
    view.notifyChange(key);
  };

  // Override clear / clear 오버라이드
  (storage as any).clear = async (): Promise<void> => {
    // Get keys before clearing / 클리어하기 전에 키 가져오기
    const keys = await storage.getAllKeys();
    await original.clear();
    // Notify view about all removed keys / 모든 삭제된 키에 대해 뷰에 알림
    keys.forEach((key) => view.notifyChange(key));
  };

  // Override multiSet / multiSet 오버라이드
  (storage as any).multiSet = async (entries: Array<[string, string]>): Promise<void> => {
    await original.multiSet(entries);
    // Notify view about all changed keys / 모든 변경된 키에 대해 뷰에 알림
    entries.forEach(([key]) => view.notifyChange(key));
  };

  // Override multiRemove / multiRemove 오버라이드
  (storage as any).multiRemove = async (keys: string[]): Promise<void> => {
    await original.multiRemove(keys);
    // Notify view about all removed keys / 모든 삭제된 키에 대해 뷰에 알림
    keys.forEach((key) => view.notifyChange(key));
  };

  // Override multiMerge / multiMerge 오버라이드
  (storage as any).multiMerge = async (entries: Array<[string, string]>): Promise<void> => {
    await original.multiMerge(entries);
    // Notify view about all merged keys / 모든 병합된 키에 대해 뷰에 알림
    entries.forEach(([key]) => view.notifyChange(key));
  };
}

/**
 * Register AsyncStorage DevTools / AsyncStorage DevTools 등록
 * @param storage AsyncStorage instance(s) to monitor / 모니터링할 AsyncStorage 인스턴스(들)
 * @param blacklist Optional RegExp to blacklist properties / 속성을 블랙리스트에 추가할 선택적 RegExp
 */
export function registerAsyncStorageDevTools(
  storage: AsyncStorageType | Record<string, AsyncStorageType>,
  blacklist?: RegExp
): void {
  try {
    // Cleanup existing subscriptions / 기존 구독 정리
    unregisterAsyncStorageDevTools();

    // Normalize storage / 스토리지 정규화
    const normalizedStorages = normalizeStoragesConfigProperty(storage);

    // Create views / 뷰 생성
    asyncStorageViews = new Map();
    subscriptions = [];

    Object.entries(normalizedStorages).forEach(([id, storageInstance]) => {
      try {
        // Create view first / 먼저 뷰 생성
        const view = getAsyncStorageView(id, storageInstance, blacklist);
        asyncStorageViews?.set(id, view);

        // Hook AsyncStorage methods to notify changes / AsyncStorage 메서드를 훅하여 변경사항 알림
        hookAsyncStorageMethods(id, storageInstance, view);

        // Listen for changes / 변경사항 리스닝
        const subscription = view.onChange(async (key) => {
          try {
            const entry = await view.get(key);

            if (!entry) {
              // Key was deleted / 키가 삭제됨
              sendDeleteEntry(id, key);
              return;
            }

            // Key was set / 키가 설정됨
            await sendSetEntry(id, entry);
          } catch (error) {
            console.error(`[AsyncStorageDevTools] Error handling change for ${id}:${key}:`, error);
          }
        });

        subscriptions.push(subscription);
      } catch (error) {
        console.error(`[AsyncStorageDevTools] Error registering storage ${id}:`, error);
      }
    });

    console.log(
      `[AsyncStorageDevTools] Registered ${asyncStorageViews.size} storages, waiting for DevTools enable signal`
    );

    // Register CDP message handlers / CDP 메시지 핸들러 등록
    // Route based on method name / 메서드 이름을 기준으로 라우팅
    unregisterHandlers = [
      // Handle enable command from DevTools - send all snapshots when DevTools panel opens
      // DevTools에서 enable 명령 처리 - DevTools 패널이 열리면 모든 스냅샷 전송
      registerCDPMessageHandler('AsyncStorageStorage.enable', () => {
        console.log(
          '[AsyncStorageDevTools] Received enable command from DevTools, sending snapshots'
        );
        void sendAllSnapshots();
      }),

      registerCDPMessageHandler('AsyncStorageStorage.getAsyncStorageItems', async (message) => {
        const params = message.params as { instanceId?: string };
        if (!params?.instanceId || !asyncStorageViews) {
          return;
        }

        const view = asyncStorageViews.get(params.instanceId);
        if (!view) {
          return;
        }

        const entries = await view.getAllEntries();
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
              `[AsyncStorageDevTools] Sent getAsyncStorageItems response for ${params.instanceId}: ${cdpEntries.length} entries / ${params.instanceId}에 대한 getAsyncStorageItems 응답 전송: ${cdpEntries.length}개 엔트리`
            );
          }
        }
      }),

      registerCDPMessageHandler('AsyncStorageStorage.setAsyncStorageItem', async (message) => {
        const params = message.params as { instanceId?: string; key?: string; value?: string };
        if (
          !params?.instanceId ||
          params.key === undefined ||
          params.value === undefined ||
          !asyncStorageViews
        ) {
          return;
        }

        const view = asyncStorageViews.get(params.instanceId);
        if (!view) {
          return;
        }

        await view.set(params.key, params.value);
      }),

      registerCDPMessageHandler('AsyncStorageStorage.removeAsyncStorageItem', async (message) => {
        const params = message.params as { instanceId?: string; key?: string };
        if (!params?.instanceId || params.key === undefined || !asyncStorageViews) {
          return;
        }

        const view = asyncStorageViews.get(params.instanceId);
        if (!view) {
          return;
        }

        await view.delete(params.key);
      }),

      registerCDPMessageHandler('AsyncStorageStorage.clear', async (message) => {
        const params = message.params as { instanceId?: string };
        if (!params?.instanceId || !asyncStorageViews) {
          return;
        }

        const view = asyncStorageViews.get(params.instanceId);
        if (!view) {
          return;
        }

        const allEntries = await view.getAllEntries();
        for (const entry of allEntries) {
          await view.delete(entry.key);
        }
      }),
    ];

    console.log(
      '[AsyncStorageDevTools] Registered CDP message handlers / CDP 메시지 핸들러 등록됨'
    );
  } catch (error) {
    console.error('[AsyncStorageDevTools] Error registering AsyncStorage DevTools:', error);
    // Don't throw - allow app to continue / throw하지 않음 - 앱이 계속 작동하도록 함
  }
}

/**
 * Unregister AsyncStorage DevTools / AsyncStorage DevTools 등록 해제
 */
export function unregisterAsyncStorageDevTools(): void {
  // Unregister CDP handlers / CDP 핸들러 등록 해제
  unregisterHandlers.forEach((unregister) => unregister());
  unregisterHandlers = [];

  // Remove all subscriptions / 모든 구독 제거
  subscriptions.forEach((subscription) => subscription.remove());
  subscriptions = [];

  asyncStorageViews = null;
}
