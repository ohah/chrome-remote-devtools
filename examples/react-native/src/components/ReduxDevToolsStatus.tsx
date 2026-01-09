/**
 * Redux DevTools Extension Status Component / Redux DevTools Extension 상태 컴포넌트
 * @format
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import useCounterStore from '../store/zustand/useCounterStore';
import { useSelector, useDispatch } from 'react-redux';
import { increment } from '../store/redux/slices/counterSlice';

// Declare global type for Redux DevTools Extension / Redux DevTools Extension 전역 타입 선언
declare global {
  // eslint-disable-next-line no-var
  var __REDUX_DEVTOOLS_EXTENSION__: any;
  // eslint-disable-next-line no-var
  var __REDUX_DEVTOOLS_EXTENSION_JSI_INJECTED__: boolean;
  // eslint-disable-next-line no-var
  var __REDUX_DEVTOOLS_EXTENSION_COMPOSE__: any;
}

export const ReduxDevToolsStatus: React.FC = () => {
  const [extensionExists, setExtensionExists] = useState<boolean>(false);
  const [extensionType, setExtensionType] = useState<string>('Unknown');
  const [hasConnect, setHasConnect] = useState<boolean>(false);
  const [hasCompose, setHasCompose] = useState<boolean>(false);
  const [jsiInjected, setJsiInjected] = useState<boolean>(false);
  const [zustandConnected, setZustandConnected] = useState<boolean>(false);
  const [reduxConnected, setReduxConnected] = useState<boolean>(false);
  const [testActionCount, setTestActionCount] = useState<number>(0);

  // Zustand stores / Zustand 스토어
  const zustandCount = useCounterStore((state) => state.value);
  const zustandIncrement = useCounterStore((state) => state.increment);

  // Redux store / Redux 스토어
  const reduxCount = useSelector((state: any) => state.counter.value);
  const dispatch = useDispatch();

  // Check Redux DevTools Extension status / Redux DevTools Extension 상태 확인
  useEffect(() => {
    const checkExtension = () => {
      try {
        const extension = (globalThis as any).__REDUX_DEVTOOLS_EXTENSION__;
        const compose = (globalThis as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__;
        const injected = (globalThis as any).__REDUX_DEVTOOLS_EXTENSION_JSI_INJECTED__;

        setExtensionExists(typeof extension !== 'undefined');
        setJsiInjected(typeof injected === 'boolean' && injected);
        setHasCompose(typeof compose === 'function');

        if (extension) {
          setExtensionType(typeof extension === 'function' ? 'Function' : typeof extension);
          setHasConnect(
            typeof extension === 'object' &&
              extension !== null &&
              typeof extension.connect === 'function'
          );
        } else {
          setExtensionType('Not Found');
          setHasConnect(false);
        }
      } catch (error) {
        console.error(
          'Error checking Redux DevTools Extension / Redux DevTools Extension 확인 중 오류:',
          error
        );
        setExtensionExists(false);
      }
    };

    // Check immediately / 즉시 확인
    checkExtension();

    // Check periodically / 주기적으로 확인
    const interval = setInterval(checkExtension, 1000);

    return () => clearInterval(interval);
  }, []);

  // Test Zustand connection / Zustand 연결 테스트
  const testZustand = () => {
    try {
      zustandIncrement();
      setZustandConnected(true);
      setTestActionCount((prev) => prev + 1);
      setTimeout(() => setZustandConnected(false), 2000);
    } catch (error) {
      console.error('Zustand test failed / Zustand 테스트 실패:', error);
    }
  };

  // Test Redux connection / Redux 연결 테스트
  const testRedux = () => {
    try {
      dispatch(increment());
      setReduxConnected(true);
      setTestActionCount((prev) => prev + 1);
      setTimeout(() => setReduxConnected(false), 2000);
    } catch (error) {
      console.error('Redux test failed / Redux 테스트 실패:', error);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Redux DevTools Extension Status</Text>
        <Text style={styles.sectionSubtitle}>Redux DevTools Extension 상태</Text>

        <View style={styles.statusRow}>
          <Text style={styles.label}>Extension Exists:</Text>
          <View style={[styles.badge, extensionExists ? styles.badgeSuccess : styles.badgeError]}>
            <Text style={styles.badgeText}>{extensionExists ? 'Yes' : 'No'}</Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.label}>JSI Injected:</Text>
          <View style={[styles.badge, jsiInjected ? styles.badgeSuccess : styles.badgeError]}>
            <Text style={styles.badgeText}>{jsiInjected ? 'Yes' : 'No'}</Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.label}>Type:</Text>
          <Text style={styles.value}>{extensionType}</Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.label}>Has connect:</Text>
          <View style={[styles.badge, hasConnect ? styles.badgeSuccess : styles.badgeError]}>
            <Text style={styles.badgeText}>{hasConnect ? 'Yes' : 'No'}</Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.label}>Has COMPOSE:</Text>
          <View style={[styles.badge, hasCompose ? styles.badgeSuccess : styles.badgeError]}>
            <Text style={styles.badgeText}>{hasCompose ? 'Yes' : 'No'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Store Connection Tests</Text>
        <Text style={styles.sectionSubtitle}>스토어 연결 테스트</Text>

        <View style={styles.testRow}>
          <View style={styles.testInfo}>
            <Text style={styles.testLabel}>Zustand Counter:</Text>
            <Text style={styles.testValue}>{zustandCount}</Text>
          </View>
          <TouchableOpacity
            style={[styles.testButton, zustandConnected && styles.testButtonActive]}
            onPress={testZustand}
          >
            <Text style={styles.testButtonText}>Test</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.testRow}>
          <View style={styles.testInfo}>
            <Text style={styles.testLabel}>Redux Counter:</Text>
            <Text style={styles.testValue}>{reduxCount}</Text>
          </View>
          <TouchableOpacity
            style={[styles.testButton, reduxConnected && styles.testButtonActive]}
            onPress={testRedux}
          >
            <Text style={styles.testButtonText}>Test</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.label}>Test Actions:</Text>
          <Text style={styles.value}>{testActionCount}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Instructions</Text>
        <Text style={styles.sectionSubtitle}>사용 방법</Text>
        <Text style={styles.instructionText}>
          1. Redux DevTools Extension이 설치되어 있어야 합니다{'\n'}
          2. "Test" 버튼을 눌러 Zustand/Redux 액션을 테스트하세요{'\n'}
          3. Chrome Remote DevTools Inspector에서 Redux 탭을 확인하세요{'\n'}
          4. 액션과 상태 변화가 실시간으로 표시됩니다
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  label: {
    fontSize: 14,
    color: '#424242',
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#212121',
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 50,
    alignItems: 'center',
  },
  badgeSuccess: {
    backgroundColor: '#4CAF50',
  },
  badgeError: {
    backgroundColor: '#F44336',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  testRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  testInfo: {
    flex: 1,
  },
  testLabel: {
    fontSize: 14,
    color: '#424242',
    marginBottom: 4,
  },
  testValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  testButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: '#2196F3',
    minWidth: 80,
    alignItems: 'center',
  },
  testButtonActive: {
    backgroundColor: '#4CAF50',
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  instructionText: {
    fontSize: 14,
    color: '#616161',
    lineHeight: 20,
  },
});
