// Counter store with Zustand / Zustand를 사용한 카운터 store
// Using Chrome Remote DevTools middleware for reliable DevTools connection
// 안정적인 DevTools 연결을 위해 Chrome Remote DevTools 미들웨어 사용
import { create } from 'zustand';
import { devtools } from '@ohah/chrome-remote-devtools-react-native/zustand';

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
      increment: () => {
        console.log('[Zustand CounterStore] increment() called');
        set((state) => ({ value: state.value + 1 }));
      },
      decrement: () => {
        console.log('[Zustand CounterStore] decrement() called');
        set((state) => ({ value: state.value - 1 }));
      },
      reset: () => {
        console.log('[Zustand CounterStore] reset() called');
        set({ value: 0 });
      },
    }),
    { name: 'CounterStore' }
  )
);

console.log('[Zustand CounterStore] Store created successfully');

export default useCounterStore;
