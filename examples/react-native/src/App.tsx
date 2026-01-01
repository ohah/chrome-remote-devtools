/**
 * Chrome Remote DevTools React Native Example
 * @format
 */

import {
  StatusBar,
  StyleSheet,
  useColorScheme,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import ChromeRemoteDevToolsInspector from '@ohah/chrome-remote-devtools-react-native';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  // Connect to Chrome Remote DevTools server on app start / 앱 시작 시 Chrome Remote DevTools 서버에 연결
  useEffect(() => {
    // Debug: Check if module is available / 디버그: 모듈이 사용 가능한지 확인
    console.log('🔍 Checking ChromeRemoteDevToolsInspector module...');
    console.log('Module:', ChromeRemoteDevToolsInspector);

    // Connect to server / 서버에 연결
    // For iOS Simulator: use "localhost" / iOS 시뮬레이터: "localhost" 사용
    // For physical device: use your computer's IP address / 실제 기기: 컴퓨터의 IP 주소 사용
    console.log('🔌 Attempting to connect to localhost:8080...');
    ChromeRemoteDevToolsInspector.connect('localhost', 8080)
      .then((result) => {
        console.log('✅ Chrome Remote DevTools Inspector connected to localhost:8080');
        console.log('Connection result:', result);
      })
      .catch((error) => {
        console.error('❌ Failed to connect to Chrome Remote DevTools Inspector:', error);
        console.error('Error details:', {
          message: error?.message,
          stack: error?.stack,
          name: error?.name,
        });
      });
  }, []);

  // Run initial console tests / 초기 콘솔 테스트 실행
  useEffect(() => {
    setTimeout(() => {
      console.log('✅ React Native Native Inspector Ready');
      console.log('Platform:', Platform.OS, Platform.Version);
      console.log('Ready for debugging!');
    }, 1000);
  }, []);

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

  // Test network requests / 네트워크 요청 테스트
  const handleTestNetwork = async (type: 'get' | 'post' | 'put' | 'delete' | 'error') => {
    const timestamp = new Date().toISOString();

    try {
      switch (type) {
        case 'get':
          console.log(`[Network] GET request started at ${timestamp}`);
          const getResponse = await fetch('https://jsonplaceholder.typicode.com/posts/1', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          const getData = await getResponse.json();
          console.log('[Network] GET response:', getData);
          Alert.alert('Success', 'GET request completed');
          break;

        case 'post':
          console.log(`[Network] POST request started at ${timestamp}`);
          const postResponse = await fetch('https://jsonplaceholder.typicode.com/posts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: 'Test Post',
              body: 'This is a test POST request',
              userId: 1,
            }),
          });
          const postData = await postResponse.json();
          console.log('[Network] POST response:', postData);
          Alert.alert('Success', 'POST request completed');
          break;

        case 'put':
          console.log(`[Network] PUT request started at ${timestamp}`);
          const putResponse = await fetch('https://jsonplaceholder.typicode.com/posts/1', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: 1,
              title: 'Updated Test Post',
              body: 'This is an updated test PUT request',
              userId: 1,
            }),
          });
          const putData = await putResponse.json();
          console.log('[Network] PUT response:', putData);
          Alert.alert('Success', 'PUT request completed');
          break;

        case 'delete':
          console.log(`[Network] DELETE request started at ${timestamp}`);
          const deleteResponse = await fetch('https://jsonplaceholder.typicode.com/posts/1', {
            method: 'DELETE',
          });
          console.log('[Network] DELETE response status:', deleteResponse.status);
          Alert.alert('Success', 'DELETE request completed');
          break;

        case 'error':
          console.log(`[Network] Error request started at ${timestamp}`);
          try {
            await fetch('https://invalid-url-that-does-not-exist-12345.com/api', {
              method: 'GET',
            });
          } catch (error) {
            console.error('[Network] Request failed:', error);
            Alert.alert('Expected Error', 'Network error occurred (this is expected)');
          }
          break;
      }
    } catch (error) {
      console.error('[Network] Request error:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Network request failed');
    }
  };

  // Run all network tests / 모든 네트워크 테스트 실행
  const handleRunAllNetworkTests = async () => {
    console.log('=== Network Test Suite Started ===');

    // Test GET request / GET 요청 테스트
    try {
      console.log('[Network] Testing GET request...');
      const getResponse = await fetch('https://jsonplaceholder.typicode.com/posts/1');
      const getData = await getResponse.json();
      console.log('[Network] GET success:', getData);
    } catch (error) {
      console.error('[Network] GET failed:', error);
    }

    // Test POST request / POST 요청 테스트
    try {
      console.log('[Network] Testing POST request...');
      const postResponse = await fetch('https://jsonplaceholder.typicode.com/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Test Post',
          body: 'This is a test POST request from React Native',
          userId: 1,
        }),
      });
      const postData = await postResponse.json();
      console.log('[Network] POST success:', postData);
    } catch (error) {
      console.error('[Network] POST failed:', error);
    }

    // Test PUT request / PUT 요청 테스트
    try {
      console.log('[Network] Testing PUT request...');
      const putResponse = await fetch('https://jsonplaceholder.typicode.com/posts/1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: 1,
          title: 'Updated Post',
          body: 'This is an updated post',
          userId: 1,
        }),
      });
      const putData = await putResponse.json();
      console.log('[Network] PUT success:', putData);
    } catch (error) {
      console.error('[Network] PUT failed:', error);
    }

    // Test DELETE request / DELETE 요청 테스트
    try {
      console.log('[Network] Testing DELETE request...');
      const deleteResponse = await fetch('https://jsonplaceholder.typicode.com/posts/1', {
        method: 'DELETE',
      });
      console.log('[Network] DELETE success, status:', deleteResponse.status);
    } catch (error) {
      console.error('[Network] DELETE failed:', error);
    }

    // Test with custom headers / 커스텀 헤더로 테스트
    try {
      console.log('[Network] Testing request with custom headers...');
      const customResponse = await fetch('https://jsonplaceholder.typicode.com/posts/1', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Custom-Header': 'test-value',
          'Authorization': 'Bearer test-token',
        },
      });
      const customData = await customResponse.json();
      console.log('[Network] Custom headers success:', customData);
    } catch (error) {
      console.error('[Network] Custom headers failed:', error);
    }

    // Test error case / 에러 케이스 테스트
    try {
      console.log('[Network] Testing error case...');
      await fetch('https://invalid-url-that-does-not-exist-12345.com/api');
    } catch (error) {
      console.error('[Network] Expected error occurred:', error);
    }

    console.log('=== Network Test Suite Completed ===');
    Alert.alert('Complete', 'All network tests completed. Check console for details.');
  };

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <Text style={styles.title}>Chrome Remote DevTools</Text>
          <Text style={styles.subtitle}>React Native Native Inspector</Text>

          {/* Info / 정보 */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              Native Inspector is automatically connected.{'\n'}
              No JavaScript client initialization needed.
            </Text>
          </View>

          {/* Console Test Buttons / 콘솔 테스트 버튼 */}
          <View style={styles.consoleTestContainer}>
            <Text style={styles.consoleTestTitle}>Console Test / 콘솔 테스트</Text>
            <View style={styles.consoleButtonRow}>
              <TouchableOpacity
                style={[styles.consoleButton, styles.consoleLogButton]}
                onPress={() => handleTestConsole('log')}
              >
                <Text style={styles.consoleButtonText}>Log</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.consoleButton, styles.consoleErrorButton]}
                onPress={() => handleTestConsole('error')}
              >
                <Text style={styles.consoleButtonText}>Error</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.consoleButton, styles.consoleWarnButton]}
                onPress={() => handleTestConsole('warn')}
              >
                <Text style={styles.consoleButtonText}>Warn</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.consoleButtonRow}>
              <TouchableOpacity
                style={[styles.consoleButton, styles.consoleInfoButton]}
                onPress={() => handleTestConsole('info')}
              >
                <Text style={styles.consoleButtonText}>Info</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.consoleButton, styles.consoleDebugButton]}
                onPress={() => handleTestConsole('debug')}
              >
                <Text style={styles.consoleButtonText}>Debug</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.consoleButton, styles.consoleTestAllButton]}
              onPress={handleRunAllConsoleTests}
            >
              <Text style={styles.consoleButtonText}>Run All Tests</Text>
            </TouchableOpacity>
          </View>

          {/* Network Test Buttons / 네트워크 테스트 버튼 */}
          <View style={styles.networkTestContainer}>
            <Text style={styles.networkTestTitle}>Network Test / 네트워크 테스트</Text>
            <View style={styles.networkButtonRow}>
              <TouchableOpacity
                style={[styles.networkButton, styles.networkGetButton]}
                onPress={() => handleTestNetwork('get')}
              >
                <Text style={styles.networkButtonText}>GET</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.networkButton, styles.networkPostButton]}
                onPress={() => handleTestNetwork('post')}
              >
                <Text style={styles.networkButtonText}>POST</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.networkButton, styles.networkPutButton]}
                onPress={() => handleTestNetwork('put')}
              >
                <Text style={styles.networkButtonText}>PUT</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.networkButtonRow}>
              <TouchableOpacity
                style={[styles.networkButton, styles.networkDeleteButton]}
                onPress={() => handleTestNetwork('delete')}
              >
                <Text style={styles.networkButtonText}>DELETE</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.networkButton, styles.networkErrorButton]}
                onPress={() => handleTestNetwork('error')}
              >
                <Text style={styles.networkButtonText}>Error</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.networkButton, styles.networkTestAllButton]}
              onPress={handleRunAllNetworkTests}
            >
              <Text style={styles.networkButtonText}>Run All Network Tests</Text>
            </TouchableOpacity>
          </View>

          {/* Instructions / 사용 방법 */}
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>Instructions:</Text>
            <Text style={styles.instructionsText}>
              1. Start the Chrome Remote DevTools server:{'\n'}
              {'   '}bun run dev:server{'\n\n'}
              2. iOS: bundleURL in AppDelegate.swift is configured to use{'\n'}
              {'   '}localhost:8080 (change for physical devices){'\n\n'}
              3. Android: Native inspector uses Metro bundler host{'\n'}
              {'   '}(may need additional configuration){'\n\n'}
              4. Native Inspector will automatically connect{'\n\n'}
              5. Open Chrome Remote DevTools Inspector to view the session
            </Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    flexGrow: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000000',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 24,
    color: '#666666',
    textAlign: 'center',
  },
  infoContainer: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#1976D2',
  },
  instructionsContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#000000',
  },
  instructionsText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333333',
  },
  consoleTestContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  consoleTestTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#000000',
  },
  consoleButtonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  consoleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  consoleButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  consoleLogButton: {
    backgroundColor: '#2196F3',
  },
  consoleErrorButton: {
    backgroundColor: '#F44336',
  },
  consoleWarnButton: {
    backgroundColor: '#FF9800',
  },
  consoleInfoButton: {
    backgroundColor: '#00BCD4',
  },
  consoleDebugButton: {
    backgroundColor: '#9C27B0',
  },
  consoleTestAllButton: {
    backgroundColor: '#4CAF50',
    marginTop: 8,
  },
  networkTestContainer: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  networkTestTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#000000',
  },
  networkButtonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  networkButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  networkButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  networkGetButton: {
    backgroundColor: '#2196F3',
  },
  networkPostButton: {
    backgroundColor: '#4CAF50',
  },
  networkPutButton: {
    backgroundColor: '#FF9800',
  },
  networkDeleteButton: {
    backgroundColor: '#F44336',
  },
  networkErrorButton: {
    backgroundColor: '#9E9E9E',
  },
  networkTestAllButton: {
    backgroundColor: '#673AB7',
    marginTop: 8,
  },
});

export default App;
