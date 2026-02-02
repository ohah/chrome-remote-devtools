/**
 * Console test tab component / 콘솔 테스트 탭 컴포넌트
 * @format
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';

export const ConsoleTestTab: React.FC = () => {
  // Test console methods / 콘솔 메서드 테스트
  const handleTestConsole = (type: 'log' | 'error' | 'warn' | 'info' | 'debug') => {
    const timestamp = new Date().toLocaleTimeString();
    const message = `Test ${type} message at ${timestamp}`;

    switch (type) {
      case 'log':
        console.log('📝 Log:', message, { count: 1, status: 'ok' });
        break;
      case 'error':
        console.error('❌ Error:', message, new Error('Test error'));
        break;
      case 'warn':
        console.warn('⚠️ Warning:', message, { warning: true });
        break;
      case 'info':
        console.info('ℹ️ Info:', message, { info: 'test' });
        break;
      case 'debug':
        console.debug('🐛 Debug:', message, { debug: true });
        break;
    }
  };

  // Run comprehensive console tests / 포괄적인 콘솔 테스트 실행
  const handleRunAllConsoleTests = () => {
    console.log('=== Console Test Suite Started ===');
    console.log('Basic log message', { timestamp: new Date().toISOString() });
    console.log('Multiple arguments:', 'string', 123, true, null, undefined, { obj: 'value' });

    console.info('Info message with details', {
      platform: Platform.OS,
      version: Platform.Version,
    });

    console.warn('Warning message', 'This is a test warning');

    console.error('Error message', new Error('Test error with stack trace'));

    console.debug('Debug message', { debug: true, level: 'verbose' });

    // Test with different data types / 다양한 데이터 타입 테스트
    console.log('Array test:', [1, 2, 3, 'four', { five: 5 }]);
    console.log('Object test:', { nested: { deep: { value: 'test' } } });
    console.log('Date test:', new Date());
    console.log('RegExp test:', /test-pattern/gi);

    // Test console methods with complex objects / 복잡한 객체로 콘솔 메서드 테스트
    console.log('Complex object:', {
      user: {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        preferences: {
          theme: 'dark',
          notifications: true,
        },
      },
      metadata: {
        createdAt: new Date(),
        tags: ['test', 'console', 'devtools'],
      },
    });

    console.error('Error with context', new Error('Something went wrong'), {
      context: {
        userId: 123,
        action: 'test',
        timestamp: Date.now(),
      },
    });

    console.warn('Warning with data', {
      warningType: 'deprecation',
      message: 'This feature will be removed in future versions',
      alternative: 'Use new API instead',
    });

    console.log('=== Console Test Suite Completed ===');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Console Test / 콘솔 테스트</Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.logButton]}
          onPress={() => handleTestConsole('log')}
        >
          <Text style={styles.buttonText}>Log</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.errorButton]}
          onPress={() => handleTestConsole('error')}
        >
          <Text style={styles.buttonText}>Error</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.warnButton]}
          onPress={() => handleTestConsole('warn')}
        >
          <Text style={styles.buttonText}>Warn</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.infoButton]}
          onPress={() => handleTestConsole('info')}
        >
          <Text style={styles.buttonText}>Info</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.debugButton]}
          onPress={() => handleTestConsole('debug')}
        >
          <Text style={styles.buttonText}>Debug</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.greenButtonWrap}>
        <TouchableOpacity
          style={[styles.button, styles.testAllButton]}
          onPress={handleRunAllConsoleTests}
          accessibilityLabel="Run All Console Tests"
          accessibilityRole="button"
          activeOpacity={0.8}
        >
          <Text style={styles.greenButtonText} numberOfLines={1}>
            Run All Console Tests
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  /** Fill screen; content at top, rest is grey area / 화면 꽉 채움; 상단에 콘텐츠, 나머지는 회색 영역 */
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#000000',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  /** Green button text: ensure visible on all devices / 초록 버튼 텍스트: 모든 기기에서 보이도록 */
  greenButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: 'transparent',
  },
  logButton: {
    backgroundColor: '#2196F3',
  },
  errorButton: {
    backgroundColor: '#F44336',
  },
  warnButton: {
    backgroundColor: '#FF9800',
  },
  infoButton: {
    backgroundColor: '#00BCD4',
  },
  debugButton: {
    backgroundColor: '#9C27B0',
  },
  /** Wrapper so green button does not expand with flex:1 and text stays visible / 초록 버튼이 flex:1로 늘어나지 않도록 래퍼 */
  greenButtonWrap: {
    marginTop: 8,
    alignSelf: 'stretch',
  },
  testAllButton: {
    backgroundColor: '#4CAF50',
    minHeight: 44,
    paddingVertical: 12,
    flex: 0,
  },
});
