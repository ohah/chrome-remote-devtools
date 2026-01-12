// Cart store with Zustand / Zustand를 사용한 Cart store
// Using Chrome Remote DevTools middleware for reliable DevTools connection
// 안정적인 DevTools 연결을 위해 Chrome Remote DevTools 미들웨어 사용
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

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
        set((state) => ({
          items: [
            ...state.items,
            {
              id: Date.now().toString(),
              name,
              price,
              quantity: 1,
            },
          ],
        }));
      },
      increaseQuantity: (id: string) => {
        console.log('[Zustand CartStore] increaseQuantity() called:', id);
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, quantity: item.quantity + 1 } : item
          ),
        }));
      },
      decreaseQuantity: (id: string) => {
        console.log('[Zustand CartStore] decreaseQuantity() called:', id);
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id && item.quantity > 1 ? { ...item, quantity: item.quantity - 1 } : item
          ),
        }));
      },
      removeItem: (id: string) => {
        console.log('[Zustand CartStore] removeItem() called:', id);
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
      },
      getTotal: () => {
        const state = get();
        return state.items.reduce((total, item) => total + item.price * item.quantity, 0);
      },
    }),
    { name: 'CartStore', enabled: true }
  )
);

console.log('[Zustand CartStore] Store created successfully');

export default useCartStore;
