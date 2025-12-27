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
  Platform,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useState, useRef } from 'react';
import {
  init,
  enableRecording,
  disableRecording,
  destroy,
  getSessionReplayDomain,
} from '@ohah/chrome-remote-devtools-client';

// Connection status type / 연결 상태 타입
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  // Default server URL based on platform / 플랫폼에 따른 기본 서버 URL
  // Android emulator uses 10.0.2.2 to access host machine / Android 에뮬레이터는 호스트 머신에 접근하기 위해 10.0.2.2 사용
  const [serverUrl, setServerUrl] = useState<string>(
    Platform.OS === 'android' ? 'ws://10.0.2.2:8080' : 'ws://localhost:8080'
  );
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
          enable: false, // Enable manually after connection / 연결 후 수동으로 활성화
          flushIntervalMs: 1000,
          maxBatchSize: 50,
        },
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
    destroy();
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

    const sessionReplay = getSessionReplayDomain();
    if (!sessionReplay) {
      Alert.alert('Error', 'SessionReplay domain not available');
      return;
    }

    if (recording) {
      disableRecording();
      setRecording(false);
      Alert.alert('Recording', 'Session recording stopped');
    } else {
      enableRecording();
      setRecording(true);
      Alert.alert('Recording', 'Session recording started');
    }
  };

  // Test console methods / 콘솔 메서드 테스트
  const handleTestConsole = (type: 'log' | 'error' | 'warn' | 'info' | 'debug') => {
    if (connectionStatus !== 'connected') {
      Alert.alert('Error', 'Please connect to server first');
      return;
    }

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
              placeholder="ws://localhost:8080"
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

          {/* Console Test Buttons / 콘솔 테스트 버튼 */}
          {connectionStatus === 'connected' && (
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
            </View>
          )}

          {/* Instructions / 사용 방법 */}
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>Instructions:</Text>
            <Text style={styles.instructionsText}>
              1. Start the Chrome Remote DevTools server:{'\n'}
              {'   '}bun run dev:server{'\n\n'}
              2. Enter the server URL (default: ws://localhost:8080){'\n\n'}
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
});

export default App;
