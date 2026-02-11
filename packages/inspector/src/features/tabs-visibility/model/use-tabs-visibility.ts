/**
 * Tabs visibility state and toggle / 탭 표시 상태 및 토글
 * Syncs with localStorage and dispatches tabs-visibility-change event /
 * localStorage와 동기화하고 tabs-visibility-change 이벤트 발생
 */
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'tabs-visible';

/**
 * Read tabs visibility from localStorage / localStorage에서 탭 표시 여부 읽기
 */
export function getTabsVisibility(): boolean {
  if (typeof window === 'undefined') return true;
  const visible = localStorage.getItem(STORAGE_KEY);
  return visible !== 'false';
}

/**
 * Hook for tabs visibility state and toggle / 탭 표시 상태 및 토글 훅
 */
export function useTabsVisibility(): { showTabs: boolean; toggle: () => void } {
  const [showTabs, setShowTabs] = useState(getTabsVisibility);

  useEffect(() => {
    setShowTabs(getTabsVisibility());
  }, []);

  const toggle = useCallback(() => {
    const newValue = !getTabsVisibility();
    setShowTabs(newValue);
    localStorage.setItem(STORAGE_KEY, String(newValue));
    window.dispatchEvent(
      new CustomEvent('tabs-visibility-change', { detail: { visible: newValue } })
    );
  }, []);

  return { showTabs, toggle };
}
