// Redux Todo Screen / Redux Todo 화면
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { addTodo, toggleTodo, deleteTodo } from '../../store/redux/slices/todoSlice';
import type { RootState } from '../../store/redux/store';
import type { Todo } from '../../store/redux/slices/todoSlice';

// Random todo texts / 랜덤 Todo 텍스트
const TODO_TEXTS = [
  'Buy groceries',
  'Finish project',
  'Call mom',
  'Exercise',
  'Read a book',
  'Write code',
  'Learn React Native',
  'Clean the house',
  'Cook dinner',
  'Walk the dog',
  'Study TypeScript',
  'Review PRs',
  'Update documentation',
  'Fix bugs',
  'Plan vacation',
];

// Generate random todo / 랜덤 Todo 생성
const generateRandomTodo = () => {
  return TODO_TEXTS[Math.floor(Math.random() * TODO_TEXTS.length)];
};

export default function ReduxTodoScreen() {
  const todos = useSelector((state: RootState) => state.todo.todos);
  const dispatch = useDispatch();

  const handleAddTodo = () => {
    const text = generateRandomTodo();
    dispatch(addTodo(text));
  };

  const renderTodo = ({ item }: { item: Todo }) => (
    <View style={styles.todoItem}>
      <TouchableOpacity style={styles.todoContent} onPress={() => dispatch(toggleTodo(item.id))}>
        <Text style={[styles.todoText, item.completed && styles.completed]}>{item.text}</Text>
        <Text style={styles.todoStatus}>{item.completed ? '✓' : '○'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.deleteButton} onPress={() => dispatch(deleteTodo(item.id))}>
        <Text style={styles.deleteButtonText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.addButton} onPress={handleAddTodo}>
          <Text style={styles.addButtonText}>Add Random Todo</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={todos}
        renderItem={renderTodo}
        keyExtractor={(item) => item.id}
        style={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  buttonContainer: {
    marginBottom: 20,
  },
  list: {
    flex: 1,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
  },
  todoContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  todoText: {
    flex: 1,
    fontSize: 16,
  },
  completed: {
    textDecorationLine: 'line-through',
    color: '#888',
  },
  todoStatus: {
    fontSize: 20,
    marginLeft: 10,
  },
  addButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#ff4444',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
