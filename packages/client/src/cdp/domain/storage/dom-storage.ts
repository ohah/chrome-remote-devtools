// DOMStorage domain implementation / DOMStorage 도메인 구현
import BaseDomain from '../base';
import { Event } from '../protocol';

interface StorageId {
  isLocalStorage: boolean;
  storageKey?: string;
  securityOrigin?: string;
}

interface StorageChangeEvent {
  type: 'added' | 'updated' | 'removed' | 'cleared';
  key: string | null;
  oldValue: string | null;
  newValue: string | null;
}

interface OriginalStorageMethods {
  setItem: typeof Storage.prototype.setItem;
  removeItem: typeof Storage.prototype.removeItem;
  clear: typeof Storage.prototype.clear;
}

// Storage observer using WeakMap + Descriptor pattern / WeakMap + Descriptor 패턴을 사용한 Storage 감지
class StorageObserver {
  private listeners: Map<Storage, Set<(event: StorageChangeEvent) => void>> = new Map();
  private originalMethods: WeakMap<Storage, OriginalStorageMethods> = new WeakMap();

  // Subscribe to storage changes / storage 변경 구독
  subscribe(storage: Storage, callback: (event: StorageChangeEvent) => void): () => void {
    if (!this.listeners.has(storage)) {
      this.listeners.set(storage, new Set());
      this.hookStorage(storage);
    }

    this.listeners.get(storage)!.add(callback);

    // Return unsubscribe function / 구독 해제 함수 반환
    return () => {
      const listeners = this.listeners.get(storage);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.unhookStorage(storage);
          this.listeners.delete(storage);
        }
      }
    };
  }

  // Hook storage instance using WeakMap / WeakMap을 사용한 storage 인스턴스 훅킹
  private hookStorage(storage: Storage): void {
    if (this.originalMethods.has(storage)) {
      return; // Already hooked / 이미 훅킹됨
    }

    // Store original methods in WeakMap / WeakMap에 원본 메서드 저장
    const originSetItem = storage.setItem.bind(storage);
    const originRemoveItem = storage.removeItem.bind(storage);
    const originClear = storage.clear.bind(storage);

    this.originalMethods.set(storage, {
      setItem: originSetItem,
      removeItem: originRemoveItem,
      clear: originClear,
    });

    // Hook setItem / setItem 훅킹
    storage.setItem = (key: string, value: string) => {
      const original = this.originalMethods.get(storage);
      if (!original) return;

      const oldValue = storage.getItem(key);
      const isKeyExisted = oldValue !== null;

      original.setItem(key, value);

      // Notify observers / 옵저버에게 알림
      this.notify(storage, {
        type: isKeyExisted ? 'updated' : 'added',
        key,
        oldValue,
        newValue: value,
      });
    };

    // Hook removeItem / removeItem 훅킹
    storage.removeItem = (key: string) => {
      const original = this.originalMethods.get(storage);
      if (!original) return;

      const oldValue = storage.getItem(key);

      if (oldValue !== null) {
        original.removeItem(key);

        // Notify observers / 옵저버에게 알림
        this.notify(storage, {
          type: 'removed',
          key,
          oldValue,
          newValue: null,
        });
      }
    };

    // Hook clear / clear 훅킹
    storage.clear = () => {
      const original = this.originalMethods.get(storage);
      if (!original) return;

      original.clear();

      // Notify observers / 옵저버에게 알림
      this.notify(storage, {
        type: 'cleared',
        key: null,
        oldValue: null,
        newValue: null,
      });
    };
  }

  // Unhook storage instance / storage 인스턴스 훅킹 해제
  private unhookStorage(storage: Storage): void {
    const methods = this.originalMethods.get(storage);
    if (methods) {
      storage.setItem = methods.setItem;
      storage.removeItem = methods.removeItem;
      storage.clear = methods.clear;
      this.originalMethods.delete(storage);
    }
  }

  // Notify all observers / 모든 옵저버에게 알림
  private notify(storage: Storage, event: StorageChangeEvent): void {
    const listeners = this.listeners.get(storage);

    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(event);
        } catch {
          // Silently ignore callback errors / 콜백 에러는 조용히 무시
        }
      });
    }
  }
}

// Global storage observer instance / 전역 storage observer 인스턴스
const storageObserver = new StorageObserver();

export class DOMStorage extends BaseDomain {
  override namespace = 'DOMStorage';

  private isEnable = false;
  private unsubscribeFunctions: Array<() => void> = [];

  // Enable DOMStorage domain / DOMStorage 도메인 활성화
  override enable(): void {
    if (this.isEnable) {
      return;
    }
    this.isEnable = true;
    this.setupStorageListeners();

    // Send initial storage items to Inspector / Inspector에 초기 storage 항목 전송
    // This helps Inspector detect existing storage even if StorageKeyManager hasn't added the storage key yet / StorageKeyManager가 아직 storage key를 추가하지 않았더라도 Inspector가 기존 storage를 감지할 수 있도록 도움
    // Inspector may call getDOMStorageItems when user opens Local/Session Storage section / 사용자가 Local/Session Storage 섹션을 열 때 Inspector가 getDOMStorageItems를 호출할 수 있음
    // But we also proactively send events for existing items to ensure they're visible / 하지만 기존 항목에 대한 이벤트를 사전에 전송하여 표시되도록 보장
    const storageKey = location.origin;
    const localStorageId: StorageId = {
      isLocalStorage: true,
      storageKey,
      securityOrigin: storageKey,
    };
    const sessionStorageId: StorageId = {
      isLocalStorage: false,
      storageKey,
      securityOrigin: storageKey,
    };

    // Send DOMStorage.domStorageItemAdded events for existing localStorage items / 기존 localStorage 항목에 대한 DOMStorage.domStorageItemAdded 이벤트 전송
    const localStorageItems = this.getDOMStorageItems({ storageId: localStorageId });
    localStorageItems.entries.forEach(([key, value]) => {
      this.send({
        method: Event.domStorageItemAdded,
        params: { storageId: localStorageId, key, newValue: value },
      });
    });

    // Send DOMStorage.domStorageItemAdded events for existing sessionStorage items / 기존 sessionStorage 항목에 대한 DOMStorage.domStorageItemAdded 이벤트 전송
    const sessionStorageItems = this.getDOMStorageItems({ storageId: sessionStorageId });
    sessionStorageItems.entries.forEach(([key, value]) => {
      this.send({
        method: Event.domStorageItemAdded,
        params: { storageId: sessionStorageId, key, newValue: value },
      });
    });
  }

  // Disable DOMStorage domain / DOMStorage 도메인 비활성화
  disable(): void {
    if (!this.isEnable) {
      return;
    }
    this.isEnable = false;
    this.removeStorageListeners();
  }

  // Get DOM storage items / DOM storage 항목 가져오기
  getDOMStorageItems({ storageId }: { storageId: StorageId }): {
    entries: Array<[string, string]>;
  } {
    const storage = storageId.isLocalStorage ? localStorage : sessionStorage;
    const entries: Array<[string, string]> = [];

    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key !== null) {
        const value = storage.getItem(key);
        if (value !== null) {
          entries.push([key, value]);
        }
      }
    }

    return { entries };
  }

  // Set DOM storage item / DOM storage 항목 설정
  setDOMStorageItem({
    storageId,
    key,
    value,
  }: {
    storageId: StorageId;
    key: string;
    value: string;
  }): void {
    const storage = storageId.isLocalStorage ? localStorage : sessionStorage;
    const oldValue = storage.getItem(key);

    storage.setItem(key, value);

    // Send event if enabled / 활성화된 경우 이벤트 전송
    // Note: StorageObserver will also send event, but we send it here for consistency / 참고: StorageObserver도 이벤트를 전송하지만, 일관성을 위해 여기서도 전송
    if (this.isEnable) {
      if (oldValue === null) {
        // Item added / 항목 추가됨
        this.send({
          method: Event.domStorageItemAdded,
          params: {
            storageId,
            key,
            newValue: value,
          },
        });
      } else {
        // Item updated / 항목 업데이트됨
        this.send({
          method: Event.domStorageItemUpdated,
          params: {
            storageId,
            key,
            oldValue,
            newValue: value,
          },
        });
      }
    }
  }

  // Remove DOM storage item / DOM storage 항목 제거
  removeDOMStorageItem({ storageId, key }: { storageId: StorageId; key: string }): void {
    const storage = storageId.isLocalStorage ? localStorage : sessionStorage;
    const oldValue = storage.getItem(key);

    if (oldValue !== null) {
      storage.removeItem(key);

      // Send event if enabled / 활성화된 경우 이벤트 전송
      // Note: StorageObserver will also send event, but we send it here for consistency / 참고: StorageObserver도 이벤트를 전송하지만, 일관성을 위해 여기서도 전송
      if (this.isEnable) {
        this.send({
          method: Event.domStorageItemRemoved,
          params: {
            storageId,
            key,
          },
        });
      }
    }
  }

  // Clear DOM storage / DOM storage 전체 삭제
  clear({ storageId }: { storageId: StorageId }): void {
    const storage = storageId.isLocalStorage ? localStorage : sessionStorage;

    storage.clear();

    // Send event if enabled / 활성화된 경우 이벤트 전송
    // Note: StorageObserver will also send event, but we send it here for consistency / 참고: StorageObserver도 이벤트를 전송하지만, 일관성을 위해 여기서도 전송
    if (this.isEnable) {
      this.send({
        method: Event.domStorageItemsCleared,
        params: {
          storageId,
        },
      });
    }
  }

  // Setup storage event listeners using observer pattern / 옵저버 패턴을 사용한 storage 이벤트 리스너 설정
  private setupStorageListeners(): void {
    // Subscribe to localStorage changes / localStorage 변경 구독
    const unsubscribeLocal = storageObserver.subscribe(localStorage, (event) => {
      if (!this.isEnable) {
        return;
      }

      const storageId: StorageId = {
        isLocalStorage: true,
        storageKey: location.origin,
        securityOrigin: location.origin,
      };

      this.handleStorageChange(storageId, event);
    });

    // Subscribe to sessionStorage changes / sessionStorage 변경 구독
    const unsubscribeSession = storageObserver.subscribe(sessionStorage, (event) => {
      if (!this.isEnable) {
        return;
      }

      const storageId: StorageId = {
        isLocalStorage: false,
        storageKey: location.origin,
        securityOrigin: location.origin,
      };

      this.handleStorageChange(storageId, event);
    });

    this.unsubscribeFunctions.push(unsubscribeLocal, unsubscribeSession);
  }

  // Handle storage change event / storage 변경 이벤트 처리
  private handleStorageChange(storageId: StorageId, event: StorageChangeEvent): void {
    if (!this.isEnable) {
      return;
    }

    let message: { method: string; params: unknown };
    switch (event.type) {
      case 'added':
        message = {
          method: Event.domStorageItemAdded,
          params: {
            storageId,
            key: event.key!,
            newValue: event.newValue!,
          },
        };
        break;
      case 'updated':
        message = {
          method: Event.domStorageItemUpdated,
          params: {
            storageId,
            key: event.key!,
            oldValue: event.oldValue!,
            newValue: event.newValue!,
          },
        };
        break;
      case 'removed':
        message = {
          method: Event.domStorageItemRemoved,
          params: {
            storageId,
            key: event.key!,
          },
        };
        break;
      case 'cleared':
        message = {
          method: Event.domStorageItemsCleared,
          params: {
            storageId,
          },
        };
        break;
      default:
        return;
    }

    this.send(message);
  }

  // Remove storage event listeners / storage 이벤트 리스너 제거
  private removeStorageListeners(): void {
    this.unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
    this.unsubscribeFunctions = [];
  }
}
