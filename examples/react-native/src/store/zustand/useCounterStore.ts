// Counter store with Zustand / Zustand를 사용한 카운터 store
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


