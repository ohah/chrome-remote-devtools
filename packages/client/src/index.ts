// CDP Client - WebSocket connection and CDP initialization / CDP 클라이언트 - WebSocket 연결 및 CDP 초기화
import { getAbsolutePath } from './cdp/common/utils';
import ChromeDomain from './cdp';

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

function initSocket(serverUrl: string): void {
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

  let heartbeat: ReturnType<typeof setInterval> | null = null;
  socket.addEventListener('open', () => {
    // Heartbeat keep alive / 하트비트 유지
    heartbeat = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send('{}');
      }
    }, 10000);
  });

  socket.addEventListener('close', () => {
    if (heartbeat) {
      clearInterval(heartbeat);
      heartbeat = null;
    }
  });

  socket.addEventListener('error', () => {
    if (heartbeat) {
      clearInterval(heartbeat);
      heartbeat = null;
    }
  });
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
export function initCDPClient(serverUrl: string): void {
  initSocket(serverUrl);
  keepScreenDisplay();
}

// Auto-initialize if server URL is provided via data attribute / data 속성으로 서버 URL이 제공되면 자동 초기화
if (typeof document !== 'undefined') {
  const script = document.currentScript as HTMLScriptElement | null;
  const serverUrl = script?.dataset.serverUrl || script?.getAttribute('data-server-url');
  if (serverUrl) {
    initCDPClient(serverUrl);
  }
}
