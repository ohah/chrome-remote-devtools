// Counter store with Zustand / Zustand를 사용한 카운터 store
// Note: Redux DevTools Extension is auto-initialized on import / 참고: Redux DevTools Extension은 import 시 자동 초기화됩니다
import '@ohah/chrome-remote-devtools-react-native';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface CounterState {
  value: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

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


