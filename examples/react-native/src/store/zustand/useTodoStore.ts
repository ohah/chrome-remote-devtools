// Todo store with Zustand / Zustand를 사용한 Todo store
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { setupReduxDevToolsExtension } from '@ohah/chrome-remote-devtools-react-native';

// Setup extension BEFORE creating store / store 생성 전에 extension 설정
declare const global: any;
if (typeof global !== 'undefined' && !(global as any).__REDUX_DEVTOOLS_EXTENSION__) {
  console.log('[Zustand TodoStore] Setting up extension in store file...');
  setupReduxDevToolsExtension('localhost', 8080);
}

// Also ensure window has it / window에도 설정
if (typeof (window as any) !== 'undefined' && !(window as any).__REDUX_DEVTOOLS_EXTENSION__) {
  const globalObj = typeof global !== 'undefined' ? global : {};
  (window as any).__REDUX_DEVTOOLS_EXTENSION__ = (globalObj as any).__REDUX_DEVTOOLS_EXTENSION__;
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

interface TodoState {
  todos: Todo[];
  addTodo: (text: string) => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
}

const useTodoStore = create<TodoState>()(
  devtools(
    (set) => ({
      todos: [],
      addTodo: (text: string) =>
        set(
          (state) => ({
            todos: [
              ...state.todos,
              {
                id: Date.now().toString(),
                text,
                completed: false,
              },
            ],
          }),
          undefined,
          'todo/addTodo'
        ),
      toggleTodo: (id: string) =>
        set(
          (state) => ({
            todos: state.todos.map((todo) =>
              todo.id === id ? { ...todo, completed: !todo.completed } : todo
            ),
          }),
          undefined,
          'todo/toggleTodo'
        ),
      deleteTodo: (id: string) =>
        set(
          (state) => ({
            todos: state.todos.filter((todo) => todo.id !== id),
          }),
          undefined,
          'todo/deleteTodo'
        ),
    }),
    { name: 'TodoStore' }
  )
);

export default useTodoStore;


