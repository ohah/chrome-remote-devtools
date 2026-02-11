/**
 * Settings modal + Metro URL store (Zustand) / 설정 모달 및 Metro URL 저장
 */
import { create } from 'zustand';

const METRO_URL_KEY = 'react-native-devtools-metro-url';
const DEFAULT_METRO_URL = 'http://localhost:8081';

function getStoredMetroUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_METRO_URL;
  try {
    return localStorage.getItem(METRO_URL_KEY) ?? DEFAULT_METRO_URL;
  } catch {
    return DEFAULT_METRO_URL;
  }
}

interface SettingsState {
  isSettingsOpen: boolean;
  metroUrl: string;
  openSettings: () => void;
  closeSettings: () => void;
  setMetroUrl: (url: string) => void;
  resetMetroUrl: () => void;
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  isSettingsOpen: false,
  metroUrl: getStoredMetroUrl(),
  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),
  setMetroUrl: (url) => {
    set({ metroUrl: url });
    try {
      localStorage.setItem(METRO_URL_KEY, url);
    } catch {
      // ignore
    }
  },
  resetMetroUrl: () => {
    set({ metroUrl: DEFAULT_METRO_URL });
    try {
      localStorage.setItem(METRO_URL_KEY, DEFAULT_METRO_URL);
    } catch {
      // ignore
    }
  },
}));

export function useOpenSettings(): () => void {
  return useSettingsStore((s) => s.openSettings);
}

export { DEFAULT_METRO_URL };
