// Zustand Todo Screen / Zustand Todo 화면
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import useTodoStore from '../../store/zustand/useTodoStore';
import type { Todo } from '../../store/zustand/useTodoStore';

export default function ZustandTodoScreen() {
  const { todos, addTodo, toggleTodo, deleteTodo } = useTodoStore();
  const [text, setText] = useState('');

  const handleAddTodo = () => {
    if (text.trim()) {
      addTodo(text);
      setText('');
    }
  };

  const renderTodo = ({ item }: { item: Todo }) => (
    <View style={styles.todoItem}>
      <TouchableOpacity
        style={styles.todoContent}
        onPress={() => toggleTodo(item.id)}
      >
        <Text style={[styles.todoText, item.completed && styles.completed]}>
          {item.text}
        </Text>
        <Text style={styles.todoStatus}>
          {item.completed ? '✓' : '○'}
        </Text>
      </TouchableOpacity>
      <Button
        title="Delete"
        onPress={() => deleteTodo(item.id)}
        color="#ff4444"
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Zustand Todo List</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Enter todo..."
          onSubmitEditing={handleAddTodo}
        />
        <Button title="Add" onPress={handleAddTodo} />
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
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
});


