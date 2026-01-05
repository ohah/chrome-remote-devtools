// Counter store with Zustand / Zustand를 사용한 카운터 store
// Note: Redux DevTools Extension is auto-initialized on import / 참고: Redux DevTools Extension은 import 시 자동 초기화됩니다
import '@ohah/chrome-remote-devtools-react-native';
import { checkExtensionBeforeStore } from '@ohah/chrome-remote-devtools-react-native';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// Check extension before store creation / store 생성 전에 extension 확인
checkExtensionBeforeStore('localhost', 8080, 'CounterStore');

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
        set((state) => ({ value: state.value + 1 }), undefined, 'counter/increment');
      },
      decrement: () => {
        console.log('[Zustand CounterStore] decrement() called');
        set((state) => ({ value: state.value - 1 }), undefined, 'counter/decrement');
      },
      reset: () => {
        console.log('[Zustand CounterStore] reset() called');
        set({ value: 0 }, undefined, 'counter/reset');
      },
    }),
    { name: 'CounterStore' }
  )
);

console.log('[Zustand CounterStore] Store created successfully');

export default useCounterStore;
