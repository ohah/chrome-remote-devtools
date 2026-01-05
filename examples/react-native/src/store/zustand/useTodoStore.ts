// Todo store with Zustand / Zustand를 사용한 Todo store
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

  console.log('[Zustand TodoStore] __REDUX_DEVTOOLS_EXTENSION__ check BEFORE store creation:', {
    exists: hasExtension,
    hasConnect,
    hasGlobal: typeof global !== 'undefined',
    hasWindow: typeof window !== 'undefined',
    extensionType: typeof extension,
    extensionKeys: extension ? Object.keys(extension) : [],
  });

  if (!hasExtension) {
    console.log('[Zustand TodoStore] Extension not found, initializing...');
    setupReduxDevToolsExtension('localhost', 8080);

    // Check again after initialization / 초기화 후 다시 확인
    const extensionAfter = globalObj.__REDUX_DEVTOOLS_EXTENSION__;
    console.log('[Zustand TodoStore] __REDUX_DEVTOOLS_EXTENSION__ check AFTER initialization:', {
      exists: !!extensionAfter,
      hasConnect: typeof extensionAfter?.connect === 'function',
    });
  }
};

checkExtensionBeforeStore();

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
      addTodo: (text: string) => {
        console.log('[Zustand TodoStore] addTodo() called:', text);
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
        );
      },
      toggleTodo: (id: string) => {
        console.log('[Zustand TodoStore] toggleTodo() called:', id);
        set(
          (state) => ({
            todos: state.todos.map((todo) =>
              todo.id === id ? { ...todo, completed: !todo.completed } : todo
            ),
          }),
          undefined,
          'todo/toggleTodo'
        );
      },
      deleteTodo: (id: string) => {
        console.log('[Zustand TodoStore] deleteTodo() called:', id);
        set(
          (state) => ({
            todos: state.todos.filter((todo) => todo.id !== id),
          }),
          undefined,
          'todo/deleteTodo'
        );
      },
    }),
    { name: 'TodoStore' }
  )
);

console.log('[Zustand TodoStore] Store created successfully');

export default useTodoStore;
