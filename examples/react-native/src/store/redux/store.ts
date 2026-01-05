// Redux store configuration / Redux store 설정
// Note: Redux DevTools Extension is auto-initialized on import / 참고: Redux DevTools Extension은 import 시 자동 초기화됩니다
import '@ohah/chrome-remote-devtools-react-native';
import { configureStore } from '@reduxjs/toolkit';
import counterReducer from './slices/counterSlice';
import todoReducer from './slices/todoSlice';
import cartReducer from './slices/cartSlice';

// Configure store with DevTools / DevTools와 함께 store 설정
// Enable DevTools explicitly for production builds / 프로덕션 빌드에서도 DevTools 명시적으로 활성화
export const store = configureStore({
  reducer: {
    counter: counterReducer,
    todo: todoReducer,
    cart: cartReducer,
  },
  devTools: true, // Enable DevTools in production / 프로덕션에서도 DevTools 활성화
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;


