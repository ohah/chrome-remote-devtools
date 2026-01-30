// Network domain (XHR/fetch hook, aligned with web client domain/network.ts) / Network 도메인 (XHR·fetch 훅, 웹 domain/network.ts와 동일 구조)

import { Event } from './protocol';
import { sendCDPEvent } from './base';

let isHooked = false;
let requestIdCounter = 0;

/** Original global XMLHttpRequest and fetch for restore / 복원용 원본 전역 XMLHttpRequest·fetch */
let originalXHR: typeof XMLHttpRequest | null = null;
let originalFetch: typeof fetch | null = null;

function nextRequestId(prefix: string): string {
  requestIdCounter += 1;
  return `${prefix}-${requestIdCounter}`;
}

function getTimestamp(): number {
  return Date.now() / 1000;
}

/**
 * Send Network.requestWillBeSent event (same shape as web client Network) / Network.requestWillBeSent 이벤트 전송 (웹 Network와 동일 형태)
 */
function sendRequestWillBeSent(
  requestId: string,
  url: string,
  method: string,
  headers: Record<string, string>,
  postData: string | undefined,
  type: string
): void {
  const request: Record<string, unknown> = {
    url,
    method,
    headers,
  };
  if (postData !== undefined && postData !== '') {
    request.postData = postData;
  }
  sendCDPEvent({
    method: Event.requestWillBeSent,
    params: {
      requestId,
      loaderId: requestId,
      documentURL: url,
      request,
      timestamp: getTimestamp(),
      type,
    },
  });
}

/**
 * Send Network.loadingFinished event (same shape as web client Network) / Network.loadingFinished 이벤트 전송 (웹 Network와 동일 형태)
 */
function sendLoadingFinished(requestId: string, encodedDataLength: number): void {
  sendCDPEvent({
    method: Event.loadingFinished,
    params: {
      requestId,
      timestamp: getTimestamp(),
      encodedDataLength,
    },
  });
}

/**
 * Hook XMLHttpRequest / XMLHttpRequest 훅
 * Uses a subclass so instanceof XMLHttpRequest is preserved / instanceof XMLHttpRequest 보존
 */
function hookXHR(): void {
  const globalObj =
    typeof globalThis !== 'undefined' ? globalThis : typeof global !== 'undefined' ? global : {};
  const XHR = (globalObj as any).XMLHttpRequest;
  if (!XHR || (XHR as any).__ChromeRemoteDevToolsHooked) return;
  originalXHR = XHR;
  const OriginalXHR = XHR as typeof XMLHttpRequest;
  class HookedXHR extends OriginalXHR {
    constructor() {
      super();
      let requestId: string | null = null;
      let method = 'GET';
      let url = '';
      const headers: Record<string, string> = {};
      const xhr = this;
      const originalOpen = xhr.open.bind(xhr);
      xhr.open = function (m: string, u: string, ...rest: unknown[]) {
        method = m;
        url = u;
        return originalOpen(m, u, ...(rest as [boolean?, string?, string?]));
      };
      const originalSetRequestHeader = xhr.setRequestHeader.bind(xhr);
      xhr.setRequestHeader = function (name: string, value: string) {
        headers[name] = value;
        return originalSetRequestHeader(name, value);
      };
      const originalSend = xhr.send.bind(xhr);
      xhr.send = function (body?: Document | ArrayBuffer | Blob | string | FormData | null) {
        requestId = nextRequestId('xhr');
        const post =
          body === undefined || body === null
            ? undefined
            : typeof body === 'string'
              ? body
              : body instanceof ArrayBuffer || ArrayBuffer.isView(body)
                ? '[binary]'
                : String(body);
        try {
          sendRequestWillBeSent(requestId, url, method, headers, post, 'XHR');
        } catch (_e) {
          // Ignore CDP send errors / CDP 전송 오류 무시
        }
        const onDone = () => {
          if (requestId) {
            try {
              const length =
                typeof xhr.responseText === 'string' ? new Blob([xhr.responseText]).size : 0;
              sendLoadingFinished(requestId, length);
            } catch (_e) {
              sendLoadingFinished(requestId, 0);
            }
            requestId = null;
          }
        };
        if (xhr.addEventListener) {
          xhr.addEventListener('load', onDone);
          xhr.addEventListener('error', onDone);
          xhr.addEventListener('abort', onDone);
        } else {
          const prevOnReadyStateChange = xhr.onreadystatechange;
          xhr.onreadystatechange = function (ev) {
            if (xhr.readyState === 4) onDone();
            if (prevOnReadyStateChange) prevOnReadyStateChange.call(this, ev);
          };
        }
        return originalSend(body);
      };
    }
  }
  (globalObj as any).XMLHttpRequest = HookedXHR;
  (globalObj as any).XMLHttpRequest.__ChromeRemoteDevToolsHooked = true;
}

/**
 * Hook fetch / fetch 훅
 */
function hookFetch(): void {
  const globalObj =
    typeof globalThis !== 'undefined' ? globalThis : typeof global !== 'undefined' ? global : {};
  const origFetch = (globalObj as any).fetch;
  if (!origFetch || (origFetch as any).__ChromeRemoteDevToolsHooked) return;
  originalFetch = origFetch;
  (globalObj as any).fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = (init?.method as string) || 'GET';
    const headers: Record<string, string> = {};
    const h = init?.headers;
    if (h) {
      if (h instanceof Headers) {
        h.forEach((v, k) => {
          headers[k] = v;
        });
      } else if (Array.isArray(h)) {
        for (const [k, v] of h) {
          headers[k] = v;
        }
      } else {
        Object.assign(headers, h);
      }
    }
    let postData: string | undefined;
    const body = init?.body;
    if (body !== undefined && body !== null) {
      postData = typeof body === 'string' ? body : '[binary]';
    }
    const requestId = nextRequestId('fetch');
    try {
      sendRequestWillBeSent(requestId, url, method, headers, postData, 'Fetch');
    } catch (_e) {
      // Ignore CDP send errors / CDP 전송 오류 무시
    }
    return origFetch.call(this, input, init).then(
      (response: Response) => {
        try {
          // Use Content-Length header when available; avoid consuming body (clone/text breaks binary / large responses)
          const contentLength = response.headers.get('content-length');
          const encodedDataLength = contentLength !== null ? parseInt(contentLength, 10) || 0 : 0;
          sendLoadingFinished(requestId, encodedDataLength);
        } catch {
          sendLoadingFinished(requestId, 0);
        }
        return response;
      },
      (err: unknown) => {
        sendLoadingFinished(requestId, 0);
        throw err;
      }
    );
  };
  (globalObj as any).fetch.__ChromeRemoteDevToolsHooked = true;
}

/**
 * Restore original XMLHttpRequest and fetch / 원본 XMLHttpRequest·fetch 복원
 */
function uninstallHooks(): boolean {
  if (!isHooked) return true;
  const globalObj =
    typeof globalThis !== 'undefined' ? globalThis : typeof global !== 'undefined' ? global : {};
  if (originalXHR) {
    (globalObj as any).XMLHttpRequest = originalXHR;
    originalXHR = null;
  }
  if (originalFetch) {
    (globalObj as any).fetch = originalFetch;
    originalFetch = null;
  }
  isHooked = false;
  return true;
}

/**
 * Install network hooks / 네트워크 훅 설치
 */
function installHooks(): boolean {
  try {
    hookXHR();
    hookFetch();
    isHooked = true;
    return true;
  } catch (_e) {
    return false;
  }
}

/**
 * Enable network hook (install wrappers) / 네트워크 훅 활성화 (래퍼 설치)
 */
export function enableNetworkHook(): boolean {
  return installHooks();
}

/**
 * Disable network hook (restore originals) / 네트워크 훅 비활성화 (원본 복원)
 */
export function disableNetworkHook(): boolean {
  return uninstallHooks();
}

/**
 * Check if network hook is enabled / 네트워크 훅이 활성화되어 있는지 확인
 */
export function isNetworkHookEnabled(): boolean {
  return isHooked;
}
