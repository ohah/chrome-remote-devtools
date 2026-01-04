// Counter store with Zustand / Zustand를 사용한 카운터 store
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { setupReduxDevToolsExtension } from '@ohah/chrome-remote-devtools-react-native';

// Setup extension BEFORE creating store / store 생성 전에 extension 설정
// This must be done at module level, before devtools middleware runs / 이것은 devtools middleware가 실행되기 전에 모듈 레벨에서 수행되어야 합니다
declare const global: any;
if (typeof global !== 'undefined' && !(global as any).__REDUX_DEVTOOLS_EXTENSION__) {
  console.log('[Zustand CounterStore] Setting up extension in store file...');
  setupReduxDevToolsExtension('localhost', 8080);
}

// Also ensure window has it (Zustand might check window first) / window에도 설정 (Zustand가 window를 먼저 체크할 수 있음)
if (typeof (window as any) !== 'undefined' && !(window as any).__REDUX_DEVTOOLS_EXTENSION__) {
  const globalObj = typeof global !== 'undefined' ? global : {};
  (window as any).__REDUX_DEVTOOLS_EXTENSION__ = (globalObj as any).__REDUX_DEVTOOLS_EXTENSION__;
  console.log('[Zustand CounterStore] Also set extension on window');
}

interface CounterState {
  value: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

// Debug: Check extension before creating store / 디버그: store 생성 전 extension 확인
const globalObj =
  typeof global !== 'undefined'
    ? global
    : typeof (window as any) !== 'undefined'
      ? (window as any)
      : {};
const extension = (globalObj as any).__REDUX_DEVTOOLS_EXTENSION__;
console.log('[Zustand CounterStore] Checking extension before create:', {
  exists: !!extension,
  hasConnect: typeof extension?.connect === 'function',
  global: typeof global !== 'undefined',
  window: typeof (window as any) !== 'undefined',
  windowExtension: typeof (window as any) !== 'undefined' ? (window as any).__REDUX_DEVTOOLS_EXTENSION__ : undefined,
});

const useCounterStore = create<CounterState>()(
  devtools(
    (set) => ({
      value: 0,
      increment: () =>
        set(
          (state) => ({ value: state.value + 1 }),
          undefined,
          'counter/increment'
        ),
      decrement: () =>
        set(
          (state) => ({ value: state.value - 1 }),
          undefined,
          'counter/decrement'
        ),
      reset: () => set({ value: 0 }, undefined, 'counter/reset'),
    }),
    { name: 'CounterStore' }
  )
);

export default useCounterStore;


