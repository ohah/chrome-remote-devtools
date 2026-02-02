/**
 * Fetch test tab component / Fetch 테스트 탭 컴포넌트
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

export const FetchTestTab: React.FC = () => {
  const [fetchStatus, setFetchStatus] = useState<NetworkStatus>({
    method: '',
    status: null,
  });

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
            request: { url: getUrl, method: 'GET', headers: testHeaders },
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
          setFetchStatus({
            method: 'DELETE',
            status: deleteResponse.ok ? 'success' : 'error',
            request: { url: deleteUrl, method: 'DELETE', headers: testHeaders },
            response: {
              status: deleteResponse.status,
              statusText: deleteResponse.statusText,
              headers: deleteResponseHeaders,
            },
          });
          break;
        }
        case 'error': {
          const errorUrl = 'https://invalid-url-that-does-not-exist-12345.com/api';
          try {
            await fetch(errorUrl, { method: 'GET', headers: testHeaders });
          } catch (error) {
            setFetchStatus({
              method: 'GET',
              status: 'error',
              request: { url: errorUrl, method: 'GET', headers: testHeaders },
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.testSection}>
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
