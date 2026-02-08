/**
 * Settings modal open state (Zustand) / 설정 모달 열림 상태 (Zustand)
 * Call openSettings() from anywhere without subscribing = no extra re-renders / 구독 없이 openSettings() 호출 가능 = 불필요한 리렌더 없음
 */
import { create } from 'zustand';

interface SettingsModalState {
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
}

export const useSettingsModalStore = create<SettingsModalState>()((set) => ({
  isSettingsOpen: false,
  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),
}));

/** Open settings from event handlers without subscribing to store / 구독 없이 설정 모달 열기 */
export function openSettings(): void {
  useSettingsModalStore.getState().openSettings();
}

/** Hook that returns openSettings only; stable ref, no re-render when modal toggles / openSettings만 반환, 모달 토글 시 리렌더 없음 */
export function useOpenSettings(): () => void {
  return useSettingsModalStore((s) => s.openSettings);
}
