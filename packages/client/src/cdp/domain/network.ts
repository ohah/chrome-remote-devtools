// Network domain implementation / Network 도메인 구현
import { key2UpperCase } from '../common/utils';
import BaseDomain from './base';
import { Event } from './protocol';
import type { DomainOptions } from '../types';

const getTimestamp = () => Date.now() / 1000;

interface NetworkRequest {
  requestId: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  postData?: string;
}

interface NetworkResponse {
  requestId: string;
  url: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  mimeType: string;
  body?: string;
}

export default class Network extends BaseDomain {
  override namespace = 'Network';

  private requestId = 0;
  private responseData = new Map<string, NetworkResponse>();
  // Use WeakMap for XHR metadata to avoid memory leaks / 메모리 누수 방지를 위해 XHR 메타데이터에 WeakMap 사용
  private xhrMetadata = new WeakMap<XMLHttpRequest, { method: string; url: string }>();

  constructor(options: DomainOptions) {
    super(options);
    this.hookXhr();
    this.hookFetch();
  }

  // Enable Network domain / Network 도메인 활성화
  override enable(): void {
    this.reportImageNetwork();
  }

  // Get response body / 응답 본문 가져오기
  getResponseBody({ requestId }: { requestId: string }): { body: string; base64Encoded: boolean } {
    const response = this.responseData.get(requestId);
    if (!response) {
      return { body: '', base64Encoded: false };
    }

    if (typeof response.body === 'string') {
      return { body: response.body, base64Encoded: false };
    }

    return { body: '', base64Encoded: false };
  }

  // Get cookies / 쿠키 가져오기
  getCookies(): { cookies: Array<{ name: string; value: string; domain: string; path: string }> } {
    const cookies: Array<{ name: string; value: string; domain: string; path: string }> = [];
    if (document.cookie) {
      document.cookie.split(';').forEach((cookie) => {
        const [name, value] = cookie.split('=').map((s) => s.trim());
        if (name && value) {
          cookies.push({
            name,
            value,
            domain: location.hostname,
            path: '/',
          });
        }
      });
    }
    return { cookies };
  }

  // Set cookie / 쿠키 설정
  setCookie({
    name,
    value,
    domain,
    path,
    httpOnly,
    secure,
    sameSite,
  }: {
    name: string;
    value: string;
    domain?: string;
    path?: string;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: string;
  }): { success: boolean } {
    try {
      let cookieStr = `${name}=${value}`;
      if (domain) cookieStr += `; domain=${domain}`;
      if (path) cookieStr += `; path=${path}`;
      if (httpOnly) cookieStr += '; httpOnly';
      if (secure) cookieStr += '; secure';
      if (sameSite) cookieStr += `; sameSite=${sameSite}`;

      document.cookie = cookieStr;
      return { success: true };
    } catch {
      return { success: false };
    }
  }

  // Delete cookies / 쿠키 삭제
  deleteCookies({ name, domain, path }: { name?: string; domain?: string; path?: string }): void {
    if (name) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path || '/'}; domain=${domain || location.hostname}`;
    } else {
      // Delete all cookies / 모든 쿠키 삭제
      document.cookie.split(';').forEach((cookie) => {
        const cookieName = cookie.split('=')[0]?.trim();
        if (cookieName) {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
        }
      });
    }
  }

  // Hook XMLHttpRequest / XMLHttpRequest 훅
  private hookXhr(): void {
    const self = this;
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (
      method: string,
      url: string | URL,
      ...args: unknown[]
    ) {
      // Store metadata in WeakMap / WeakMap에 메타데이터 저장
      self.xhrMetadata.set(this, {
        method,
        url: typeof url === 'string' ? url : url.toString(),
      });
      return originalOpen.apply(this, [method, url, ...args] as Parameters<typeof originalOpen>);
    };

    XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
      // Get metadata from WeakMap / WeakMap에서 메타데이터 가져오기
      const metadata = self.xhrMetadata.get(this);
      if (!metadata) {
        return originalSend.apply(this, [body]);
      }
      const { method, url } = metadata;
      const requestId = `${self.requestId++}`;

      const request: NetworkRequest = {
        requestId,
        url,
        method,
        headers: Network.getDefaultHeaders(),
      };

      if (body) {
        request.postData = typeof body === 'string' ? body : JSON.stringify(body);
      }

      self.socketSend({
        method: Event.requestWillBeSent,
        params: {
          requestId,
          loaderId: requestId,
          documentURL: location.href,
          request: {
            url,
            method,
            headers: request.headers,
            postData: request.postData,
          },
          timestamp: getTimestamp(),
          type: 'XHR',
        },
      });

      this.addEventListener('load', () => {
        const response: NetworkResponse = {
          requestId,
          url,
          status: this.status,
          statusText: this.statusText,
          headers: Network.formatResponseHeader(this.getAllResponseHeaders()),
          mimeType: this.getResponseHeader('content-type') || 'text/plain',
          body: this.responseText,
        };

        self.responseData.set(requestId, response);

        self.socketSend({
          method: Event.responseReceived,
          params: {
            requestId,
            loaderId: requestId,
            timestamp: getTimestamp(),
            type: 'XHR',
            response: {
              url,
              status: this.status,
              statusText: this.statusText,
              headers: response.headers,
              mimeType: response.mimeType,
            },
          },
        });

        self.socketSend({
          method: Event.loadingFinished,
          params: {
            requestId,
            timestamp: getTimestamp(),
          },
        });
      });

      this.addEventListener('error', () => {
        self.socketSend({
          method: Event.loadingFailed,
          params: {
            requestId,
            timestamp: getTimestamp(),
            errorText: 'Network error',
            canceled: false,
          },
        });
      });

      return originalSend.apply(this, [body]);
    };
  }

  // Hook fetch / fetch 훅
  private hookFetch(): void {
    const self = this;
    const originalFetch = window.fetch;

    window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const method = init?.method || 'GET';
      const requestId = `${self.requestId++}`;

      const request: NetworkRequest = {
        requestId,
        url,
        method,
        headers: {
          ...Network.getDefaultHeaders(),
          ...((init?.headers as Record<string, string>) || {}),
        },
      };

      if (init?.body) {
        request.postData = typeof init.body === 'string' ? init.body : JSON.stringify(init.body);
      }

      self.socketSend({
        method: Event.requestWillBeSent,
        params: {
          requestId,
          loaderId: requestId,
          documentURL: location.href,
          request: {
            url,
            method,
            headers: request.headers,
            postData: request.postData,
          },
          timestamp: getTimestamp(),
          type: 'Fetch',
        },
      });

      return originalFetch(input, init)
        .then((response) => {
          response
            .clone()
            .text()
            .then((body) => {
              // Format headers using forEach / forEach를 사용하여 헤더 포맷팅
              let headersText = '';
              response.headers.forEach((value, key) => {
                headersText += `${key}: ${value}\r\n`;
              });

              const networkResponse: NetworkResponse = {
                requestId,
                url,
                status: response.status,
                statusText: response.statusText,
                headers: Network.formatResponseHeader(headersText),
                mimeType: response.headers.get('content-type') || 'text/plain',
                body,
              };

              self.responseData.set(requestId, networkResponse);

              self.socketSend({
                method: Event.responseReceived,
                params: {
                  requestId,
                  loaderId: requestId,
                  timestamp: getTimestamp(),
                  type: 'Fetch',
                  response: {
                    url,
                    status: response.status,
                    statusText: response.statusText,
                    headers: networkResponse.headers,
                    mimeType: networkResponse.mimeType,
                  },
                },
              });

              self.socketSend({
                method: Event.loadingFinished,
                params: {
                  requestId,
                  timestamp: getTimestamp(),
                },
              });
            });

          return response;
        })
        .catch((error) => {
          self.socketSend({
            method: Event.loadingFailed,
            params: {
              requestId,
              timestamp: getTimestamp(),
              errorText: error.message,
              canceled: false,
            },
          });
          throw error;
        });
    } as typeof fetch;
  }

  // Report image network requests / 이미지 네트워크 요청 보고
  private reportImageNetwork(): void {
    const images = document.querySelectorAll('img');
    images.forEach((img) => {
      if (img.src && !img.complete) {
        const requestId = `${this.requestId++}`;
        this.socketSend({
          method: Event.requestWillBeSent,
          params: {
            requestId,
            loaderId: requestId,
            documentURL: location.href,
            request: {
              url: img.src,
              method: 'GET',
              headers: Network.getDefaultHeaders(),
            },
            timestamp: getTimestamp(),
            type: 'Image',
          },
        });

        img.addEventListener('load', () => {
          this.socketSend({
            method: Event.responseReceived,
            params: {
              requestId,
              loaderId: requestId,
              timestamp: getTimestamp(),
              type: 'Image',
              response: {
                url: img.src,
                status: 200,
                statusText: 'OK',
                headers: {},
                mimeType: 'image/*',
              },
            },
          });

          this.socketSend({
            method: Event.loadingFinished,
            params: {
              requestId,
              timestamp: getTimestamp(),
            },
          });
        });

        img.addEventListener('error', () => {
          this.socketSend({
            method: Event.loadingFailed,
            params: {
              requestId,
              timestamp: getTimestamp(),
              errorText: 'Failed to load image',
              canceled: false,
            },
          });
        });
      }
    });
  }

  // Send network event / 네트워크 이벤트 전송
  private socketSend(data: { method: string; params: unknown }): void {
    // Always send event (will be stored in IndexedDB if WebSocket is not connected) / 항상 이벤트 전송 (WebSocket이 연결되지 않았으면 IndexedDB에 저장됨)
    this.send(data);
  }

  // Format response header / 응답 헤더 포맷팅
  static formatResponseHeader(header: string): Record<string, string> {
    const headers: Record<string, string> = {};
    header
      .split('\n')
      .filter((val) => val)
      .forEach((item) => {
        const [key, ...valueParts] = item.split(':');
        if (key) {
          headers[key2UpperCase(key.trim())] = valueParts.join(':').trim();
        }
      });
    return headers;
  }

  // Get default headers / 기본 헤더 가져오기
  static getDefaultHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': navigator.userAgent,
    };
    if (document.cookie) {
      headers.Cookie = document.cookie;
    }
    return headers;
  }
}
