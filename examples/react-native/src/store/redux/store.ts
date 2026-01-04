// Redux store configuration / Redux store 설정
// Note: Redux DevTools Extension is auto-initialized on import / 참고: Redux DevTools Extension은 import 시 자동 초기화됩니다
import '@ohah/chrome-remote-devtools-react-native';
import { configureStore } from '@reduxjs/toolkit';
import counterReducer from './slices/counterSlice';
import todoReducer from './slices/todoSlice';
import cartReducer from './slices/cartSlice';

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


