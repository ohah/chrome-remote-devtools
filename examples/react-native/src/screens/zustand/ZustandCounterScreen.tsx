// Zustand Counter Screen / Zustand 카운터 화면
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import useCounterStore from '../../store/zustand/useCounterStore';
import { getExtensionStatus } from '@ohah/chrome-remote-devtools-react-native';

// Type declarations for React Native environment / React Native 환경용 타입 선언
declare const global: typeof globalThis;

export default function ZustandCounterScreen() {
  const { value, increment, decrement, reset } = useCounterStore();
  const [extensionInfo, setExtensionInfo] = useState<ReturnType<typeof getExtensionStatus> | null>(
    null
  );

  // Check extension status / extension 상태 확인
  useEffect(() => {
    const checkExtension = () => {
      const status = getExtensionStatus('CounterStore');
      setExtensionInfo(status);
    };

    checkExtension();
    const interval = setInterval(checkExtension, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Zustand Counter</Text>
      <Text style={styles.count}>{value}</Text>

      {/* Extension Status Display / Extension 상태 표시 */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusTitle}>Zustand DevTools Extension Status</Text>
        {extensionInfo ? (
          <>
            <View style={[styles.statusRow, extensionInfo.extensionExists && styles.statusSuccess]}>
              <Text style={styles.statusLabel}>Extension Exists:</Text>
              <Text style={styles.statusValue}>
                {extensionInfo.extensionExists ? '✅ YES' : '❌ NO'}
              </Text>
            </View>
            <View style={[styles.statusRow, extensionInfo.hasConnect && styles.statusSuccess]}>
              <Text style={styles.statusLabel}>Has connect():</Text>
              <Text style={styles.statusValue}>
                {extensionInfo.hasConnect ? '✅ YES' : '❌ NO'}
              </Text>
            </View>
            <View
              style={[
                styles.statusRow,
                extensionInfo.windowExtensionExists && styles.statusSuccess,
              ]}
            >
              <Text style={styles.statusLabel}>Window Extension:</Text>
              <Text style={styles.statusValue}>
                {extensionInfo.windowExtensionExists ? '✅ YES' : '❌ NO'}
              </Text>
            </View>
            <View
              style={[styles.statusRow, extensionInfo.windowHasConnect && styles.statusSuccess]}
            >
              <Text style={styles.statusLabel}>Window Has connect():</Text>
              <Text style={styles.statusValue}>
                {extensionInfo.windowHasConnect ? '✅ YES' : '❌ NO'}
              </Text>
            </View>
            <View
              style={[styles.statusRow, extensionInfo.zustandCanDetect && styles.statusSuccess]}
            >
              <Text style={styles.statusLabel}>Zustand Can Detect:</Text>
              <Text style={styles.statusValue}>
                {extensionInfo.zustandCanDetect ? '✅ YES' : '❌ NO'}
              </Text>
            </View>
            <View style={[styles.statusRow, extensionInfo.connectCalled && styles.statusSuccess]}>
              <Text style={styles.statusLabel}>connect() Called:</Text>
              <Text style={styles.statusValue}>
                {extensionInfo.connectCalled ? '✅ YES' : '❌ NO'}
              </Text>
            </View>
            {extensionInfo.connectInfo && (
              <>
                <View
                  style={[
                    styles.statusRow,
                    extensionInfo.connectInfo.initCalled && styles.statusSuccess,
                  ]}
                >
                  <Text style={styles.statusLabel}>init() Called:</Text>
                  <Text style={styles.statusValue}>
                    {extensionInfo.connectInfo.initCalled ? '✅ YES' : '❌ NO'}
                  </Text>
                </View>
                {extensionInfo.connectInfo.initCalled &&
                  extensionInfo.connectInfo.initTimestamp && (
                    <Text style={styles.statusTimestamp}>
                      init() called at:{' '}
                      {new Date(extensionInfo.connectInfo.initTimestamp).toLocaleTimeString()}
                    </Text>
                  )}
                {extensionInfo.connectInfo.timestamp && (
                  <Text style={styles.statusTimestamp}>
                    connect() called at:{' '}
                    {new Date(extensionInfo.connectInfo.timestamp).toLocaleTimeString()}
                  </Text>
                )}
              </>
            )}
            <Text style={styles.statusTimestamp}>
              Last checked: {new Date().toLocaleTimeString()}
            </Text>
          </>
        ) : (
          <Text style={styles.statusLoading}>Checking...</Text>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={increment}>
          <Text style={styles.buttonText}>Increment</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={decrement}>
          <Text style={styles.buttonText}>Decrement</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={reset}>
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
    marginTop: 4,
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
