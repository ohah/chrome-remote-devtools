// Network domain (XHR/fetch hook, aligned with web client domain/network.ts) / Network 도메인 (XHR·fetch 훅, 웹 domain/network.ts와 동일 구조)
/// <reference lib="dom" />

import { Event } from './protocol';
import { sendCDPEvent } from './base';
import { registerCDPMessageHandler } from '../../cdp-message-handler';
import { getServerInfo } from '../../server-info';
import { getCDPSender } from '../../websocket-client';

let isHooked = false;
let requestIdCounter = 0;

/** Store response body for Network.getResponseBody / Network.getResponseBody용 응답 본문 저장 */
/** Max entries to avoid unbounded growth (align with RN/DevTools-style limits) / 무한 증가 방지 (RN·DevTools 수준 제한) */
const MAX_RESPONSE_DATA_ENTRIES = 100;
const responseData = new Map<string, string>();

function setResponseData(requestId: string, body: string): void {
  responseData.set(requestId, body);
  if (responseData.size > MAX_RESPONSE_DATA_ENTRIES) {
    const oldestKey = responseData.keys().next().value as string | undefined;
    if (oldestKey !== undefined) responseData.delete(oldestKey);
  }
}

/** Original global XMLHttpRequest and fetch (for wrapper use / restore value) / 복원용 원본 전역 XMLHttpRequest·fetch */
let originalXHR: typeof XMLHttpRequest | null = null;
let originalFetch: typeof fetch | null = null;

/** Original property descriptors for restore via defineProperty / defineProperty로 복원할 원본 프로퍼티 설명자 */
let originalXHRDescriptor: PropertyDescriptor | undefined;
let originalFetchDescriptor: PropertyDescriptor | undefined;

/**
 * Get stored response body for requestId (for Network.getResponseBody) / requestId에 대한 저장된 응답 본문 가져오기
 */
export function getStoredResponseBody(requestId: string): string {
  return responseData.get(requestId) ?? '';
}

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
 * Send Network.loadingFailed event (same params as C++ NetworkEventSender) / Network.loadingFailed 이벤트 전송 (C++와 동일 파라미터)
 * DevTools requires type to match request and finish the request / DevTools가 요청 매칭 및 종료에 type 사용
 */
function sendLoadingFailed(
  requestId: string,
  errorText: string,
  canceled: boolean,
  type: string
): void {
  sendCDPEvent({
    method: Event.loadingFailed,
    params: {
      requestId,
      timestamp: getTimestamp(),
      type,
      errorText: errorText || 'Network error',
      canceled,
    },
  });
}

/** Recent fetch (url, method, time) to dedupe XHR when fetch uses XHR under the hood / fetch가 내부적으로 XHR 사용 시 중복 기록 방지 */
const recentFetches: Array<{ url: string; method: string; time: number }> = [];
const RECENT_FETCH_MS = 200;

function markFetchStarted(url: string, method: string): void {
  const now = Date.now();
  while (recentFetches.length > 0 && recentFetches[0]!.time < now - RECENT_FETCH_MS) {
    recentFetches.shift();
  }
  recentFetches.push({ url, method, time: now });
}

function isLikelyFetchPolyfill(url: string, method: string): boolean {
  const now = Date.now();
  return recentFetches.some(
    (f) => f.url === url && f.method === method && now - f.time < RECENT_FETCH_MS
  );
}

/** CDP-style header key: capitalize first letter and letter after hyphen / CDP 스타일 헤더 키 */
function headerKeyCase(key: string): string {
  return key.replace(/^\S|-./g, (s) => s.toUpperCase());
}

/**
 * Parse response header string into Record (same shape as web client) / 응답 헤더 문자열을 Record로 파싱
 */
function formatResponseHeader(header: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const lines = header.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf(':');
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    if (key) {
      headers[headerKeyCase(key)] = val;
    }
  }
  return headers;
}

/**
 * Send Network.responseReceived event (response headers, status, mimeType) / Network.responseReceived 이벤트 전송 (응답 헤더·상태·mimeType)
 */
function sendResponseReceived(
  requestId: string,
  type: string,
  url: string,
  status: number,
  statusText: string,
  headers: Record<string, string>,
  mimeType: string
): void {
  sendCDPEvent({
    method: Event.responseReceived,
    params: {
      requestId,
      loaderId: requestId,
      timestamp: getTimestamp(),
      type,
      response: {
        url,
        status,
        statusText,
        headers,
        mimeType,
      },
    },
  });
}

/**
 * Hook XMLHttpRequest via Object.defineProperty / Object.defineProperty로 XMLHttpRequest 훅
 * Uses a subclass so instanceof XMLHttpRequest is preserved / instanceof XMLHttpRequest 보존
 */
function hookXHR(): void {
  const globalObj =
    typeof globalThis !== 'undefined' ? globalThis : typeof global !== 'undefined' ? global : {};
  const XHR = (globalObj as any).XMLHttpRequest;
  if (!XHR || (XHR as any).__ChromeRemoteDevToolsHooked) return;
  const desc = Object.getOwnPropertyDescriptor(globalObj, 'XMLHttpRequest');
  if (desc) {
    originalXHRDescriptor = desc;
  }
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
        const [async = true, user, password] = rest as [boolean?, string?, string?];
        return originalOpen(m, u, async, user, password);
      };
      const originalSetRequestHeader = xhr.setRequestHeader.bind(xhr);
      xhr.setRequestHeader = function (name: string, value: string) {
        headers[name] = value;
        return originalSetRequestHeader(name, value);
      };
      const originalSend = xhr.send.bind(xhr);
      xhr.send = function (body?: Document | ArrayBuffer | Blob | string | FormData | null) {
        const rid = nextRequestId('xhr');
        requestId = rid;
        const skipRecording = isLikelyFetchPolyfill(url, method);
        const post =
          body === undefined || body === null
            ? undefined
            : typeof body === 'string'
              ? body
              : body instanceof ArrayBuffer || ArrayBuffer.isView(body)
                ? '[binary]'
                : String(body);
        if (!skipRecording) {
          try {
            sendRequestWillBeSent(rid, url, method, headers, post, 'XHR');
          } catch (_e) {
            // Ignore CDP send errors / CDP 전송 오류 무시
          }
        }
        let handled = false;
        const finish = () => {
          requestId = null;
        };
        const onLoad = () => {
          if (!requestId || handled) return;
          handled = true;
          if (skipRecording) {
            finish();
            return;
          }
          // Match C++ XHRHook: status === 0 means network error (DNS failure, connection refused, etc.) / C++ XHRHook과 동일: status === 0이면 네트워크 에러
          // Send loadingFailed only with type; do not send responseReceived/loadingFinished so DevTools shows failed, not pending / type 포함 loadingFailed만 전송
          if (xhr.status === 0) {
            try {
              sendLoadingFailed(rid, 'Network error', false, 'XHR');
            } catch (_e) {
              // Ignore CDP send errors / CDP 전송 오류 무시
            }
            finish();
            return;
          }
          try {
            const text = typeof xhr.responseText === 'string' ? xhr.responseText : '';
            setResponseData(rid, text);
            const rawHeaders =
              typeof xhr.getAllResponseHeaders === 'function' ? xhr.getAllResponseHeaders() : '';
            const respHeaders = formatResponseHeader(rawHeaders);
            const mimeType =
              typeof xhr.getResponseHeader === 'function'
                ? xhr.getResponseHeader('content-type') || 'text/plain'
                : 'text/plain';
            sendResponseReceived(
              rid,
              'XHR',
              url,
              xhr.status,
              xhr.statusText || '',
              respHeaders,
              mimeType
            );
            const length = text.length ? new Blob([text]).size : 0;
            sendLoadingFinished(rid, length);
          } catch (_e) {
            sendLoadingFinished(rid, 0);
          }
          finish();
        };
        const onError = () => {
          if (!requestId || handled) return;
          handled = true;
          if (!skipRecording) {
            try {
              sendLoadingFailed(rid, 'Network error', false, 'XHR');
            } catch (_e) {
              // Ignore CDP send errors / CDP 전송 오류 무시
            }
          }
          finish();
        };
        const onAbort = () => {
          if (!requestId || handled) return;
          handled = true;
          if (!skipRecording) {
            try {
              sendLoadingFailed(rid, 'Request aborted', true, 'XHR');
            } catch (_e) {
              // Ignore CDP send errors / CDP 전송 오류 무시
            }
          }
          finish();
        };
        // Match C++ XHRHook: use readystatechange as PRIMARY (DONE=4 first), then load/error/abort / C++와 동일: readystatechange를 주 로직으로
        const onReadyStateChange = () => {
          if (xhr.readyState !== 4) return;
          if (!requestId || handled) return;
          handled = true;
          if (skipRecording) {
            finish();
            return;
          }
          // C++: status === 0 -> loadingFailed only, no responseReceived/loadingFinished / C++와 동일
          if (xhr.status === 0) {
            try {
              sendLoadingFailed(rid, 'Network error', false, 'XHR');
            } catch (_e) {
              // Ignore CDP send errors / CDP 전송 오류 무시
            }
            finish();
            return;
          }
          try {
            const text = typeof xhr.responseText === 'string' ? xhr.responseText : '';
            setResponseData(rid, text);
            const rawHeaders =
              typeof xhr.getAllResponseHeaders === 'function' ? xhr.getAllResponseHeaders() : '';
            const respHeaders = formatResponseHeader(rawHeaders);
            const mimeType =
              typeof xhr.getResponseHeader === 'function'
                ? xhr.getResponseHeader('content-type') || 'text/plain'
                : 'text/plain';
            sendResponseReceived(
              rid,
              'XHR',
              url,
              xhr.status,
              xhr.statusText || '',
              respHeaders,
              mimeType
            );
            const length = text.length ? new Blob([text]).size : 0;
            sendLoadingFinished(rid, length);
          } catch (_e) {
            sendLoadingFinished(rid, 0);
          }
          finish();
        };
        if (xhr.addEventListener) {
          xhr.addEventListener('readystatechange', onReadyStateChange);
          xhr.addEventListener('load', onLoad);
          xhr.addEventListener('error', onError);
          xhr.addEventListener('abort', onAbort);
        } else {
          const prevOnReadyStateChange = xhr.onreadystatechange;
          xhr.onreadystatechange = function (ev) {
            onReadyStateChange();
            if (prevOnReadyStateChange) prevOnReadyStateChange.call(this, ev);
          };
        }
        return originalSend(body);
      };
    }
  }
  try {
    Object.defineProperty(globalObj, 'XMLHttpRequest', {
      value: HookedXHR,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  } catch (_e) {
    return;
  }
  (globalObj as any).XMLHttpRequest.__ChromeRemoteDevToolsHooked = true;
}

/**
 * Hook fetch via Object.defineProperty / Object.defineProperty로 fetch 훅
 */
function hookFetch(): void {
  const globalObj =
    typeof globalThis !== 'undefined' ? globalThis : typeof global !== 'undefined' ? global : {};
  const origFetch = (globalObj as any).fetch;
  if (!origFetch || (origFetch as any).__ChromeRemoteDevToolsHooked) return;
  const desc = Object.getOwnPropertyDescriptor(globalObj, 'fetch');
  if (desc) {
    originalFetchDescriptor = desc;
  }
  originalFetch = origFetch;
  const wrappedFetch = function (
    this: typeof globalThis,
    input: RequestInfo | URL,
    init?: RequestInit
  ) {
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
    markFetchStarted(url, method);
    try {
      sendRequestWillBeSent(requestId, url, method, headers, postData, 'Fetch');
    } catch (_e) {
      // Ignore CDP send errors / CDP 전송 오류 무시
    }
    return origFetch.call(this as typeof globalThis, input, init).then(
      (response: Response) => {
        const cloned = response.clone();
        const respHeaders: Record<string, string> = {};
        response.headers.forEach((v, k) => {
          respHeaders[headerKeyCase(k)] = v;
        });
        const mimeType = response.headers.get('content-type') || 'text/plain';
        sendResponseReceived(
          requestId,
          'Fetch',
          url,
          response.status,
          response.statusText || '',
          respHeaders,
          mimeType
        );
        cloned
          .text()
          .then((body) => {
            setResponseData(requestId, body);
            const contentLength = response.headers.get('content-length');
            const encodedDataLength =
              contentLength !== null ? parseInt(contentLength, 10) || body.length : 0;
            sendLoadingFinished(requestId, encodedDataLength);
          })
          .catch(() => {
            sendLoadingFinished(requestId, 0);
          });
        return response;
      },
      (err: unknown) => {
        try {
          sendLoadingFailed(
            requestId,
            err instanceof Error ? err.message : 'Request failed',
            false,
            'Fetch'
          );
        } catch (_e) {
          // Ignore CDP send errors / CDP 전송 오류 무시
        }
        throw err;
      }
    );
  };
  (wrappedFetch as any).__ChromeRemoteDevToolsHooked = true;
  try {
    Object.defineProperty(globalObj, 'fetch', {
      value: wrappedFetch,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  } catch (_e) {
    // Restore not applied if defineProperty fails / defineProperty 실패 시 복원 미적용
  }
}

/**
 * Restore original XMLHttpRequest and fetch via Object.defineProperty / Object.defineProperty로 원본 복원
 */
function uninstallHooks(): boolean {
  if (!isHooked) return true;
  const globalObj =
    typeof globalThis !== 'undefined' ? globalThis : typeof global !== 'undefined' ? global : {};
  try {
    if (originalXHRDescriptor) {
      Object.defineProperty(globalObj, 'XMLHttpRequest', originalXHRDescriptor);
      originalXHRDescriptor = undefined;
    } else if (originalXHR) {
      Object.defineProperty(globalObj, 'XMLHttpRequest', {
        value: originalXHR,
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }
    originalXHR = null;
    if (originalFetchDescriptor) {
      Object.defineProperty(globalObj, 'fetch', originalFetchDescriptor);
      originalFetchDescriptor = undefined;
    } else if (originalFetch) {
      Object.defineProperty(globalObj, 'fetch', {
        value: originalFetch,
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }
    originalFetch = null;
  } catch (_e) {
    return false;
  }
  isHooked = false;
  return true;
}

/**
 * Install network hooks / 네트워크 훅 설치
 * Idempotent: if already hooked, skip / 이미 훅이 설치되어 있으면 건너뜀
 */
function installHooks(): boolean {
  if (isHooked) return true;
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

// Register Network.getResponseBody so DevTools can request response body / DevTools가 응답 본문을 요청할 수 있도록 Network.getResponseBody 핸들러 등록
registerCDPMessageHandler('Network.getResponseBody', (message) => {
  const id = message.id;
  const params = message.params as { requestId?: string } | undefined;
  const requestId = params?.requestId;
  if (id === undefined || typeof requestId !== 'string') return;
  const body = getStoredResponseBody(requestId);
  const serverInfo = getServerInfo();
  const sender = getCDPSender();
  if (serverInfo && sender) {
    const response = { id, result: { body, base64Encoded: false } };
    sender(serverInfo.host, serverInfo.port, JSON.stringify(response));
  }
});
