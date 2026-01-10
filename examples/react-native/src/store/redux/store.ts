// Redux store configuration / Redux store 설정
// Using Chrome Remote DevTools middleware for reliable DevTools connection
// 안정적인 DevTools 연결을 위해 Chrome Remote DevTools 미들웨어 사용
import { configureStore } from '@reduxjs/toolkit';
import counterReducer from './slices/counterSlice';
import todoReducer from './slices/todoSlice';
import cartReducer from './slices/cartSlice';

export const store = configureStore({
  reducer: {
    counter: counterReducer,
    todo: todoReducer,
    cart: cartReducer,
  },
  devTools: true,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
