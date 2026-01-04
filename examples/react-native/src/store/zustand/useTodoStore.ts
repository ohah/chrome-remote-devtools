// Todo store with Zustand / Zustand를 사용한 Todo store
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

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


