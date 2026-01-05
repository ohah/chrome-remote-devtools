// Counter store with Zustand / Zustand를 사용한 카운터 store
// Note: Redux DevTools Extension is auto-initialized on import / 참고: Redux DevTools Extension은 import 시 자동 초기화됩니다
import '@ohah/chrome-remote-devtools-react-native';
import { setupReduxDevToolsExtension } from '@ohah/chrome-remote-devtools-react-native';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// Type declarations for React Native environment / React Native 환경용 타입 선언
declare const global: typeof globalThis;

// Helper function to get global object / 전역 객체를 가져오는 헬퍼 함수
const getGlobalObj = () => {
  return typeof global !== 'undefined'
    ? (global as any)
    : typeof window !== 'undefined'
      ? window
      : {};
};

// Check extension before store creation / store 생성 전에 extension 확인
const checkExtensionBeforeStore = () => {
  const globalObj = getGlobalObj();
  const extension = globalObj.__REDUX_DEVTOOLS_EXTENSION__;
  const hasExtension = !!extension;
  const hasConnect = typeof extension?.connect === 'function';

  console.log('[Zustand CounterStore] __REDUX_DEVTOOLS_EXTENSION__ check BEFORE store creation:', {
    exists: hasExtension,
    hasConnect,
    hasGlobal: typeof global !== 'undefined',
    hasWindow: typeof window !== 'undefined',
    extensionType: typeof extension,
    extensionKeys: extension ? Object.keys(extension) : [],
  });

  if (!hasExtension) {
    console.log('[Zustand CounterStore] Extension not found, initializing...');
    setupReduxDevToolsExtension('localhost', 8080);

    // Check again after initialization / 초기화 후 다시 확인
    const extensionAfter = globalObj.__REDUX_DEVTOOLS_EXTENSION__;
    console.log('[Zustand CounterStore] __REDUX_DEVTOOLS_EXTENSION__ check AFTER initialization:', {
      exists: !!extensionAfter,
      hasConnect: typeof extensionAfter?.connect === 'function',
    });
  }
};

checkExtensionBeforeStore();

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
