// WebSocket client for Chrome Remote DevTools (JavaScript layer) / Chrome Remote DevTools용 WebSocket 클라이언트 (JavaScript 레이어)

import { handleCDPMessage } from './cdp-message-handler';

let ws: WebSocket | null = null;
let sendFn: ((message: string) => void) | null = null;
let retryTimeoutId: ReturnType<typeof setTimeout> | null = null;
let disconnectRequested = false;

/**
 * Build WebSocket URL for inspector device / inspector device용 WebSocket URL 생성
 * Matches server path: /remote/debug/inspector/device?name=...&app=...&device=...
 */
function buildInspectorDeviceUrl(serverHost: string, serverPort: number): string {
  const deviceName = encodeURIComponent('React Native');
  const appName = encodeURIComponent('react-native');
  const deviceId = encodeURIComponent(
    'js-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2)
  );
  const host = serverPort === 80 || serverPort === 443 ? serverHost : `${serverHost}:${serverPort}`;
  return `ws://${host}/remote/debug/inspector/device?name=${deviceName}&app=${appName}&device=${deviceId}`;
}

/**
 * Connect to Chrome Remote DevTools server via WebSocket / WebSocket으로 Chrome Remote DevTools 서버에 연결
 * @param serverHost Server host / 서버 호스트
 * @param serverPort Server port / 서버 포트
 * @returns Promise that resolves when connected / 연결되면 resolve되는 Promise
 */
export function connectWebSocket(serverHost: string, serverPort: number): Promise<void> {
  disconnectRequested = false;
  return new Promise((resolve, reject) => {
    const maxRetries = 3;
    const retryDelay = 1000;
    let attempt = 0;
    let resolved = false;

    const tryConnect = () => {
      if (disconnectRequested) return;
      attempt++;
      const url = buildInspectorDeviceUrl(serverHost, serverPort);

      try {
        const socket = new WebSocket(url);
        ws = socket;
        sendFn = null;

        socket.onopen = () => {
          sendFn = (message: string) => {
            if (socket.readyState === WebSocket.OPEN) socket.send(message);
          };
          if (!resolved) {
            resolved = true;
            resolve();
          }
        };

        socket.onmessage = (event) => {
          try {
            const data = typeof event.data === 'string' ? event.data : String(event.data);
            const message = JSON.parse(data);
            handleCDPMessage(message);
          } catch (err) {
            console.error('[ChromeRemoteDevTools] WebSocket message parse error:', err);
          }
        };

        socket.onerror = () => {
          if (!resolved && attempt >= maxRetries) {
            resolved = true;
            reject(
              new Error('WebSocket connection failed after retries / 재시도 후 WebSocket 연결 실패')
            );
          }
        };

        socket.onclose = (_event) => {
          if (!resolved) {
            if (attempt >= maxRetries) {
              resolved = true;
              reject(new Error('WebSocket connection failed / WebSocket 연결 실패'));
            } else {
              ws = null;
              sendFn = null;
              retryTimeoutId = setTimeout(tryConnect, retryDelay);
              return;
            }
          }
          ws = null;
          sendFn = null;
        };
      } catch (err) {
        if (!resolved && attempt >= maxRetries) {
          resolved = true;
          reject(err);
        } else {
          retryTimeoutId = setTimeout(tryConnect, retryDelay);
        }
      }
    };

    tryConnect();
  });
}

/**
 * Get CDP sender function when WebSocket is connected / WebSocket 연결 시 CDP 전송 함수 반환
 * Returned sender checks sendFn and ws at call time and no-ops when connection is down / 반환된 sender는 호출 시점에 sendFn과 ws를 검사하고 연결이 끊어졌으면 no-op
 * @returns (host, port, message) => void or null if not connected / 연결 시 전송 함수, 미연결 시 null
 */
export function getCDPSender(): ((host: string, port: number, message: string) => void) | null {
  if (sendFn == null) return null;
  return (_host: string, _port: number, message: string) => {
    const currentSend = sendFn;
    if (currentSend == null) return;
    if (ws == null || ws.readyState !== WebSocket.OPEN) return;
    currentSend(message);
  };
}

/**
 * Check if WebSocket is connected / WebSocket 연결 여부
 */
export function isWebSocketConnected(): boolean {
  return ws != null && ws.readyState === WebSocket.OPEN;
}

/**
 * Disconnect WebSocket / WebSocket 연결 해제
 * Cancels any pending retry so reconnect does not run after disconnect / 대기 중인 재시도를 취소하여 disconnect 후 재연결이 일어나지 않도록 함
 */
export function disconnectWebSocket(): void {
  disconnectRequested = true;
  if (retryTimeoutId != null) {
    clearTimeout(retryTimeoutId);
    retryTimeoutId = null;
  }
  if (ws != null) {
    ws.close();
    ws = null;
    sendFn = null;
  }
}
