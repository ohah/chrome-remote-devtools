// Redux Counter Screen / Redux 카운터 화면
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { increment, decrement, reset } from '../../store/redux/slices/counterSlice';
import type { RootState } from '../../store/redux/store';

// Type declarations for React Native environment / React Native 환경용 타입 선언
declare const global: typeof globalThis;

export default function ReduxCounterScreen() {
  const count = useSelector((state: RootState) => state.counter.value);
  const dispatch = useDispatch();
  const [extensionInfo, setExtensionInfo] = useState<{
    exists: boolean;
    hasConnect: boolean;
    isFunction: boolean;
    hasCompose: boolean;
    timestamp: string;
  } | null>(null);

  // Check extension status / extension 상태 확인
  useEffect(() => {
    const checkExtension = () => {
      const globalObj =
        typeof global !== 'undefined'
          ? (global as any)
          : typeof window !== 'undefined'
            ? window
            : {};
      const extension = (globalObj as any).__REDUX_DEVTOOLS_EXTENSION__;
      const compose = (globalObj as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__;

      setExtensionInfo({
        exists: !!extension,
        hasConnect: typeof extension?.connect === 'function',
        isFunction: typeof extension === 'function',
        hasCompose: !!compose,
        timestamp: new Date().toISOString(),
      });
    };

    checkExtension();
    const interval = setInterval(checkExtension, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Redux Counter</Text>
      <Text style={styles.count}>{count}</Text>

      {/* Extension Status Display / Extension 상태 표시 */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusTitle}>Redux DevTools Extension Status</Text>
        {extensionInfo ? (
          <>
            <View style={[styles.statusRow, extensionInfo.exists && styles.statusSuccess]}>
              <Text style={styles.statusLabel}>Extension Exists:</Text>
              <Text style={styles.statusValue}>{extensionInfo.exists ? '✅ YES' : '❌ NO'}</Text>
            </View>
            <View style={[styles.statusRow, extensionInfo.hasConnect && styles.statusSuccess]}>
              <Text style={styles.statusLabel}>Has connect():</Text>
              <Text style={styles.statusValue}>
                {extensionInfo.hasConnect ? '✅ YES' : '❌ NO'}
              </Text>
            </View>
            <View style={[styles.statusRow, extensionInfo.isFunction && styles.statusSuccess]}>
              <Text style={styles.statusLabel}>Is Function:</Text>
              <Text style={styles.statusValue}>
                {extensionInfo.isFunction ? '✅ YES' : '❌ NO'}
              </Text>
            </View>
            <View style={[styles.statusRow, extensionInfo.hasCompose && styles.statusSuccess]}>
              <Text style={styles.statusLabel}>Has COMPOSE:</Text>
              <Text style={styles.statusValue}>
                {extensionInfo.hasCompose ? '✅ YES' : '❌ NO'}
              </Text>
            </View>
            <Text style={styles.statusTimestamp}>
              Last checked: {new Date(extensionInfo.timestamp).toLocaleTimeString()}
            </Text>
          </>
        ) : (
          <Text style={styles.statusLoading}>Checking...</Text>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={() => dispatch(increment())}>
          <Text style={styles.buttonText}>Increment</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => dispatch(decrement())}>
          <Text style={styles.buttonText}>Decrement</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => dispatch(reset())}>
          <Text style={styles.buttonText}>Reset</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  count: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  statusContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 4,
    backgroundColor: '#fff',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  statusSuccess: {
    borderColor: '#4caf50',
    backgroundColor: '#f1f8f4',
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusTimestamp: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  statusLoading: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    padding: 12,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
    gap: 10,
  },
  button: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
