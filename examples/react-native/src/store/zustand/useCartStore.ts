// Cart store with Zustand / Zustand를 사용한 쇼핑 카트 store
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { setupReduxDevToolsExtension } from '@ohah/chrome-remote-devtools-react-native';

// Setup extension BEFORE creating store / store 생성 전에 extension 설정
declare const global: any;
if (typeof global !== 'undefined' && !(global as any).__REDUX_DEVTOOLS_EXTENSION__) {
  console.log('[Zustand CartStore] Setting up extension in store file...');
  setupReduxDevToolsExtension('localhost', 8080);
}

// Also ensure window has it / window에도 설정
if (typeof (window as any) !== 'undefined' && !(window as any).__REDUX_DEVTOOLS_EXTENSION__) {
  const globalObj = typeof global !== 'undefined' ? global : {};
  (window as any).__REDUX_DEVTOOLS_EXTENSION__ = (globalObj as any).__REDUX_DEVTOOLS_EXTENSION__;
}

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
      addItem: (name: string, price: number) =>
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
        ),
      increaseQuantity: (id: string) =>
        set(
          (state) => ({
            items: state.items.map((item) =>
              item.id === id ? { ...item, quantity: item.quantity + 1 } : item
            ),
          }),
          undefined,
          'cart/increaseQuantity'
        ),
      decreaseQuantity: (id: string) =>
        set(
          (state) => ({
            items: state.items.map((item) =>
              item.id === id && item.quantity > 1
                ? { ...item, quantity: item.quantity - 1 }
                : item
            ),
          }),
          undefined,
          'cart/decreaseQuantity'
        ),
      removeItem: (id: string) =>
        set(
          (state) => ({
            items: state.items.filter((item) => item.id !== id),
          }),
          undefined,
          'cart/removeItem'
        ),
      getTotal: () => {
        const state = get();
        return state.items.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        );
      },
    }),
    { name: 'CartStore' }
  )
);

export default useCartStore;


