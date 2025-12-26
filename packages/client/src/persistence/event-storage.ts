// IndexedDB event storage utility / IndexedDB 이벤트 저장 유틸리티
import { compress } from './compression';

const DB_NAME = 'CDPEventStorage';
const DB_VERSION = 1;
const STORE_NAME = 'events';
const ACTIVITY_STORE_NAME = 'clientActivity';
const ORPHANED_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours / 24시간

interface StoredEvent {
  id?: number;
  clientId: string; // Tab-specific client ID / 탭별 고유 클라이언트 ID
  method: string;
  params: unknown;
  timestamp: number;
  compressed?: boolean;
  size?: number;
}

interface StorageConfig {
  clientId: string; // Tab-specific client ID / 탭별 고유 클라이언트 ID
  enableCompression?: boolean;
  maxStoredEvents?: number;
  maxStorageSize?: number;
}

/**
 * Event storage class using IndexedDB / IndexedDB를 사용한 이벤트 저장소 클래스
 */
export class EventStorage {
  private db: IDBDatabase | null = null;
  private config: StorageConfig;
  private clientId: string;
  private maxSize: number = 50 * 1024 * 1024; // 50MB default / 기본 50MB
  private maxEvents: number = 10000; // Default max events / 기본 최대 이벤트 수

  constructor(config: StorageConfig) {
    if (!config.clientId) {
      throw new Error('clientId is required / clientId는 필수입니다');
    }
    this.config = config;
    this.clientId = config.clientId;
    this.maxEvents = config.maxStoredEvents || 10000;
    if (config.maxStorageSize) {
      this.maxSize = config.maxStorageSize;
    } else {
      // Calculate max size from available quota / 사용 가능한 용량에서 최대 크기 계산
      void this.calculateMaxSize();
    }
  }

  /**
   * Initialize IndexedDB database / IndexedDB 데이터베이스 초기화
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB / IndexedDB 열기 실패:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = (event.target as IDBOpenDBRequest).transaction;
        if (!transaction) {
          return;
        }

        let store: IDBObjectStore;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          // Create new object store / 새로운 오브젝트 스토어 생성
          store = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true,
          });
          // Create index for timestamp for efficient querying / 타임스탬프 인덱스 생성 (효율적인 조회)
          store.createIndex('timestamp', 'timestamp', { unique: false });
        } else {
          store = transaction.objectStore(STORE_NAME);
        }

        // Add clientId indexes if they don't exist / clientId 인덱스가 없으면 추가
        if (!store.indexNames.contains('clientId')) {
          store.createIndex('clientId', 'clientId', { unique: false });
        }
        if (!store.indexNames.contains('clientId_timestamp')) {
          store.createIndex('clientId_timestamp', ['clientId', 'timestamp'], { unique: false });
        }

        // Create clientActivity store for tracking active tabs / 활성 탭 추적을 위한 clientActivity 스토어 생성
        if (!db.objectStoreNames.contains(ACTIVITY_STORE_NAME)) {
          const activityStore = db.createObjectStore(ACTIVITY_STORE_NAME, {
            keyPath: 'clientId',
          });
          activityStore.createIndex('lastActiveTime', 'lastActiveTime', { unique: false });
        }
      };
    });
  }

  /**
   * Calculate max storage size from available quota / 사용 가능한 용량에서 최대 저장 크기 계산
   */
  private async calculateMaxSize(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.estimate) {
      return;
    }

    try {
      const estimate = await navigator.storage.estimate();
      const available = (estimate.quota || 0) - (estimate.usage || 0);
      // Use 50% of available or 50MB, whichever is smaller / 사용 가능한 용량의 50% 또는 50MB 중 작은 값
      this.maxSize = Math.min(available * 0.5, 50 * 1024 * 1024);
    } catch (error) {
      console.warn('Failed to estimate storage quota / 저장 용량 확인 실패:', error);
    }
  }

  /**
   * Check if event should be stored / 이벤트를 저장해야 하는지 확인
   */
  private shouldStore(method: string): boolean {
    // Store console, network, and session replay events / console, network, session replay 이벤트 저장
    // Exclude DOM events / DOM 이벤트 제외
    return (
      method.startsWith('Runtime.consoleAPICalled') ||
      method.startsWith('Network.') ||
      method.startsWith('SessionReplay.eventRecorded')
    );
  }

  /**
   * Get current storage size for this client / 현재 클라이언트의 저장 크기 가져오기
   */
  private async getCurrentSize(): Promise<number> {
    if (!this.db) {
      return 0;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('clientId');
      const request = index.getAll(this.clientId);

      request.onsuccess = () => {
        const events = request.result as StoredEvent[];
        const totalSize = events.reduce((sum, event) => sum + (event.size || 0), 0);
        resolve(totalSize);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Get current event count for this client / 현재 클라이언트의 이벤트 수 가져오기
   */
  private async getEventCount(): Promise<number> {
    if (!this.db) {
      return 0;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('clientId');
      const request = index.count(this.clientId);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Delete old events for this client to make room / 공간 확보를 위해 현재 클라이언트의 오래된 이벤트 삭제
   */
  private async deleteOldEvents(targetSize: number): Promise<void> {
    if (!this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      // Use compound index to filter by clientId and sort by timestamp / clientId로 필터링하고 timestamp로 정렬하기 위해 복합 인덱스 사용
      const index = store.index('clientId_timestamp');
      const range = IDBKeyRange.bound([this.clientId, 0], [this.clientId, Infinity]);
      const request = index.openCursor(range, 'next');

      let deletedSize = 0;
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor && deletedSize < targetSize) {
          const storedEvent = cursor.value as StoredEvent;
          deletedSize += storedEvent.size || 0;
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Delete old events by count for this client / 현재 클라이언트의 오래된 이벤트를 개수 기준으로 삭제
   */
  private async deleteOldEventsByCount(targetCount: number): Promise<void> {
    if (!this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      // Use compound index to filter by clientId and sort by timestamp / clientId로 필터링하고 timestamp로 정렬하기 위해 복합 인덱스 사용
      const index = store.index('clientId_timestamp');
      const range = IDBKeyRange.bound([this.clientId, 0], [this.clientId, Infinity]);
      const request = index.openCursor(range, 'next');

      let deletedCount = 0;
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor && deletedCount < targetCount) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Ensure storage space is available / 저장 공간 확보
   */
  private async ensureStorageSpace(requiredSize: number): Promise<void> {
    const currentSize = await this.getCurrentSize();
    const currentCount = await this.getEventCount();

    // Check if we need to delete old events / 오래된 이벤트 삭제 필요 여부 확인
    if (currentSize + requiredSize > this.maxSize || currentCount >= this.maxEvents) {
      // Delete old events until we have enough space / 충분한 공간이 생길 때까지 오래된 이벤트 삭제
      const targetSize = Math.max(0, currentSize + requiredSize - this.maxSize);
      const targetCount = currentCount >= this.maxEvents ? currentCount - this.maxEvents + 1 : 0;

      // Delete by size or count, whichever is more restrictive / 크기 또는 개수 중 더 제한적인 기준으로 삭제
      if (targetCount > 0) {
        await this.deleteOldEventsByCount(targetCount);
      } else if (targetSize > 0) {
        await this.deleteOldEvents(targetSize);
      }
    }
  }

  /**
   * Save event to IndexedDB / IndexedDB에 이벤트 저장
   * @param method - CDP method name / CDP 메소드 이름
   * @param params - Event parameters / 이벤트 파라미터
   * @param retryCount - Internal retry counter to prevent infinite recursion / 무한 재귀 방지를 위한 내부 재시도 카운터
   */
  async saveEvent(method: string, params: unknown, retryCount = 0): Promise<void> {
    if (!this.shouldStore(method)) {
      return;
    }

    if (!this.db) {
      await this.init();
    }

    if (!this.db) {
      console.warn('IndexedDB not available / IndexedDB 사용 불가');
      return;
    }

    try {
      const timestamp = Date.now();
      let storedParams: unknown;
      let compressed = false;
      let size: number;

      // Serialize event data / 이벤트 데이터 직렬화
      const eventData = JSON.stringify({ method, params, timestamp });
      size = new Blob([eventData]).size;

      // Compress if enabled / 압축 활성화 시 압축
      if (this.config.enableCompression) {
        const compressedData = await compress(eventData);
        if (compressedData) {
          // Store compressed data as array of bytes / 압축된 데이터를 바이트 배열로 저장
          storedParams = {
            compressed: true,
            data: Array.from(new Uint8Array(compressedData)),
          };
          compressed = true;
          size = compressedData.byteLength;
        } else {
          // Compression failed, store uncompressed / 압축 실패 시 압축하지 않고 저장
          storedParams = params;
        }
      } else {
        storedParams = params;
      }

      // Ensure storage space / 저장 공간 확보
      await this.ensureStorageSpace(size);

      // Store event / 이벤트 저장
      return new Promise((resolve) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const storedEvent: StoredEvent = {
          clientId: this.clientId,
          method,
          params: storedParams,
          timestamp,
          compressed,
          size,
        };

        const request = store.add(storedEvent);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          // Handle QuotaExceededError / QuotaExceededError 처리
          if (request.error?.name === 'QuotaExceededError' && retryCount < 1) {
            // Try deleting old events and retry once / 오래된 이벤트 삭제 후 한 번만 재시도
            void this.deleteOldEvents(size).then(() => {
              void this.saveEvent(method, params, retryCount + 1)
                .then(resolve)
                .catch(() => {
                  // Ignore retry errors / 재시도 에러 무시
                  resolve();
                });
            });
          } else {
            console.error('Failed to save event / 이벤트 저장 실패:', request.error);
            // Don't reject - allow event transmission to continue / reject하지 않음 - 이벤트 전송 계속
            resolve();
          }
        };
      });
    } catch (error) {
      console.error('Error saving event / 이벤트 저장 오류:', error);
      // Don't throw - allow event transmission to continue / 에러를 던지지 않음 - 이벤트 전송은 계속
    }
  }

  /**
   * Get all stored events for this client / 현재 클라이언트의 저장된 모든 이벤트 가져오기
   */
  async getEvents(): Promise<Array<{ method: string; params: unknown; timestamp: number }>> {
    if (!this.db) {
      await this.init();
    }

    if (!this.db) {
      return [];
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      // Filter by clientId and sort by timestamp / clientId로 필터링하고 timestamp로 정렬
      const index = store.index('clientId_timestamp');
      const range = IDBKeyRange.bound([this.clientId, 0], [this.clientId, Infinity]);
      const request = index.getAll(range);

      request.onsuccess = async () => {
        const events = request.result as StoredEvent[];
        const decompressedEvents = await Promise.all(
          events.map(async (event) => {
            if (event.compressed) {
              // Decompress if needed / 필요 시 압축 해제
              const { decompress } = await import('./compression');
              const compressedData = new Uint8Array((event.params as { data: number[] }).data)
                .buffer;
              const decompressed = await decompress(compressedData);
              if (decompressed) {
                const parsed = JSON.parse(decompressed);
                return {
                  method: event.method,
                  params: parsed.params,
                  timestamp: event.timestamp,
                };
              }
            }
            return {
              method: event.method,
              params: event.params,
              timestamp: event.timestamp,
            };
          })
        );
        resolve(decompressedEvents);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Get events after a specific timestamp for this client / 현재 클라이언트의 특정 타임스탬프 이후의 이벤트 가져오기
   */
  async getEventsAfter(
    timestamp: number
  ): Promise<Array<{ method: string; params: unknown; timestamp: number }>> {
    if (!this.db) {
      await this.init();
    }

    if (!this.db) {
      return [];
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      // Filter by clientId and timestamp / clientId와 timestamp로 필터링
      const index = store.index('clientId_timestamp');
      const range = IDBKeyRange.bound(
        [this.clientId, timestamp],
        [this.clientId, Infinity],
        true,
        false
      ); // Exclusive lower bound / 하한 배제
      const request = index.getAll(range);

      request.onsuccess = async () => {
        const events = request.result as StoredEvent[];
        const decompressedEvents = await Promise.all(
          events.map(async (event) => {
            if (event.compressed) {
              const { decompress } = await import('./compression');
              const compressedData = new Uint8Array((event.params as { data: number[] }).data)
                .buffer;
              const decompressed = await decompress(compressedData);
              if (decompressed) {
                const parsed = JSON.parse(decompressed);
                return {
                  method: event.method,
                  params: parsed.params,
                  timestamp: event.timestamp,
                };
              }
            }
            return {
              method: event.method,
              params: event.params,
              timestamp: event.timestamp,
            };
          })
        );
        resolve(decompressedEvents);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Clear all events for this client / 현재 클라이언트의 모든 이벤트 삭제
   * @param excludeMethods - Methods to exclude from clearing (e.g., 'SessionReplay.eventRecorded') / 삭제에서 제외할 메서드 (예: 'SessionReplay.eventRecorded')
   */
  async clearEvents(excludeMethods?: string[]): Promise<void> {
    if (!this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('clientId');
      const request = index.openCursor(IDBKeyRange.only(this.clientId));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const storedEvent = cursor.value as StoredEvent;
          // Skip events that should be excluded / 제외해야 할 이벤트 건너뛰기
          if (
            excludeMethods &&
            excludeMethods.some((method) => storedEvent.method.startsWith(method))
          ) {
            cursor.continue();
          } else {
            cursor.delete();
            cursor.continue();
          }
        } else {
          resolve();
        }
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Clear events before a specific timestamp for this client / 현재 클라이언트의 특정 타임스탬프 이전의 이벤트 삭제
   */
  async clearEventsBefore(timestamp: number): Promise<void> {
    if (!this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      // Filter by clientId and timestamp / clientId와 timestamp로 필터링
      const index = store.index('clientId_timestamp');
      const range = IDBKeyRange.bound([this.clientId, 0], [this.clientId, timestamp], false, true); // Exclusive upper bound / 상한 배제
      const request = index.openCursor(range);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Update last active time for this client / 현재 클라이언트의 마지막 활성 시간 업데이트
   */
  async updateLastActiveTime(): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    if (!this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([ACTIVITY_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(ACTIVITY_STORE_NAME);
      const activity = {
        clientId: this.clientId,
        lastActiveTime: Date.now(),
      };
      const request = store.put(activity);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Get all active client IDs (clients that were active within the threshold) / 활성 클라이언트 ID 목록 가져오기 (임계값 내에 활성화된 클라이언트)
   */
  private async getActiveClientIds(): Promise<Set<string>> {
    if (!this.db) {
      await this.init();
    }

    if (!this.db) {
      return new Set();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([ACTIVITY_STORE_NAME], 'readonly');
      const store = transaction.objectStore(ACTIVITY_STORE_NAME);
      const index = store.index('lastActiveTime');
      const threshold = Date.now() - ORPHANED_THRESHOLD_MS;
      const range = IDBKeyRange.lowerBound(threshold);
      const request = index.getAll(range);

      request.onsuccess = () => {
        const activities = request.result as Array<{ clientId: string; lastActiveTime: number }>;
        const activeClientIds = new Set(activities.map((a) => a.clientId));
        resolve(activeClientIds);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Cleanup orphaned events (events older than 24 hours from inactive clients) / orphaned 이벤트 정리 (24시간 이상 지난 비활성 클라이언트의 이벤트)
   */
  async cleanupOrphanedEvents(): Promise<number> {
    if (!this.db) {
      await this.init();
    }

    if (!this.db) {
      return 0;
    }

    try {
      const activeClientIds = await this.getActiveClientIds();
      const threshold = Date.now() - ORPHANED_THRESHOLD_MS;

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('timestamp');
        const range = IDBKeyRange.upperBound(threshold);
        const request = index.openCursor(range);

        let deletedCount = 0;
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            const storedEvent = cursor.value as StoredEvent;
            // Only delete if client is not active / 활성 클라이언트가 아닌 경우에만 삭제
            if (!activeClientIds.has(storedEvent.clientId)) {
              cursor.delete();
              deletedCount++;
            }
            cursor.continue();
          } else {
            // Also cleanup old activity records / 오래된 활동 기록도 정리
            void this.cleanupOldActivityRecords().then(() => {
              resolve(deletedCount);
            });
          }
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Failed to cleanup orphaned events / orphaned 이벤트 정리 실패:', error);
      return 0;
    }
  }

  /**
   * Cleanup old activity records / 오래된 활동 기록 정리
   */
  private async cleanupOldActivityRecords(): Promise<void> {
    if (!this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([ACTIVITY_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(ACTIVITY_STORE_NAME);
      const index = store.index('lastActiveTime');
      const threshold = Date.now() - ORPHANED_THRESHOLD_MS;
      const range = IDBKeyRange.upperBound(threshold);
      const request = index.openCursor(range);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Export all events to JSON file / 모든 이벤트를 JSON 파일로 내보내기
   */
  async exportToFile(): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    if (!this.db) {
      throw new Error('IndexedDB not available / IndexedDB 사용 불가');
    }

    try {
      const events = await this.getEvents();

      const exportData = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        clientId: this.clientId,
        events,
      };

      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `cdp-events-${this.clientId}-${Date.now()}.json`;
      a.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export events / 이벤트 내보내기 실패:', error);
      throw error;
    }
  }
}
