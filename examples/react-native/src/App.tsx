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
  Platform,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import ChromeRemoteDevToolsInspector from '@ohah/chrome-remote-devtools-react-native';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [fetchStatus, setFetchStatus] = useState<{
    method: string;
    status: 'success' | 'error' | null;
  }>({ method: '', status: null });
  const [xhrStatus, setXhrStatus] = useState<{
    method: string;
    status: 'success' | 'error' | null;
  }>({ method: '', status: null });

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

  // Test network requests with fetch / fetch를 사용한 네트워크 요청 테스트
  const handleTestNetwork = async (type: 'get' | 'post' | 'put' | 'delete' | 'error') => {
    setFetchStatus({ method: type.toUpperCase(), status: null });

    try {
      switch (type) {
        case 'get':
          const getResponse = await fetch('https://jsonplaceholder.typicode.com/posts/1', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          await getResponse.json();
          setFetchStatus({ method: 'GET', status: 'success' });
          break;

        case 'post':
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
          await postResponse.json();
          setFetchStatus({ method: 'POST', status: 'success' });
          break;

        case 'put':
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
          await putResponse.json();
          setFetchStatus({ method: 'PUT', status: 'success' });
          break;

        case 'delete':
          const deleteResponse = await fetch('https://jsonplaceholder.typicode.com/posts/1', {
            method: 'DELETE',
          });
          if (deleteResponse.ok) {
            setFetchStatus({ method: 'DELETE', status: 'success' });
          } else {
            setFetchStatus({ method: 'DELETE', status: 'error' });
          }
          break;

        case 'error':
          try {
            await fetch('https://invalid-url-that-does-not-exist-12345.com/api', {
              method: 'GET',
            });
          } catch {
            setFetchStatus({ method: 'GET', status: 'error' });
          }
          break;
      }
    } catch {
      setFetchStatus({ method: type.toUpperCase(), status: 'error' });
    }
  };

  // Test network requests with XHR / XHR를 사용한 네트워크 요청 테스트
  const handleTestXHR = (type: 'get' | 'post' | 'put' | 'delete' | 'error') => {
    setXhrStatus({ method: type.toUpperCase(), status: null });

    const xhr = new XMLHttpRequest();
    const url = 'https://jsonplaceholder.typicode.com/posts';

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setXhrStatus({ method: type.toUpperCase(), status: 'success' });
      } else {
        setXhrStatus({ method: type.toUpperCase(), status: 'error' });
      }
    };

    xhr.onerror = () => {
      setXhrStatus({ method: type.toUpperCase(), status: 'error' });
    };

    xhr.ontimeout = () => {
      setXhrStatus({ method: type.toUpperCase(), status: 'error' });
    };

    switch (type) {
      case 'get':
        xhr.open('GET', `${url}/1`, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send();
        break;

      case 'post':
        xhr.open('POST', url, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(
          JSON.stringify({
            title: 'Test Post',
            body: 'This is a test POST request with XHR',
            userId: 1,
          })
        );
        break;

      case 'put':
        xhr.open('PUT', `${url}/1`, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(
          JSON.stringify({
            id: 1,
            title: 'Updated Test Post',
            body: 'This is an updated test PUT request with XHR',
            userId: 1,
          })
        );
        break;

      case 'delete':
        xhr.open('DELETE', `${url}/1`, true);
        xhr.send();
        break;

      case 'error':
        xhr.open('GET', 'https://invalid-url-that-does-not-exist-12345.com/api', true);
        xhr.send();
        break;
    }
  };

  // Run all network tests / 모든 네트워크 테스트 실행
  const handleRunAllNetworkTests = async () => {
    setFetchStatus({ method: 'ALL', status: null });

    // Test GET request / GET 요청 테스트
    try {
      const getResponse = await fetch('https://jsonplaceholder.typicode.com/posts/1');
      await getResponse.json();
    } catch {
      // Ignore errors in batch test / 배치 테스트에서는 에러 무시
    }

    // Test POST request / POST 요청 테스트
    try {
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
      await postResponse.json();
    } catch {
      // Ignore errors in batch test / 배치 테스트에서는 에러 무시
    }

    // Test PUT request / PUT 요청 테스트
    try {
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
      await putResponse.json();
    } catch {
      // Ignore errors in batch test / 배치 테스트에서는 에러 무시
    }

    // Test DELETE request / DELETE 요청 테스트
    try {
      await fetch('https://jsonplaceholder.typicode.com/posts/1', {
        method: 'DELETE',
      });
    } catch {
      // Ignore errors in batch test / 배치 테스트에서는 에러 무시
    }

    setFetchStatus({ method: 'ALL', status: 'success' });
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

          {/* Network Test Buttons (Fetch) / 네트워크 테스트 버튼 (Fetch) */}
          <View style={styles.networkTestContainer}>
            <Text style={styles.networkTestTitle}>
              Network Test (Fetch) / 네트워크 테스트 (Fetch)
            </Text>
            {/* Fetch Status / Fetch 상태 */}
            <View
              style={[
                styles.networkStatusContainer,
                fetchStatus.status === 'success'
                  ? styles.networkStatusSuccess
                  : fetchStatus.status === 'error'
                    ? styles.networkStatusError
                    : styles.networkStatusEmpty,
              ]}
            >
              <Text style={styles.networkStatusText}>
                {fetchStatus.status
                  ? `FETCH ${fetchStatus.method}: ${
                      fetchStatus.status === 'success' ? 'Success' : 'Failed'
                    }`
                  : ''}
              </Text>
            </View>
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

          {/* Network Test Buttons (XHR) / 네트워크 테스트 버튼 (XHR) */}
          <View style={styles.networkTestContainer}>
            <Text style={styles.networkTestTitle}>Network Test (XHR) / 네트워크 테스트 (XHR)</Text>
            {/* XHR Status / XHR 상태 */}
            <View
              style={[
                styles.networkStatusContainer,
                xhrStatus.status === 'success'
                  ? styles.networkStatusSuccess
                  : xhrStatus.status === 'error'
                    ? styles.networkStatusError
                    : styles.networkStatusEmpty,
              ]}
            >
              <Text style={styles.networkStatusText}>
                {xhrStatus.status
                  ? `XHR ${xhrStatus.method}: ${
                      xhrStatus.status === 'success' ? 'Success' : 'Failed'
                    }`
                  : ''}
              </Text>
            </View>
            <View style={styles.networkButtonRow}>
              <TouchableOpacity
                style={[styles.networkButton, styles.networkGetButton]}
                onPress={() => handleTestXHR('get')}
              >
                <Text style={styles.networkButtonText}>GET</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.networkButton, styles.networkPostButton]}
                onPress={() => handleTestXHR('post')}
              >
                <Text style={styles.networkButtonText}>POST</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.networkButton, styles.networkPutButton]}
                onPress={() => handleTestXHR('put')}
              >
                <Text style={styles.networkButtonText}>PUT</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.networkButtonRow}>
              <TouchableOpacity
                style={[styles.networkButton, styles.networkDeleteButton]}
                onPress={() => handleTestXHR('delete')}
              >
                <Text style={styles.networkButtonText}>DELETE</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.networkButton, styles.networkErrorButton]}
                onPress={() => handleTestXHR('error')}
              >
                <Text style={styles.networkButtonText}>Error</Text>
              </TouchableOpacity>
            </View>
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
  networkStatusContainer: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    marginTop: 8,
  },
  networkStatusSuccess: {
    backgroundColor: '#C8E6C9',
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  networkStatusError: {
    backgroundColor: '#FFCDD2',
    borderColor: '#F44336',
    borderWidth: 1,
  },
  networkStatusEmpty: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    minHeight: 44,
  },
  networkStatusText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    color: '#000000',
  },
});

export default App;
