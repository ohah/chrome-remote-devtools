/**
 * Fetch URL via Bun main process (avoids CORS in renderer) / 메인 프로세스 경유 fetch (CORS 회피)
 */

declare global {
  interface Window {
    __electrobunRpc?: { request: (method: string, params: unknown) => Promise<unknown> };
  }
}

/** Fetch JSON from URL via main process if RPC available, else null / RPC 있으면 메인에서 fetch */
export async function fetchJsonFromMain<T = unknown>(url: string): Promise<T | null> {
  const rpc = typeof window !== 'undefined' ? window.__electrobunRpc : undefined;
  if (!rpc?.request) return null;
  try {
    const data = await rpc.request('fetchUrl', { url });
    return data as T;
  } catch {
    return null;
  }
}
