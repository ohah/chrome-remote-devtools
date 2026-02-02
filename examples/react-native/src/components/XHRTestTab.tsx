/**
 * XHR test tab component / XHR 테스트 탭 컴포넌트
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
    body?: unknown;
  };
}

/** Test headers with various values / 다양한 값으로 헤더 테스트 */
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

export const XHRTestTab: React.FC = () => {
  const [xhrStatus, setXhrStatus] = useState<NetworkStatus>({
    method: '',
    status: null,
  });

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
          if (parts.length === 2) responseHeaders[parts[0]] = parts[1];
        });
      }
      let responseBody: unknown;
      try {
        responseBody = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        responseBody = xhr.responseText;
      }
      const ok = xhr.status >= 200 && xhr.status < 300;
      setXhrStatus({
        method: type.toUpperCase(),
        status: ok ? 'success' : 'error',
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
        response: { status: 0, statusText: 'Network error', headers: {} },
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
        response: { status: 0, statusText: 'Request timeout', headers: {} },
      });
    };

    switch (type) {
      case 'get':
        requestUrl = `${baseUrl}/1`;
        requestMethod = 'GET';
        xhr.open('GET', requestUrl, true);
        Object.entries(testHeaders).forEach(([key, value]) => xhr.setRequestHeader(key, value));
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
        Object.entries(testHeaders).forEach(([key, value]) => xhr.setRequestHeader(key, value));
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
        Object.entries(testHeaders).forEach(([key, value]) => xhr.setRequestHeader(key, value));
        xhr.send(JSON.stringify(putBody));
        break;
      }
      case 'delete':
        requestUrl = `${baseUrl}/1`;
        requestMethod = 'DELETE';
        xhr.open('DELETE', requestUrl, true);
        Object.entries(testHeaders).forEach(([key, value]) => xhr.setRequestHeader(key, value));
        xhr.send();
        break;
      case 'error':
        requestUrl = 'https://invalid-url-that-does-not-exist-12345.com/api';
        requestMethod = 'GET';
        xhr.open('GET', requestUrl, true);
        Object.entries(testHeaders).forEach(([key, value]) => xhr.setRequestHeader(key, value));
        xhr.send();
        break;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.testSection}>
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
  container: { flex: 1 },
  content: { padding: 16 },
  testSection: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
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
  getButton: { backgroundColor: '#2196F3' },
  postButton: { backgroundColor: '#4CAF50' },
  putButton: { backgroundColor: '#FF9800' },
  deleteButton: { backgroundColor: '#F44336' },
  errorButton: { backgroundColor: '#9E9E9E' },
});
