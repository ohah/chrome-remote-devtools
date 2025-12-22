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

    // StorageObserver will automatically send event when setItem is called / setItem 호출 시 StorageObserver가 자동으로 이벤트 전송
    storage.setItem(key, value);
  }

  // Remove DOM storage item / DOM storage 항목 제거
  removeDOMStorageItem({ storageId, key }: { storageId: StorageId; key: string }): void {
    const storage = storageId.isLocalStorage ? localStorage : sessionStorage;

    // StorageObserver will automatically send event when removeItem is called / removeItem 호출 시 StorageObserver가 자동으로 이벤트 전송
    storage.removeItem(key);
  }

  // Clear DOM storage / DOM storage 전체 삭제
  clear({ storageId }: { storageId: StorageId }): void {
    const storage = storageId.isLocalStorage ? localStorage : sessionStorage;

    // StorageObserver will automatically send event when clear is called / clear 호출 시 StorageObserver가 자동으로 이벤트 전송
    storage.clear();
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

    let message: { method: string; params: unknown } | null = null;
    switch (event.type) {
      case 'added':
        // Validate required fields for added event / added 이벤트에 필요한 필드 검증
        if (event.key === null || event.newValue === null) {
          return;
        }
        message = {
          method: Event.domStorageItemAdded,
          params: {
            storageId,
            key: event.key,
            newValue: event.newValue,
          },
        };
        break;
      case 'updated':
        // Validate required fields for updated event / updated 이벤트에 필요한 필드 검증
        if (event.key === null || event.oldValue === null || event.newValue === null) {
          return;
        }
        message = {
          method: Event.domStorageItemUpdated,
          params: {
            storageId,
            key: event.key,
            oldValue: event.oldValue,
            newValue: event.newValue,
          },
        };
        break;
      case 'removed':
        // Validate required fields for removed event / removed 이벤트에 필요한 필드 검증
        if (event.key === null) {
          return;
        }
        message = {
          method: Event.domStorageItemRemoved,
          params: {
            storageId,
            key: event.key,
          },
        };
        break;
      case 'cleared':
        // Cleared event doesn't require key / cleared 이벤트는 key가 필요 없음
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

    if (message) {
      this.send(message);
    }
  }

  // Remove storage event listeners / storage 이벤트 리스너 제거
  private removeStorageListeners(): void {
    this.unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
    this.unsubscribeFunctions = [];
  }
}
