// Cart store with Zustand / Zustand를 사용한 쇼핑 카트 store
// Note: Redux DevTools Extension is auto-initialized on import / 참고: Redux DevTools Extension은 import 시 자동 초기화됩니다
import '@ohah/chrome-remote-devtools-react-native';
import { checkExtensionBeforeStore } from '@ohah/chrome-remote-devtools-react-native';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// Check extension before store creation / store 생성 전에 extension 확인
checkExtensionBeforeStore('localhost', 8080, 'CartStore');

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (name: string, price: number) => void;
  increaseQuantity: (id: string) => void;
  decreaseQuantity: (id: string) => void;
  removeItem: (id: string) => void;
  getTotal: () => number;
}

const useCartStore = create<CartState>()(
  devtools(
    (set, get) => ({
      items: [],
      addItem: (name: string, price: number) => {
        console.log('[Zustand CartStore] addItem() called:', { name, price });
        set(
          (state) => ({
            items: [
              ...state.items,
              {
                id: Date.now().toString(),
                name,
                price,
                quantity: 1,
              },
            ],
          }),
          undefined,
          'cart/addItem'
        );
      },
      increaseQuantity: (id: string) => {
        console.log('[Zustand CartStore] increaseQuantity() called:', id);
        set(
          (state) => ({
            items: state.items.map((item) =>
              item.id === id ? { ...item, quantity: item.quantity + 1 } : item
            ),
          }),
          undefined,
          'cart/increaseQuantity'
        );
      },
      decreaseQuantity: (id: string) => {
        console.log('[Zustand CartStore] decreaseQuantity() called:', id);
        set(
          (state) => ({
            items: state.items.map((item) =>
              item.id === id && item.quantity > 1 ? { ...item, quantity: item.quantity - 1 } : item
            ),
          }),
          undefined,
          'cart/decreaseQuantity'
        );
      },
      removeItem: (id: string) => {
        console.log('[Zustand CartStore] removeItem() called:', id);
        set(
          (state) => ({
            items: state.items.filter((item) => item.id !== id),
          }),
          undefined,
          'cart/removeItem'
        );
      },
      getTotal: () => {
        const state = get();
        return state.items.reduce((total, item) => total + item.price * item.quantity, 0);
      },
    }),
    { name: 'CartStore' }
  )
);

console.log('[Zustand CartStore] Store created successfully');

export default useCartStore;
