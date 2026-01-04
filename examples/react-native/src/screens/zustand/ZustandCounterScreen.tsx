// Zustand Counter Screen / Zustand 카운터 화면
import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import useCounterStore from '../../store/zustand/useCounterStore';

export default function ZustandCounterScreen() {
  const { value, increment, decrement, reset } = useCounterStore();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Zustand Counter</Text>
      <Text style={styles.count}>{value}</Text>
      <View style={styles.buttonContainer}>
        <Button title="Increment" onPress={increment} />
        <View style={styles.spacer} />
        <Button title="Decrement" onPress={decrement} />
        <View style={styles.spacer} />
        <Button title="Reset" onPress={reset} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  count: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
  },
  spacer: {
    height: 10,
  },
});


