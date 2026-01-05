// Redux store configuration / Redux store 설정
// Note: Redux DevTools Extension is auto-initialized on import / 참고: Redux DevTools Extension은 import 시 자동 초기화됩니다
import '@ohah/chrome-remote-devtools-react-native';
import { setupReduxDevToolsExtension } from '@ohah/chrome-remote-devtools-react-native';
import { configureStore } from '@reduxjs/toolkit';
import counterReducer from './slices/counterSlice';
import todoReducer from './slices/todoSlice';
import cartReducer from './slices/cartSlice';

// Ensure extension is set up before store creation / store 생성 전에 extension 설정 보장
// This is important for production builds where module loading order may vary / 프로덕션 빌드에서 모듈 로딩 순서가 달라질 수 있으므로 중요합니다
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
  const isFunction = typeof extension === 'function';

  console.log('[Store] __REDUX_DEVTOOLS_EXTENSION__ check BEFORE store creation:', {
    exists: hasExtension,
    hasConnect,
    isFunction,
    hasGlobal: typeof global !== 'undefined',
    hasWindow: typeof window !== 'undefined',
    extensionType: typeof extension,
    extensionKeys: extension ? Object.keys(extension) : [],
  });

  if (!hasExtension) {
    console.log('[Store] Extension not found, initializing...');
    setupReduxDevToolsExtension('localhost', 8080);

    // Check again after initialization / 초기화 후 다시 확인
    const extensionAfter = globalObj.__REDUX_DEVTOOLS_EXTENSION__;
    console.log('[Store] __REDUX_DEVTOOLS_EXTENSION__ check AFTER initialization:', {
      exists: !!extensionAfter,
      hasConnect: typeof extensionAfter?.connect === 'function',
      isFunction: typeof extensionAfter === 'function',
    });
  }
};

checkExtensionBeforeStore();

// Get extension for explicit use / 명시적 사용을 위해 extension 가져오기
const getExtension = () => {
  const globalObj = getGlobalObj();
  return globalObj.__REDUX_DEVTOOLS_EXTENSION__;
};

// Configure store with DevTools / DevTools와 함께 store 설정
// Enable DevTools explicitly for production builds / 프로덕션 빌드에서도 DevTools 명시적으로 활성화
// Use extension directly if available / extension이 있으면 직접 사용
const extension = getExtension();
console.log('[Store] Using extension for configureStore:', {
  hasExtension: !!extension,
  extensionType: typeof extension,
  willUseExtension: !!extension,
});

export const store = configureStore({
  reducer: {
    counter: counterReducer,
    todo: todoReducer,
    cart: cartReducer,
  },
  // Use extension directly if available, otherwise use true / extension이 있으면 직접 사용, 없으면 true
  devTools: extension || true,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
