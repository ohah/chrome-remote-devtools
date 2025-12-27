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
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useState, useRef } from 'react';
import { init } from '@ohah/chrome-remote-devtools-client';

// Connection status type / 연결 상태 타입
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [serverUrl, setServerUrl] = useState<string>('ws://localhost:9222');
  const [recording, setRecording] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<{ connected: boolean } | null>(null);

  // Initialize connection / 연결 초기화
  const handleConnect = async () => {
    if (!serverUrl) {
      Alert.alert('Error', 'Please enter server URL');
      return;
    }

    setConnectionStatus('connecting');
    setError(null);

    try {
      await init({
        serverUrl,
        rrweb: {
          enable: true,
          flushIntervalMs: 1000,
          maxBatchSize: 50,
        },
        skipWebSocket: false,
      });

      setConnectionStatus('connected');
      clientRef.current = { connected: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Connection failed';
      setError(errorMsg);
      setConnectionStatus('error');
      Alert.alert('Connection Error', errorMsg);
    }
  };

  // Disconnect / 연결 해제
  const handleDisconnect = () => {
    setConnectionStatus('disconnected');
    setRecording(false);
    clientRef.current = null;
  };

  // Toggle recording / 녹화 토글
  const handleToggleRecording = () => {
    if (connectionStatus !== 'connected') {
      Alert.alert('Error', 'Please connect to server first');
      return;
    }

    setRecording((prev: boolean) => !prev);
  };

  // Get status style / 상태 스타일 가져오기
  const getStatusStyle = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected':
        return styles.statusConnected;
      case 'connecting':
        return styles.statusConnecting;
      case 'error':
        return styles.statusError;
      default:
        return styles.statusDisconnected;
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <Text style={styles.title}>Chrome Remote DevTools</Text>
          <Text style={styles.subtitle}>React Native Example</Text>

          {/* Server URL Input / 서버 URL 입력 */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Server URL:</Text>
            <TextInput
              style={styles.input}
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="ws://localhost:9222"
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Connection Status / 연결 상태 */}
          <View style={styles.statusContainer}>
            <Text style={styles.label}>Status:</Text>
            <View style={[styles.statusBadge, getStatusStyle(connectionStatus)]}>
              <Text style={styles.statusText}>{connectionStatus.toUpperCase()}</Text>
            </View>
          </View>

          {/* Recording Status / 녹화 상태 */}
          {connectionStatus === 'connected' && (
            <View style={styles.statusContainer}>
              <Text style={styles.label}>Recording:</Text>
              <View
                style={[
                  styles.statusBadge,
                  recording ? styles.statusConnected : styles.statusDisconnected,
                ]}
              >
                <Text style={styles.statusText}>{recording ? 'ON' : 'OFF'}</Text>
              </View>
            </View>
          )}

          {/* Error Message / 에러 메시지 */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Action Buttons / 액션 버튼 */}
          <View style={styles.buttonContainer}>
            {connectionStatus === 'disconnected' || connectionStatus === 'error' ? (
              <TouchableOpacity
                style={[styles.button, styles.connectButton]}
                onPress={handleConnect}
              >
                <Text style={styles.buttonText}>Connect</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.button, styles.disconnectButton]}
                  onPress={handleDisconnect}
                >
                  <Text style={styles.buttonText}>Disconnect</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, recording ? styles.stopButton : styles.recordButton]}
                  onPress={handleToggleRecording}
                >
                  <Text style={styles.buttonText}>
                    {recording ? 'Stop Recording' : 'Start Recording'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Instructions / 사용 방법 */}
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>Instructions:</Text>
            <Text style={styles.instructionsText}>
              1. Start the Chrome Remote DevTools server:{'\n'}
              {'   '}bun run dev:server{'\n\n'}
              2. Enter the server URL (default: ws://localhost:9222){'\n\n'}
              3. Click "Connect" to connect to the server{'\n\n'}
              4. Click "Start Recording" to begin session recording{'\n\n'}
              5. Open Chrome Remote DevTools Inspector to view the recorded session
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
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000000',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#000000',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  statusDisconnected: {
    backgroundColor: '#999999',
  },
  statusConnecting: {
    backgroundColor: '#FFA500',
  },
  statusConnected: {
    backgroundColor: '#4CAF50',
  },
  statusError: {
    backgroundColor: '#F44336',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#F44336',
    fontSize: 14,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 24,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  connectButton: {
    backgroundColor: '#2196F3',
  },
  disconnectButton: {
    backgroundColor: '#999999',
  },
  recordButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#F44336',
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
});

export default App;
