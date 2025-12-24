// CDP Client - WebSocket connection and CDP initialization / CDP 클라이언트 - WebSocket 연결 및 CDP 초기화
import { getAbsolutePath } from './cdp/common/utils';
import ChromeDomain from './cdp';
import { EventStorage } from './persistence/event-storage';

interface RrwebConfig {
  enable: boolean;
  flushIntervalMs?: number;
  maxBatchSize?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recordOptions?: Record<string, any>;
  // Event storage options / 이벤트 저장 옵션
  enableEventStorage?: boolean;
  enableCompression?: boolean;
  maxStoredEvents?: number;
  maxStorageSize?: number;
  storageSizeCheckInterval?: number;
  clearOnSend?: boolean;
}

function getDocumentFavicon(): string {
  const links = document.head.querySelectorAll('link');
  const icon = Array.from(links).find((link) => {
    const rel = link.getAttribute('rel');
    return rel?.includes('icon') || rel?.includes('shortcut');
  });

  let iconUrl = '';
  if (icon) {
    iconUrl = getAbsolutePath(icon.getAttribute('href') || '');
  }

  return iconUrl;
}

// Generate unique debug ID / 고유 디버그 ID 생성
function getId(): string {
  let id = sessionStorage.getItem('debug_id');
  if (!id) {
    // Use crypto.randomUUID() if available (UUID v4) / 사용 가능한 경우 crypto.randomUUID() 사용 (UUID v4)
    // Fallback to enhanced timestamp + random for older browsers / 구형 브라우저를 위한 타임스탬프 + 랜덤 폴백
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      id = crypto.randomUUID();
    } else {
      // Enhanced fallback: timestamp + multiple random values / 향상된 폴백: 타임스탬프 + 여러 랜덤 값
      // Add performance.now() for sub-millisecond precision / 밀리초 이하 정밀도를 위해 performance.now() 추가
      const timestamp = `${Date.now()}-${performance.now()}`;
      const random1 = Math.random().toString(36).substring(2, 11);
      const random2 = Math.random().toString(36).substring(2, 11);
      const random3 = Math.random().toString(36).substring(2, 11);
      id = `${timestamp}-${random1}-${random2}-${random3}`;
    }
    sessionStorage.setItem('debug_id', id);
  }
  return id;
}

function getQuery(): string {
  const search = new URLSearchParams();
  search.append('url', location.href);
  search.append('title', document.title);
  search.append('favicon', getDocumentFavicon());
  search.append('time', Date.now().toString());
  search.append('ua', navigator.userAgent);
  return search.toString();
}

function getRrwebConfig(script: HTMLScriptElement | null): RrwebConfig {
  if (!script) {
    return { enable: false };
  }

  const enableAttr = script.dataset.enableRrweb || script.getAttribute('data-enable-rrweb');
  const flushMsAttr = script.dataset.rrwebFlushMs || script.getAttribute('data-rrweb-flush-ms');
  const maxBatchAttr = script.dataset.rrwebMaxBatch || script.getAttribute('data-rrweb-max-batch');

  return {
    // Default ON; set data-enable-rrweb="false" to disable / 기본 ON; 끄려면 data-enable-rrweb="false"
    enable: enableAttr === 'true',
    flushIntervalMs: flushMsAttr ? Number(flushMsAttr) : undefined,
    maxBatchSize: maxBatchAttr ? Number(maxBatchAttr) : undefined,
  };
}

// Global recorder handle for pause/resume control / 일시 중지/재개 제어를 위한 전역 레코더 핸들
let globalRrwebRecorder: { pause: () => void; resume: () => Promise<void> } | null = null;

// Expose global API for controlling rrweb recording / rrweb 기록 제어를 위한 전역 API 노출
if (typeof window !== 'undefined') {
  (window as any).__rrwebRecorder = {
    pause: () => {
      globalRrwebRecorder?.pause();
    },
    resume: async () => {
      await globalRrwebRecorder?.resume();
    },
  };
}

async function initRrwebRecording(
  socket: WebSocket,
  config: RrwebConfig,
  domain: ChromeDomain
): Promise<void> {
  if (!config.enable) return;

  try {
    const { createDefaultCDPTransport, initRrwebRecorder } =
      await import('@ohah/chrome-remote-devtools-client-rrweb');

    // Enable SessionReplay domain via CDP method / CDP 메서드로 SessionReplay 도메인 활성화
    domain.execute({ method: 'SessionReplay.enable' });

    const baseRecordOptions = config.recordOptions ?? {};
    const transport = createDefaultCDPTransport({
      executeCDP: (method: string, params?: unknown) => {
        const result = domain.execute({ method, params });
        // executeCDP is synchronous, but we handle async internally / executeCDP는 동기이지만 내부적으로 async 처리
        if (result instanceof Promise) {
          // For async methods, return immediately with error / async 메서드의 경우 즉시 에러 반환
          // This shouldn't happen for sendEvent which is synchronous / sendEvent는 동기이므로 발생하지 않아야 함
          return { error: { message: 'Async method not supported in executeCDP' } };
        }
        return { result: result.result, error: result.error };
      },
    });
    const recorder = initRrwebRecorder({
      transport,
      flushIntervalMs: config.flushIntervalMs,
      maxBatchSize: config.maxBatchSize,
      recordOptions: {
        // Force full snapshot generation / 풀 스냅샷 강제 생성
        recordAfter: 'load',
        checkoutEveryNth: 1,
        ...baseRecordOptions,
      },
      kind: 'rrweb',
      onError: (error) => {
        console.warn('rrweb recorder error / rrweb 레코더 오류:', error);
      },
    });

    // Store recorder handle globally / 레코더 핸들을 전역으로 저장
    globalRrwebRecorder = recorder;

    await recorder.start();
    socket.addEventListener('close', () => {
      recorder.stop();
      globalRrwebRecorder = null;
    });
  } catch (error) {
    console.error('Failed to start rrweb recorder / rrweb 레코더 시작 실패:', error);
  }
}

function initSocket(serverUrl: string, rrwebConfig: RrwebConfig): void {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = serverUrl.replace(/^(http|https|ws|wss):\/\//i, '');
  const socket = new WebSocket(`${protocol}//${host}/remote/debug/client/${getId()}?${getQuery()}`);

  // Initialize event storage / 이벤트 저장소 초기화
  // Default: enabled / 기본값: 활성화
  const clientId = getId(); // Get tab-specific client ID / 탭별 고유 클라이언트 ID 가져오기
  const enableEventStorage = rrwebConfig.enableEventStorage !== false; // Default: true / 기본값: true
  const enableCompression = rrwebConfig.enableCompression !== false; // Default: true / 기본값: true

  let eventStorage: EventStorage | undefined = undefined;
  if (enableEventStorage) {
    eventStorage = new EventStorage({
      clientId,
      enableCompression,
      maxStoredEvents: rrwebConfig.maxStoredEvents,
      maxStorageSize: rrwebConfig.maxStorageSize,
    });
    void eventStorage.init().then(async () => {
      // Detect page reload / 페이지 새로고침 감지
      const navigationTiming = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming;
      const isReload = navigationTiming?.type === 'reload';

      if (isReload) {
        // Clear current tab's events on reload / 새로고침 시 현재 탭의 이벤트 삭제
        await eventStorage?.clearEvents();
        console.log('Cleared events on page reload / 페이지 새로고침 시 이벤트 삭제');
      }

      // Update last active time / 마지막 활성 시간 업데이트
      await eventStorage?.updateLastActiveTime();

      // Cleanup orphaned events / orphaned 이벤트 정리
      const deletedCount = await eventStorage?.cleanupOrphanedEvents();
      if (deletedCount && deletedCount > 0) {
        console.log(
          `Cleaned up ${deletedCount} orphaned events / ${deletedCount}개의 orphaned 이벤트 정리`
        );
      }
    });
  }

  const domain = new ChromeDomain({ socket, eventStorage });

  // Send stored events when connection opens / 연결 열릴 때 저장된 이벤트 전송
  socket.addEventListener('open', async () => {
    if (eventStorage && enableEventStorage) {
      try {
        const storedEvents = await eventStorage.getEvents();
        if (storedEvents.length > 0) {
          console.log(
            `Sending ${storedEvents.length} stored events / 저장된 ${storedEvents.length}개 이벤트 전송`
          );

          // Send all events in batches / 모든 이벤트를 배치로 전송
          const batchSize = 100;
          for (let i = 0; i < storedEvents.length; i += batchSize) {
            const batch = storedEvents.slice(i, i + batchSize);
            for (const event of batch) {
              if (socket.readyState === WebSocket.OPEN) {
                socket.send(
                  JSON.stringify({
                    method: event.method,
                    params: event.params,
                  })
                );
              }
            }
            // Small delay between batches / 배치 간 작은 지연
            await new Promise((resolve) => setTimeout(resolve, 10));
          }

          // Clear events after sending if configured / 설정된 경우 전송 후 이벤트 삭제
          if (rrwebConfig.clearOnSend !== false) {
            await eventStorage.clearEvents();
            console.log('Cleared stored events after sending / 전송 후 저장된 이벤트 삭제');
          }
        }
      } catch (error) {
        console.error('Failed to send stored events / 저장된 이벤트 전송 실패:', error);
      }
    }
  });

  socket.addEventListener('message', async ({ data }) => {
    try {
      // Handle Blob or string data / Blob 또는 string 데이터 처리
      let messageText: string;
      if (data instanceof Blob) {
        messageText = await data.text();
      } else if (typeof data === 'string') {
        messageText = data;
      } else if (data instanceof ArrayBuffer) {
        messageText = new TextDecoder().decode(data);
      } else {
        // Fallback: convert to string / 폴백: string으로 변환
        messageText = String(data);
      }

      const message = JSON.parse(messageText);
      const ret = domain.execute(message);

      // Handle async methods / async 메서드 처리
      if (ret instanceof Promise) {
        const result = await ret;
        if (result.id !== undefined) {
          socket.send(JSON.stringify(result));
        }
      } else if (ret.id !== undefined) {
        socket.send(JSON.stringify(ret));
      }
    } catch (e) {
      console.error('CDP message error:', e);
    }
  });

  // Periodically update last active time and cleanup orphaned events / 주기적으로 마지막 활성 시간 업데이트 및 orphaned 이벤트 정리
  if (enableEventStorage && eventStorage) {
    // Update last active time every 5 minutes / 5분마다 마지막 활성 시간 업데이트
    const updateInterval = setInterval(
      async () => {
        await eventStorage?.updateLastActiveTime();
      },
      5 * 60 * 1000
    );

    // Cleanup orphaned events every hour / 1시간마다 orphaned 이벤트 정리
    const cleanupInterval = setInterval(
      async () => {
        const deletedCount = await eventStorage?.cleanupOrphanedEvents();
        if (deletedCount && deletedCount > 0) {
          console.log(
            `Cleaned up ${deletedCount} orphaned events / ${deletedCount}개의 orphaned 이벤트 정리`
          );
        }
      },
      60 * 60 * 1000
    );

    // Cleanup intervals on socket close / 소켓 종료 시 인터벌 정리
    socket.addEventListener('close', () => {
      clearInterval(updateInterval);
      clearInterval(cleanupInterval);
    });
  }

  void initRrwebRecording(socket, rrwebConfig, domain);
}

function keepScreenDisplay(): void {
  if (!('wakeLock' in navigator)) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (navigator as any).wakeLock?.request('screen').catch(() => {
    // Ignore
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigator as any).wakeLock?.request('screen').catch(() => {
        // Ignore
      });
    }
  });
}

// Initialize CDP client / CDP 클라이언트 초기화
export function initCDPClient(
  serverUrl: string,
  rrwebConfig: RrwebConfig = { enable: false }
): void {
  initSocket(serverUrl, rrwebConfig);
  keepScreenDisplay();
}

// Auto-initialize if server URL is provided via data attribute / data 속성으로 서버 URL이 제공되면 자동 초기화
if (typeof document !== 'undefined') {
  const script = document.currentScript as HTMLScriptElement | null;
  const serverUrl = script?.dataset.serverUrl || script?.getAttribute('data-server-url');
  if (serverUrl) {
    const rrwebConfig = getRrwebConfig(script);
    initCDPClient(serverUrl, rrwebConfig);
  }
}
