// Redux store configuration / Redux store 설정
import { configureStore } from '@reduxjs/toolkit';
import { setupReduxDevToolsExtension } from '@ohah/chrome-remote-devtools-react-native';
import counterReducer from './slices/counterSlice';
import todoReducer from './slices/todoSlice';
import cartReducer from './slices/cartSlice';

// Setup extension BEFORE creating store / store 생성 전에 extension 설정
declare const global: any;
if (typeof global !== 'undefined' && !(global as any).__REDUX_DEVTOOLS_EXTENSION__) {
  console.log('[Redux Store] Setting up extension in store file...');
  setupReduxDevToolsExtension('localhost', 8080);
}

// Also ensure window has it / window에도 설정
if (typeof (window as any) !== 'undefined' && !(window as any).__REDUX_DEVTOOLS_EXTENSION__) {
  const globalObj = typeof global !== 'undefined' ? global : {};
  (window as any).__REDUX_DEVTOOLS_EXTENSION__ = (globalObj as any).__REDUX_DEVTOOLS_EXTENSION__;
  console.log('[Redux Store] Also set extension on window');
}

// Debug: Check extension / 디버그: extension 확인
console.log('[Redux Store] Extension check:', {
  global: typeof global !== 'undefined' ? !!(global as any).__REDUX_DEVTOOLS_EXTENSION__ : false,
  window: typeof (window as any) !== 'undefined' ? !!(window as any).__REDUX_DEVTOOLS_EXTENSION__ : false,
});

// Configure store with DevTools / DevTools와 함께 store 설정
// Note: configureStore automatically includes redux-devtools-extension support in development / 참고: configureStore는 개발 환경에서 자동으로 redux-devtools-extension 지원을 포함합니다
// This is equivalent to using composeWithDevTools with createStore / 이것은 createStore와 함께 composeWithDevTools를 사용하는 것과 동일합니다
export const store = configureStore({
  reducer: {
    counter: counterReducer,
    todo: todoReducer,
    cart: cartReducer,
  },
  // DevTools are automatically enabled in development mode / DevTools는 개발 모드에서 자동으로 활성화됩니다
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;


