// Server URL management / 서버 URL 관리
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ServerUrlState {
  /** Server URL (default: http://localhost:8080) / 서버 URL (기본값: http://localhost:8080) */
  serverUrl: string | null;
  /** Metro bundler URL for /json/list (default: http://localhost:8081) / /json/list용 Metro URL (기본값: http://localhost:8081) */
  metroUrl: string | null;
  /** Set server URL / 서버 URL 설정 */
  setServerUrl: (url: string) => void;
  /** Set Metro URL / Metro URL 설정 */
  setMetroUrl: (url: string) => void;
  /** Reset server URL to default / 서버 URL을 기본값으로 재설정 */
  resetServerUrl: () => void;
  /** Reset Metro URL to default / Metro URL을 기본값으로 재설정 */
  resetMetroUrl: () => void;
  /** Get current server URL / 현재 서버 URL 가져오기 */
  getServerUrl: () => string | null;
  /** Get Metro URL / Metro URL 가져오기 */
  getMetroUrl: () => string | null;
}

/**
 * Server URL store with persist middleware / persist 미들웨어를 사용한 서버 URL store
 */
const useServerUrlStore = create<ServerUrlState>()(
  persist(
    (set, get) => ({
      serverUrl: null,
      metroUrl: null,
      setServerUrl: (url: string) => {
        try {
          new URL(url);
          set({ serverUrl: url });
        } catch {
          throw new Error('Invalid URL format');
        }
      },
      setMetroUrl: (url: string) => {
        try {
          new URL(url);
          set({ metroUrl: url });
        } catch {
          throw new Error('Invalid URL format');
        }
      },
      resetServerUrl: () => {
        set({ serverUrl: null });
      },
      resetMetroUrl: () => {
        set({ metroUrl: null });
      },
      getServerUrl: () => {
        return get().serverUrl ?? 'http://localhost:8080';
      },
      getMetroUrl: () => {
        return get().metroUrl ?? 'http://localhost:8081';
      },
    }),
    {
      name: 'chrome-remote-devtools-server-url', // localStorage key / localStorage 키
    }
  )
);

/**
 * Parse server URL to bind address (host + port) for embedded server /
 * 서버 URL을 내장 서버 바인드 주소(host + port)로 파싱
 * @param url - Full server URL (e.g. http://localhost:8080) / 전체 서버 URL
 * @returns host (0.0.0.0 for bind-all) and port / 바인드용 host와 port
 */
export function parseServerUrlToBind(url: string): { host: string; port: number } {
  try {
    const u = new URL(url);
    const port = u.port ? parseInt(u.port, 10) : 8080;
    return {
      host: '0.0.0.0',
      port: Number.isNaN(port) || port <= 0 ? 8080 : port,
    };
  } catch {
    return { host: '0.0.0.0', port: 8080 };
  }
}

/**
 * Get server URL from environment variable or store / 환경 변수 또는 store에서 서버 URL 가져오기
 * @returns Server URL (default http://localhost:8080 when not set) / 서버 URL (미설정 시 기본값)
 */
export function getServerUrl(): string {
  if (typeof window !== 'undefined' && import.meta.env.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL;
  }
  return useServerUrlStore.getState().getServerUrl();
}

/**
 * Set server URL / 서버 URL 설정
 * @param url - Server URL to save / 저장할 서버 URL
 */
export function setServerUrl(url: string): void {
  useServerUrlStore.getState().setServerUrl(url);
}

/**
 * Reset server URL to default / 서버 URL을 기본값으로 재설정
 */
export function resetServerUrl(): void {
  useServerUrlStore.getState().resetServerUrl();
}

/**
 * Hook to use server URL store / 서버 URL store를 사용하는 hook
 * @returns Server URL store state and actions / 서버 URL store state와 actions
 */
export function useServerUrl() {
  const store = useServerUrlStore();

  return {
    serverUrl: store.getServerUrl(),
    normalServerUrl: store.serverUrl,
    metroUrl: store.getMetroUrl(),
    setServerUrl: store.setServerUrl,
    setMetroUrl: store.setMetroUrl,
    resetServerUrl: store.resetServerUrl,
    resetMetroUrl: store.resetMetroUrl,
    // Backward compatibility / 하위 호환성
    setNormalServerUrl: store.setServerUrl,
    resetNormalServerUrl: store.resetServerUrl,
  };
}
