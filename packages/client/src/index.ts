// CDP Client - WebSocket connection and CDP initialization / CDP 클라이언트 - WebSocket 연결 및 CDP 초기화
import { getAbsolutePath } from './cdp/common/utils';
import ChromeDomain from './cdp';

interface RrwebConfig {
  enable: boolean;
  flushIntervalMs?: number;
  maxBatchSize?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recordOptions?: Record<string, any>;
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
    // Simple UUID-like ID generation / 간단한 UUID 스타일 ID 생성
    id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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

async function initRrwebRecording(socket: WebSocket, config: RrwebConfig): Promise<void> {
  if (!config.enable) return;

  try {
    const { createDefaultWsTransport, initRrwebRecorder } =
      await import('@ohah/chrome-remote-devtools-client-rrweb');

    const baseRecordOptions = config.recordOptions ?? {};
    const transport = createDefaultWsTransport({ socket, kind: 'rrweb' });
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
  const domain = new ChromeDomain({ socket });

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
      if (ret.id !== undefined) {
        socket.send(JSON.stringify(ret));
      }
    } catch (e) {
      console.error('CDP message error:', e);
    }
  });

  void initRrwebRecording(socket, rrwebConfig);
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
