// DOMStorage domain implementation / DOMStorage 도메인 구현
import BaseDomain from './base';
import { Event } from './protocol';

interface StorageId {
  isLocalStorage: boolean;
  storageKey?: string;
  securityOrigin?: string;
}

export default class DOMStorage extends BaseDomain {
  override namespace = 'DOMStorage';

  private isEnable = false;
  private storageListeners: Array<() => void> = [];

  // Enable DOMStorage domain / DOMStorage 도메인 활성화
  override enable(): void {
    if (this.isEnable) {
      return;
    }
    this.isEnable = true;
    this.setupStorageListeners();
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
    if (this.isEnable) {
      this.send({
        method: Event.domStorageItemsCleared,
        params: {
          storageId,
        },
      });
    }
  }

  // Setup storage event listeners / storage 이벤트 리스너 설정
  private setupStorageListeners(): void {
    // Listen to storage events from other tabs / 다른 탭의 storage 이벤트 수신
    const storageHandler = (e: StorageEvent) => {
      if (!this.isEnable) {
        return;
      }

      const storageId: StorageId = {
        isLocalStorage: e.storageArea === localStorage,
        securityOrigin: e.url ? new URL(e.url).origin : undefined,
      };

      if (e.key === null) {
        // Storage cleared / storage 전체 삭제됨
        this.send({
          method: Event.domStorageItemsCleared,
          params: {
            storageId,
          },
        });
      } else if (e.oldValue === null && e.newValue !== null) {
        // Item added / 항목 추가됨
        this.send({
          method: Event.domStorageItemAdded,
          params: {
            storageId,
            key: e.key,
            newValue: e.newValue,
          },
        });
      } else if (e.oldValue !== null && e.newValue === null) {
        // Item removed / 항목 제거됨
        this.send({
          method: Event.domStorageItemRemoved,
          params: {
            storageId,
            key: e.key,
          },
        });
      } else if (e.oldValue !== null && e.newValue !== null && e.oldValue !== e.newValue) {
        // Item updated / 항목 업데이트됨
        this.send({
          method: Event.domStorageItemUpdated,
          params: {
            storageId,
            key: e.key,
            oldValue: e.oldValue,
            newValue: e.newValue,
          },
        });
      }
    };

    window.addEventListener('storage', storageHandler);
    this.storageListeners.push(() => {
      window.removeEventListener('storage', storageHandler);
    });
  }

  // Remove storage event listeners / storage 이벤트 리스너 제거
  private removeStorageListeners(): void {
    this.storageListeners.forEach((remove) => remove());
    this.storageListeners = [];
  }
}
