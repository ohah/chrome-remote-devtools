// Server URL management / 서버 URL 관리
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ServerUrlState {
  /** Normal server URL (default: http://localhost:8080) / 일반 서버 URL (기본값: http://localhost:8080) */
  normalServerUrl: string | null;
  /** Reactotron server URL (default: http://localhost:9090) / Reactotron 서버 URL (기본값: http://localhost:9090) */
  reactotronServerUrl: string | null;
  /** Whether Reactotron mode is enabled / Reactotron 모드 활성화 여부 */
  isReactotronMode: boolean;
  /** Set normal server URL / 일반 서버 URL 설정 */
  setNormalServerUrl: (url: string) => void;
  /** Set Reactotron server URL / Reactotron 서버 URL 설정 */
  setReactotronServerUrl: (url: string) => void;
  /** Set Reactotron mode / Reactotron 모드 설정 */
  setReactotronMode: (enabled: boolean) => void;
  /** Reset normal server URL to default / 일반 서버 URL을 기본값으로 재설정 */
  resetNormalServerUrl: () => void;
  /** Reset Reactotron server URL to default / Reactotron 서버 URL을 기본값으로 재설정 */
  resetReactotronServerUrl: () => void;
  /** Get current active server URL / 현재 활성 서버 URL 가져오기 */
  getServerUrl: () => string | null;
}

/**
 * Server URL store with persist middleware / persist 미들웨어를 사용한 서버 URL store
 */
const useServerUrlStore = create<ServerUrlState>()(
  persist(
    (set, get) => ({
      normalServerUrl: null,
      reactotronServerUrl: null,
      isReactotronMode: false,
      setNormalServerUrl: (url: string) => {
        // Validate URL format / URL 형식 검증
        try {
          new URL(url);
          set({ normalServerUrl: url });
        } catch {
          throw new Error('Invalid URL format');
        }
      },
      setReactotronServerUrl: (url: string) => {
        // Validate URL format / URL 형식 검증
        try {
          new URL(url);
          set({ reactotronServerUrl: url });
        } catch {
          throw new Error('Invalid URL format');
        }
      },
      setReactotronMode: (enabled: boolean) => {
        set({ isReactotronMode: enabled });
      },
      resetNormalServerUrl: () => {
        set({ normalServerUrl: null });
      },
      resetReactotronServerUrl: () => {
        set({ reactotronServerUrl: null });
      },
      getServerUrl: () => {
        const state = get();
        if (state.isReactotronMode) {
          return state.reactotronServerUrl ?? 'http://localhost:9090';
        }
        return state.normalServerUrl ?? 'http://localhost:8080';
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

  // Get current active server URL from store / store에서 현재 활성 서버 URL 가져오기
  return useServerUrlStore.getState().getServerUrl();
}

/**
 * Set normal server URL / 일반 서버 URL 설정
 * @param url - Server URL to save / 저장할 서버 URL
 */
export function setNormalServerUrl(url: string): void {
  useServerUrlStore.getState().setNormalServerUrl(url);
}

/**
 * Set Reactotron server URL / Reactotron 서버 URL 설정
 * @param url - Server URL to save / 저장할 서버 URL
 */
export function setReactotronServerUrl(url: string): void {
  useServerUrlStore.getState().setReactotronServerUrl(url);
}

/**
 * Set Reactotron mode / Reactotron 모드 설정
 * @param enabled - Whether Reactotron mode is enabled / Reactotron 모드 활성화 여부
 */
export function setReactotronMode(enabled: boolean): void {
  useServerUrlStore.getState().setReactotronMode(enabled);
}

/**
 * Set server URL (backward compatibility - sets normal server URL) / 서버 URL 설정 (하위 호환성 - 일반 서버 URL 설정)
 * @param url - Server URL to save / 저장할 서버 URL
 */
export function setServerUrl(url: string): void {
  useServerUrlStore.getState().setNormalServerUrl(url);
}

/**
 * Reset normal server URL to default / 일반 서버 URL을 기본값으로 재설정
 */
export function resetNormalServerUrl(): void {
  useServerUrlStore.getState().resetNormalServerUrl();
}

/**
 * Reset Reactotron server URL to default / Reactotron 서버 URL을 기본값으로 재설정
 */
export function resetReactotronServerUrl(): void {
  useServerUrlStore.getState().resetReactotronServerUrl();
}

/**
 * Reset server URL to default (backward compatibility - resets normal server URL) / 서버 URL을 기본값으로 재설정 (하위 호환성 - 일반 서버 URL 재설정)
 */
export function resetServerUrl(): void {
  useServerUrlStore.getState().resetNormalServerUrl();
}

/**
 * Hook to use server URL store / 서버 URL store를 사용하는 hook
 * @returns Server URL store state and actions / 서버 URL store state와 actions
 */
export function useServerUrl() {
  const store = useServerUrlStore();

  return {
    serverUrl: store.getServerUrl(),
    normalServerUrl: store.normalServerUrl,
    reactotronServerUrl: store.reactotronServerUrl,
    isReactotronMode: store.isReactotronMode,
    setNormalServerUrl: store.setNormalServerUrl,
    setReactotronServerUrl: store.setReactotronServerUrl,
    setReactotronMode: store.setReactotronMode,
    resetNormalServerUrl: store.resetNormalServerUrl,
    resetReactotronServerUrl: store.resetReactotronServerUrl,
    // Backward compatibility / 하위 호환성
    setServerUrl: store.setNormalServerUrl,
    resetServerUrl: store.resetNormalServerUrl,
  };
}
