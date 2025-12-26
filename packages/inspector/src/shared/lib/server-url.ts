// Server URL management / 서버 URL 관리
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_SERVER_URL } from './constants';

interface ServerUrlState {
  /** Server URL / 서버 URL */
  serverUrl: string | null;
  /** Set server URL / 서버 URL 설정 */
  setServerUrl: (url: string) => void;
  /** Reset server URL to default / 서버 URL을 기본값으로 재설정 */
  resetServerUrl: () => void;
}

/**
 * Server URL store with persist middleware / persist 미들웨어를 사용한 서버 URL store
 */
const useServerUrlStore = create<ServerUrlState>()(
  persist(
    (set) => ({
      serverUrl: null,
      setServerUrl: (url: string) => {
        // Validate URL format / URL 형식 검증
        try {
          new URL(url);
          set({ serverUrl: url });
        } catch {
          throw new Error('Invalid URL format / 잘못된 URL 형식');
        }
      },
      resetServerUrl: () => {
        set({ serverUrl: null });
      },
    }),
    {
      name: 'chrome-remote-devtools-server-url', // localStorage key / localStorage 키
    }
  )
);

/**
 * Get server URL from environment variable or store / 환경 변수 또는 store에서 서버 URL 가져오기
 * @returns Server URL or null if not set / 서버 URL 또는 설정되지 않았으면 null
 */
export function getServerUrl(): string | null {
  // Check environment variable first / 먼저 환경 변수 확인
  if (typeof window !== 'undefined' && import.meta.env.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL;
  }

  // Check store / store 확인
  const storedUrl = useServerUrlStore.getState().serverUrl;
  return storedUrl ?? null;
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
    serverUrl: store.serverUrl,
    setServerUrl: store.setServerUrl,
    resetServerUrl: store.resetServerUrl,
  };
}
