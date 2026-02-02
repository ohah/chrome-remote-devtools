/**
 * Shared types and helpers for network test tabs (Fetch / XHR) / Fetch·XHR 네트워크 테스트 탭 공유 타입·헬퍼
 * @format
 */

/** Status shown after a network request / 네트워크 요청 후 표시되는 상태 */
export interface NetworkStatus {
  method: string;
  status: 'success' | 'error' | null;
  request?: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
  };
  response?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body?: unknown;
  };
}

/** Test headers with various values / 다양한 값으로 헤더 테스트 */
export function getTestHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: 'Bearer test-token-12345',
    'X-Request-ID': `req-${Date.now()}`,
    'X-Custom-Header': 'custom-value',
    'User-Agent': 'ReactNative-Test/1.0',
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'X-API-Version': 'v1',
    'X-Client-Type': 'mobile',
    'X-Device-ID': 'device-12345',
  };
}
