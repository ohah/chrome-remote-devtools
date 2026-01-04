/**
 * Network test tab component / 네트워크 테스트 탭 컴포넌트
 * @format
 */

import React from 'react';
import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { PayloadView } from './PayloadView';

interface NetworkStatus {
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
}

export const NetworkTestTab: React.FC = () => {
  const [fetchStatus, setFetchStatus] = useState<NetworkStatus>({
    method: '',
    status: null,
  });
  const [xhrStatus, setXhrStatus] = useState<NetworkStatus>({
    method: '',
    status: null,
  });

  // Test headers with various values / 다양한 값으로 헤더 테스트
  const getTestHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: 'Bearer test-token-12345',
    'X-Request-ID': `req-${Date.now()}`,
    'X-Custom-Header': 'custom-value',
    'User-Agent': 'ReactNative-Test/1.0',
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'X-API-Version': 'v1',
    'X-Client-Type': 'mobile',
    'X-Device-ID': 'device-12345',
  });

  // Test network requests with fetch / fetch를 사용한 네트워크 요청 테스트
  const handleTestNetwork = async (type: 'get' | 'post' | 'put' | 'delete' | 'error') => {
    setFetchStatus({ method: type.toUpperCase(), status: null });

    const testHeaders = getTestHeaders();

    try {
      switch (type) {
        case 'get': {
          const getUrl = 'https://jsonplaceholder.typicode.com/posts/1';
          const getResponse = await fetch(getUrl, {
            method: 'GET',
            headers: testHeaders,
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
              headers: testHeaders,
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
          const postBody = {
            title: 'Test Post',
            body: 'This is a test POST request',
            userId: 1,
          };
          const postResponse = await fetch(postUrl, {
            method: 'POST',
            headers: testHeaders,
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
              headers: testHeaders,
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
          const putBody = {
            id: 1,
            title: 'Updated Test Post',
            body: 'This is an updated test PUT request',
            userId: 1,
          };
          const putResponse = await fetch(putUrl, {
            method: 'PUT',
            headers: testHeaders,
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
              headers: testHeaders,
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
            headers: testHeaders,
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
                headers: testHeaders,
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
                headers: testHeaders,
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
              headers: testHeaders,
            });
          } catch (error) {
            setFetchStatus({
              method: 'GET',
              status: 'error',
              request: {
                url: errorUrl,
                method: 'GET',
                headers: testHeaders,
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
          headers: testHeaders,
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
    const testHeaders = getTestHeaders();
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
            headers: testHeaders,
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
            headers: testHeaders,
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
          headers: testHeaders,
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
          headers: testHeaders,
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
        xhr.open('GET', requestUrl, true);
        // Set all test headers / 모든 테스트 헤더 설정
        Object.entries(testHeaders).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });
        xhr.send();
        break;

      case 'post': {
        requestUrl = baseUrl;
        requestMethod = 'POST';
        const postBody = {
          title: 'Test Post',
          body: 'This is a test POST request with XHR',
          userId: 1,
        };
        requestBody = JSON.stringify(postBody, null, 2);
        xhr.open('POST', requestUrl, true);
        // Set all test headers / 모든 테스트 헤더 설정
        Object.entries(testHeaders).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });
        xhr.send(JSON.stringify(postBody));
        break;
      }

      case 'put': {
        requestUrl = `${baseUrl}/1`;
        requestMethod = 'PUT';
        const putBody = {
          id: 1,
          title: 'Updated Test Post',
          body: 'This is an updated test PUT request with XHR',
          userId: 1,
        };
        requestBody = JSON.stringify(putBody, null, 2);
        xhr.open('PUT', requestUrl, true);
        // Set all test headers / 모든 테스트 헤더 설정
        Object.entries(testHeaders).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });
        xhr.send(JSON.stringify(putBody));
        break;
      }

      case 'delete':
        requestUrl = `${baseUrl}/1`;
        requestMethod = 'DELETE';
        xhr.open('DELETE', requestUrl, true);
        // Set all test headers / 모든 테스트 헤더 설정
        Object.entries(testHeaders).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });
        xhr.send();
        break;

      case 'error':
        requestUrl = 'https://invalid-url-that-does-not-exist-12345.com/api';
        requestMethod = 'GET';
        xhr.open('GET', requestUrl, true);
        // Set all test headers / 모든 테스트 헤더 설정
        Object.entries(testHeaders).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });
        xhr.send();
        break;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Fetch Test Section / Fetch 테스트 섹션 */}
      <View style={styles.testSection}>
        <Text style={styles.sectionTitle}>Network Test (Fetch) / 네트워크 테스트 (Fetch)</Text>
        <View
          style={[
            styles.statusContainer,
            fetchStatus.status === 'success'
              ? styles.statusSuccess
              : fetchStatus.status === 'error'
                ? styles.statusError
                : styles.statusEmpty,
          ]}
        >
          <Text style={styles.statusText}>
            {fetchStatus.status
              ? `FETCH ${fetchStatus.method}: ${
                  fetchStatus.status === 'success' ? 'Success' : 'Failed'
                }`
              : ''}
          </Text>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.getButton]}
            onPress={() => handleTestNetwork('get')}
          >
            <Text style={styles.buttonText}>GET</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.postButton]}
            onPress={() => handleTestNetwork('post')}
          >
            <Text style={styles.buttonText}>POST</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.putButton]}
            onPress={() => handleTestNetwork('put')}
          >
            <Text style={styles.buttonText}>PUT</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.deleteButton]}
            onPress={() => handleTestNetwork('delete')}
          >
            <Text style={styles.buttonText}>DELETE</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.errorButton]}
            onPress={() => handleTestNetwork('error')}
          >
            <Text style={styles.buttonText}>Error</Text>
          </TouchableOpacity>
        </View>
        {fetchStatus.request && <PayloadView title="Request" data={fetchStatus.request} />}
        {fetchStatus.response && <PayloadView title="Response" data={fetchStatus.response} />}
      </View>

      {/* XHR Test Section / XHR 테스트 섹션 */}
      <View style={styles.testSection}>
        <Text style={styles.sectionTitle}>Network Test (XHR) / 네트워크 테스트 (XHR)</Text>
        <View
          style={[
            styles.statusContainer,
            xhrStatus.status === 'success'
              ? styles.statusSuccess
              : xhrStatus.status === 'error'
                ? styles.statusError
                : styles.statusEmpty,
          ]}
        >
          <Text style={styles.statusText}>
            {xhrStatus.status
              ? `XHR ${xhrStatus.method}: ${xhrStatus.status === 'success' ? 'Success' : 'Failed'}`
              : ''}
          </Text>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.getButton]}
            onPress={() => handleTestXHR('get')}
          >
            <Text style={styles.buttonText}>GET</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.postButton]}
            onPress={() => handleTestXHR('post')}
          >
            <Text style={styles.buttonText}>POST</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.putButton]}
            onPress={() => handleTestXHR('put')}
          >
            <Text style={styles.buttonText}>PUT</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.deleteButton]}
            onPress={() => handleTestXHR('delete')}
          >
            <Text style={styles.buttonText}>DELETE</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.errorButton]}
            onPress={() => handleTestXHR('error')}
          >
            <Text style={styles.buttonText}>Error</Text>
          </TouchableOpacity>
        </View>
        {xhrStatus.request && <PayloadView title="Request" data={xhrStatus.request} />}
        {xhrStatus.response && <PayloadView title="Response" data={xhrStatus.response} />}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  testSection: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#000000',
  },
  statusContainer: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    marginTop: 8,
  },
  statusSuccess: {
    backgroundColor: '#C8E6C9',
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  statusError: {
    backgroundColor: '#FFCDD2',
    borderColor: '#F44336',
    borderWidth: 1,
  },
  statusEmpty: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    minHeight: 44,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
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
  getButton: {
    backgroundColor: '#2196F3',
  },
  postButton: {
    backgroundColor: '#4CAF50',
  },
  putButton: {
    backgroundColor: '#FF9800',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  errorButton: {
    backgroundColor: '#9E9E9E',
  },
});
