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
  TextInput,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import ChromeRemoteDevToolsInspector from '@ohah/chrome-remote-devtools-react-native';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [fetchStatus, setFetchStatus] = useState<{
    method: string;
    status: 'success' | 'error' | null;
    request?: {
      url: string;
      method: string;
      headers: Record<string, string>;
      body?: string;
    };
    response?: {
      status: number;
      statusText: string;
      headers: Record<string, string>;
      body?: any;
    };
  }>({ method: '', status: null });
  const [xhrStatus, setXhrStatus] = useState<{
    method: string;
    status: 'success' | 'error' | null;
    request?: {
      url: string;
      method: string;
      headers: Record<string, string>;
      body?: string;
    };
    response?: {
      status: number;
      statusText: string;
      headers: Record<string, string>;
      body?: any;
    };
  }>({ method: '', status: null });
  const [consoleHookEnabled, setConsoleHookEnabled] = useState<boolean>(true);
  const [networkHookEnabled, setNetworkHookEnabled] = useState<boolean>(true);

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
      .then((result: unknown) => {
        console.log('✅ Chrome Remote DevTools Inspector connected to localhost:8080');
        console.log('Connection result:', result);
      })
      .catch((error: unknown) => {
        console.error('❌ Failed to connect to Chrome Remote DevTools Inspector:', error);
        console.error('Error details:', {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          name: error instanceof Error ? error.name : undefined,
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
        case 'get': {
          const getUrl = 'https://jsonplaceholder.typicode.com/posts/1';
          const getHeaders = {
            'Content-Type': 'application/json',
          };
          const getResponse = await fetch(getUrl, {
            method: 'GET',
            headers: getHeaders,
          });
          const getBody = await getResponse.json();
          const getResponseHeaders: Record<string, string> = {};
          getResponse.headers.forEach((value, key) => {
            getResponseHeaders[key] = value;
          });
          setFetchStatus({
            method: 'GET',
            status: 'success',
            request: {
              url: getUrl,
              method: 'GET',
              headers: getHeaders,
            },
            response: {
              status: getResponse.status,
              statusText: getResponse.statusText,
              headers: getResponseHeaders,
              body: getBody,
            },
          });
          break;
        }

        case 'post': {
          const postUrl = 'https://jsonplaceholder.typicode.com/posts';
          const postHeaders = {
            'Content-Type': 'application/json',
          };
          const postBody = {
            title: 'Test Post',
            body: 'This is a test POST request',
            userId: 1,
          };
          const postResponse = await fetch(postUrl, {
            method: 'POST',
            headers: postHeaders,
            body: JSON.stringify(postBody),
          });
          const postResponseBody = await postResponse.json();
          const postResponseHeaders: Record<string, string> = {};
          postResponse.headers.forEach((value, key) => {
            postResponseHeaders[key] = value;
          });
          setFetchStatus({
            method: 'POST',
            status: 'success',
            request: {
              url: postUrl,
              method: 'POST',
              headers: postHeaders,
              body: JSON.stringify(postBody, null, 2),
            },
            response: {
              status: postResponse.status,
              statusText: postResponse.statusText,
              headers: postResponseHeaders,
              body: postResponseBody,
            },
          });
          break;
        }

        case 'put': {
          const putUrl = 'https://jsonplaceholder.typicode.com/posts/1';
          const putHeaders = {
            'Content-Type': 'application/json',
          };
          const putBody = {
            id: 1,
            title: 'Updated Test Post',
            body: 'This is an updated test PUT request',
            userId: 1,
          };
          const putResponse = await fetch(putUrl, {
            method: 'PUT',
            headers: putHeaders,
            body: JSON.stringify(putBody),
          });
          const putResponseBody = await putResponse.json();
          const putResponseHeaders: Record<string, string> = {};
          putResponse.headers.forEach((value, key) => {
            putResponseHeaders[key] = value;
          });
          setFetchStatus({
            method: 'PUT',
            status: 'success',
            request: {
              url: putUrl,
              method: 'PUT',
              headers: putHeaders,
              body: JSON.stringify(putBody, null, 2),
            },
            response: {
              status: putResponse.status,
              statusText: putResponse.statusText,
              headers: putResponseHeaders,
              body: putResponseBody,
            },
          });
          break;
        }

        case 'delete': {
          const deleteUrl = 'https://jsonplaceholder.typicode.com/posts/1';
          const deleteResponse = await fetch(deleteUrl, {
            method: 'DELETE',
          });
          const deleteResponseHeaders: Record<string, string> = {};
          deleteResponse.headers.forEach((value, key) => {
            deleteResponseHeaders[key] = value;
          });
          if (deleteResponse.ok) {
            setFetchStatus({
              method: 'DELETE',
              status: 'success',
              request: {
                url: deleteUrl,
                method: 'DELETE',
                headers: {},
              },
              response: {
                status: deleteResponse.status,
                statusText: deleteResponse.statusText,
                headers: deleteResponseHeaders,
              },
            });
          } else {
            setFetchStatus({
              method: 'DELETE',
              status: 'error',
              request: {
                url: deleteUrl,
                method: 'DELETE',
                headers: {},
              },
              response: {
                status: deleteResponse.status,
                statusText: deleteResponse.statusText,
                headers: deleteResponseHeaders,
              },
            });
          }
          break;
        }

        case 'error': {
          const errorUrl = 'https://invalid-url-that-does-not-exist-12345.com/api';
          try {
            await fetch(errorUrl, {
              method: 'GET',
            });
          } catch (error) {
            setFetchStatus({
              method: 'GET',
              status: 'error',
              request: {
                url: errorUrl,
                method: 'GET',
                headers: {},
              },
              response: {
                status: 0,
                statusText: error instanceof Error ? error.message : 'Network error',
                headers: {},
              },
            });
          }
          break;
        }
      }
    } catch (error) {
      setFetchStatus({
        method: type.toUpperCase(),
        status: 'error',
        request: {
          url: '',
          method: type.toUpperCase(),
          headers: {},
        },
        response: {
          status: 0,
          statusText: error instanceof Error ? error.message : 'Unknown error',
          headers: {},
        },
      });
    }
  };

  // Test network requests with XHR / XHR를 사용한 네트워크 요청 테스트
  const handleTestXHR = (type: 'get' | 'post' | 'put' | 'delete' | 'error') => {
    setXhrStatus({ method: type.toUpperCase(), status: null });

    const xhr = new XMLHttpRequest();
    const baseUrl = 'https://jsonplaceholder.typicode.com/posts';
    let requestUrl = '';
    let requestMethod = '';
    let requestHeaders: Record<string, string> = {};
    let requestBody: string | undefined;

    xhr.onload = () => {
      const responseHeaders: Record<string, string> = {};
      const allHeaders = xhr.getAllResponseHeaders();
      if (allHeaders) {
        allHeaders.split('\r\n').forEach((line) => {
          const parts = line.split(': ');
          if (parts.length === 2) {
            responseHeaders[parts[0]] = parts[1];
          }
        });
      }

      let responseBody: any;
      try {
        responseBody = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        responseBody = xhr.responseText;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        setXhrStatus({
          method: type.toUpperCase(),
          status: 'success',
          request: {
            url: requestUrl,
            method: requestMethod,
            headers: requestHeaders,
            body: requestBody,
          },
          response: {
            status: xhr.status,
            statusText: xhr.statusText,
            headers: responseHeaders,
            body: responseBody,
          },
        });
      } else {
        setXhrStatus({
          method: type.toUpperCase(),
          status: 'error',
          request: {
            url: requestUrl,
            method: requestMethod,
            headers: requestHeaders,
            body: requestBody,
          },
          response: {
            status: xhr.status,
            statusText: xhr.statusText,
            headers: responseHeaders,
            body: responseBody,
          },
        });
      }
    };

    xhr.onerror = () => {
      setXhrStatus({
        method: type.toUpperCase(),
        status: 'error',
        request: {
          url: requestUrl,
          method: requestMethod,
          headers: requestHeaders,
          body: requestBody,
        },
        response: {
          status: 0,
          statusText: 'Network error',
          headers: {},
        },
      });
    };

    xhr.ontimeout = () => {
      setXhrStatus({
        method: type.toUpperCase(),
        status: 'error',
        request: {
          url: requestUrl,
          method: requestMethod,
          headers: requestHeaders,
          body: requestBody,
        },
        response: {
          status: 0,
          statusText: 'Request timeout',
          headers: {},
        },
      });
    };

    switch (type) {
      case 'get':
        requestUrl = `${baseUrl}/1`;
        requestMethod = 'GET';
        requestHeaders = { 'Content-Type': 'application/json' };
        xhr.open('GET', requestUrl, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send();
        break;

      case 'post': {
        requestUrl = baseUrl;
        requestMethod = 'POST';
        requestHeaders = { 'Content-Type': 'application/json' };
        const postBody = {
          title: 'Test Post',
          body: 'This is a test POST request with XHR',
          userId: 1,
        };
        requestBody = JSON.stringify(postBody, null, 2);
        xhr.open('POST', requestUrl, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify(postBody));
        break;
      }

      case 'put': {
        requestUrl = `${baseUrl}/1`;
        requestMethod = 'PUT';
        requestHeaders = { 'Content-Type': 'application/json' };
        const putBody = {
          id: 1,
          title: 'Updated Test Post',
          body: 'This is an updated test PUT request with XHR',
          userId: 1,
        };
        requestBody = JSON.stringify(putBody, null, 2);
        xhr.open('PUT', requestUrl, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify(putBody));
        break;
      }

      case 'delete':
        requestUrl = `${baseUrl}/1`;
        requestMethod = 'DELETE';
        requestHeaders = {};
        xhr.open('DELETE', requestUrl, true);
        xhr.send();
        break;

      case 'error':
        requestUrl = 'https://invalid-url-that-does-not-exist-12345.com/api';
        requestMethod = 'GET';
        requestHeaders = {};
        xhr.open('GET', requestUrl, true);
        xhr.send();
        break;
    }
  };

  // Toggle console hook / console 훅 토글
  const handleToggleConsoleHook = async () => {
    try {
      if (consoleHookEnabled) {
        const success = await ChromeRemoteDevToolsInspector.disableConsoleHook();
        if (success) {
          setConsoleHookEnabled(false);
        }
      } else {
        const success = await ChromeRemoteDevToolsInspector.enableConsoleHook();
        if (success) {
          setConsoleHookEnabled(true);
        }
      }
    } catch (error) {
      console.error('Failed to toggle console hook / console 훅 토글 실패:', error);
    }
  };

  // Toggle network hook / network 훅 토글
  const handleToggleNetworkHook = async () => {
    try {
      if (networkHookEnabled) {
        const success = await ChromeRemoteDevToolsInspector.disableNetworkHook();
        if (success) {
          setNetworkHookEnabled(false);
        }
      } else {
        const success = await ChromeRemoteDevToolsInspector.enableNetworkHook();
        if (success) {
          setNetworkHookEnabled(true);
        }
      }
    } catch (error) {
      console.error('Failed to toggle network hook / network 훅 토글 실패:', error);
    }
  };

  // Format JSON for display / 표시용 JSON 포맷팅
  const formatJSON = (obj: any): string => {
    try {
      if (typeof obj === 'string') {
        // Try to parse if it's a JSON string / JSON 문자열이면 파싱 시도
        try {
          return JSON.stringify(JSON.parse(obj), null, 2);
        } catch {
          return obj;
        }
      }
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  };

  // Render request/response payload / 요청/응답 페이로드 렌더링
  const renderPayload = (
    title: string,
    data:
      | {
          url?: string;
          method?: string;
          headers?: Record<string, string>;
          body?: string | any;
          status?: number;
          statusText?: string;
        }
      | undefined
  ) => {
    if (!data) return null;

    return (
      <View style={styles.payloadContainer}>
        <Text style={styles.payloadTitle}>{title}</Text>
        {data.url && (
          <View style={styles.payloadSection}>
            <Text style={styles.payloadLabel}>URL:</Text>
            <Text style={styles.payloadValue}>{data.url}</Text>
          </View>
        )}
        {data.method && (
          <View style={styles.payloadSection}>
            <Text style={styles.payloadLabel}>Method:</Text>
            <Text style={styles.payloadValue}>{data.method}</Text>
          </View>
        )}
        {data.status !== undefined && (
          <View style={styles.payloadSection}>
            <Text style={styles.payloadLabel}>Status:</Text>
            <Text style={styles.payloadValue}>
              {data.status} {data.statusText || ''}
            </Text>
          </View>
        )}
        {data.headers && Object.keys(data.headers).length > 0 && (
          <View style={styles.payloadSection}>
            <Text style={styles.payloadLabel}>Headers:</Text>
            <View style={styles.headersContainer}>
              {Object.entries(data.headers).map(([key, value], index) => (
                <View key={index} style={styles.headerRow}>
                  <Text style={styles.headerKey}>{key}:</Text>
                  <Text style={styles.headerValue}>{String(value)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        {data.body !== undefined && (
          <View style={styles.payloadSection}>
            <Text style={styles.payloadLabel}>Body:</Text>
            <ScrollView style={styles.payloadScrollView} nestedScrollEnabled>
              <TextInput
                style={styles.payloadText}
                value={formatJSON(data.body)}
                multiline
                editable={false}
              />
            </ScrollView>
          </View>
        )}
      </View>
    );
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
            {/* Fetch Request/Response Payload / Fetch 요청/응답 페이로드 */}
            {fetchStatus.request && renderPayload('Request', fetchStatus.request)}
            {fetchStatus.response && renderPayload('Response', fetchStatus.response)}
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
            {/* XHR Request/Response Payload / XHR 요청/응답 페이로드 */}
            {xhrStatus.request && renderPayload('Request', xhrStatus.request)}
            {xhrStatus.response && renderPayload('Response', xhrStatus.response)}
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

        {/* Floating Hook Control Buttons / 플로팅 훅 제어 버튼 */}
        <View style={styles.floatingButtonsContainer}>
          <TouchableOpacity
            style={[
              styles.floatingButton,
              consoleHookEnabled ? styles.floatingButtonEnabled : styles.floatingButtonDisabled,
            ]}
            onPress={handleToggleConsoleHook}
          >
            <Text style={styles.floatingButtonText}>
              {consoleHookEnabled ? 'Console ON' : 'Console OFF'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.floatingButton,
              networkHookEnabled ? styles.floatingButtonEnabled : styles.floatingButtonDisabled,
            ]}
            onPress={handleToggleNetworkHook}
          >
            <Text style={styles.floatingButtonText}>
              {networkHookEnabled ? 'Network ON' : 'Network OFF'}
            </Text>
          </TouchableOpacity>
        </View>
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
  payloadContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  payloadTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000000',
  },
  payloadSection: {
    marginBottom: 12,
  },
  payloadLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: '#666666',
  },
  payloadValue: {
    fontSize: 12,
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  payloadScrollView: {
    maxHeight: 200,
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    padding: 8,
  },
  payloadText: {
    fontSize: 11,
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    padding: 0,
  },
  headersContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    padding: 8,
    marginTop: 4,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerKey: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976D2',
    marginRight: 8,
    minWidth: 120,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  headerValue: {
    fontSize: 12,
    color: '#000000',
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  floatingButtonsContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'column',
    gap: 12,
    zIndex: 1000,
  },
  floatingButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingButtonEnabled: {
    backgroundColor: '#4CAF50',
  },
  floatingButtonDisabled: {
    backgroundColor: '#9E9E9E',
  },
  floatingButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default App;
