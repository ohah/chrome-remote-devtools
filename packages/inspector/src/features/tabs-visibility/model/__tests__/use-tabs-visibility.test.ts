/**
 * Tabs visibility model tests / 탭 표시 모델 테스트
 * Covers getTabsVisibility and useTabsVisibility / getTabsVisibility 및 useTabsVisibility 검증
 */
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { renderHook, act } from '@testing-library/react';
import { getTabsVisibility, useTabsVisibility } from '../use-tabs-visibility';

const STORAGE_KEY = 'tabs-visible';

describe('tabs-visibility', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  describe('getTabsVisibility', () => {
    test('returns true when key is unset / 미설정 시 true', () => {
      expect(getTabsVisibility()).toBe(true);
    });

    test('returns true when key is "true" / "true"일 때 true', () => {
      localStorage.setItem(STORAGE_KEY, 'true');
      expect(getTabsVisibility()).toBe(true);
    });

    test('returns false when key is "false" / "false"일 때 false', () => {
      localStorage.setItem(STORAGE_KEY, 'false');
      expect(getTabsVisibility()).toBe(false);
    });

    test('returns true for any other value / 그 외 값은 true', () => {
      localStorage.setItem(STORAGE_KEY, '');
      expect(getTabsVisibility()).toBe(true);
      localStorage.setItem(STORAGE_KEY, '1');
      expect(getTabsVisibility()).toBe(true);
    });
  });

  describe('useTabsVisibility', () => {
    test('initial showTabs matches getTabsVisibility / 초기값이 getTabsVisibility와 일치', () => {
      localStorage.setItem(STORAGE_KEY, 'true');
      const { result } = renderHook(() => useTabsVisibility());
      expect(result.current.showTabs).toBe(true);

      localStorage.setItem(STORAGE_KEY, 'false');
      const { result: result2 } = renderHook(() => useTabsVisibility());
      expect(result2.current.showTabs).toBe(false);
    });

    test('toggle updates showTabs and localStorage / toggle 시 showTabs와 localStorage 갱신', () => {
      localStorage.setItem(STORAGE_KEY, 'true');
      const { result } = renderHook(() => useTabsVisibility());
      expect(result.current.showTabs).toBe(true);

      act(() => {
        result.current.toggle();
      });
      expect(result.current.showTabs).toBe(false);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('false');

      act(() => {
        result.current.toggle();
      });
      expect(result.current.showTabs).toBe(true);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
    });

    test('toggle dispatches tabs-visibility-change event / toggle 시 tabs-visibility-change 이벤트 발생', () => {
      let received: { visible: boolean } | null = null;
      const handler = (e: Event) => {
        received = (e as CustomEvent<{ visible: boolean }>).detail;
      };
      window.addEventListener('tabs-visibility-change', handler);

      localStorage.setItem(STORAGE_KEY, 'true');
      const { result } = renderHook(() => useTabsVisibility());

      act(() => {
        result.current.toggle();
      });
      expect(received).not.toBeNull();
      expect(received!.visible).toBe(false);

      act(() => {
        result.current.toggle();
      });
      expect(received!.visible).toBe(true);

      window.removeEventListener('tabs-visibility-change', handler);
    });
  });
});
