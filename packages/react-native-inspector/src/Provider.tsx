// Chrome Remote DevTools Inspector Provider / Chrome Remote DevTools Inspector Provider
// This component checks JSI injection status and connects to the server / 이 컴포넌트는 JSI 주입 상태를 확인하고 서버에 연결합니다

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { setServerInfo } from './server-info';
import { connect } from './index';

/**
 * Chrome Remote DevTools Inspector Provider Props / Chrome Remote DevTools Inspector Provider Props
 */
export interface ChromeRemoteDevToolsInspectorProviderProps {
  /** Server host (e.g., "localhost" or "192.168.1.100") / 서버 호스트 (예: "localhost" 또는 "192.168.1.100") */
  serverHost?: string;
  /** Server port (e.g., 8080) / 서버 포트 (예: 8080) */
  serverPort?: number;
  /** Children to render / 렌더링할 children */
  children: React.ReactNode;
  /** Auto-connect on mount / 마운트 시 자동 연결 */
  autoConnect?: boolean;
  /** Show JSI injection status UI / JSI 주입 상태 UI 표시 */
  showStatusUI?: boolean;
}

/**
 * Chrome Remote DevTools Inspector Provider / Chrome Remote DevTools Inspector Provider
 * This component sets up Redux DevTools Extension implementation and connects to the server / 이 컴포넌트는 Redux DevTools Extension 구현을 설정하고 서버에 연결합니다
 */
export function ChromeRemoteDevToolsInspectorProvider({
  serverHost = 'localhost',
  serverPort = 8080,
  children,
  autoConnect = true,
  showStatusUI = __DEV__,
}: ChromeRemoteDevToolsInspectorProviderProps): React.JSX.Element {
  const initializedRef = useRef(false);
  const connectionRef = useRef<Promise<void> | null>(null);
  const [jsiInjected, setJsiInjected] = useState<boolean | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  // Check JSI injection status / JSI 주입 상태 확인
  useEffect(() => {
    const checkJSIInjection = () => {
      try {
        const globalObj = typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : {};

        // Check if JSI injection flag exists / JSI 주입 플래그가 존재하는지 확인
        const jsiInjectedFlag = (globalObj as any).__REDUX_DEVTOOLS_EXTENSION_JSI_INJECTED__;
        const extension = (globalObj as any).__REDUX_DEVTOOLS_EXTENSION__;

        if (jsiInjectedFlag === true) {
          console.log('✅ [ChromeRemoteDevTools] JSI injection detected / JSI 주입이 감지됨');
          console.log('   - __REDUX_DEVTOOLS_EXTENSION__ exists: Yes');
          console.log('   - Type:', typeof extension);
          console.log('   - Has connect:', typeof extension?.connect === 'function');
          setJsiInjected(true);
          return true;
        } else if (extension) {
          // Extension exists but JSI flag is not set (might be Metro polyfill) / Extension이 존재하지만 JSI 플래그가 설정되지 않음 (Metro polyfill일 수 있음)
          console.warn('⚠️ [ChromeRemoteDevTools] __REDUX_DEVTOOLS_EXTENSION__ exists but JSI flag is not set / __REDUX_DEVTOOLS_EXTENSION__가 존재하지만 JSI 플래그가 설정되지 않음');
          console.warn('   - This might be Metro polyfill, not JSI injection / 이것은 Metro polyfill일 수 있으며, JSI 주입이 아닙니다');
          setJsiInjected(false);
          return false;
        } else {
          console.error('❌ [ChromeRemoteDevTools] JSI injection not detected / JSI 주입이 감지되지 않음');
          console.error('   - __REDUX_DEVTOOLS_EXTENSION__ does not exist / __REDUX_DEVTOOLS_EXTENSION__가 존재하지 않음');
          setJsiInjected(false);
          return false;
        }
      } catch (error) {
        console.error('❌ [ChromeRemoteDevTools] Error checking JSI injection:', error);
        setJsiInjected(false);
        return false;
      }
    };

    // Check immediately / 즉시 확인
    checkJSIInjection();

    // Also check after a short delay (in case JSI injection happens asynchronously) / 짧은 지연 후에도 확인 (JSI 주입이 비동기적으로 발생할 수 있음)
    const timeoutId = setTimeout(() => {
      checkJSIInjection();
    }, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    // Set server info / 서버 정보 설정
    setServerInfo(serverHost, serverPort);

    // Only initialize once / 한 번만 초기화
    if (!initializedRef.current) {
      console.log(
        '[ChromeRemoteDevTools] Initializing Provider',
        {
          serverHost,
          serverPort,
          jsiInjected,
        }
      );
      initializedRef.current = true;
    } else {
      // Update server info if changed / 변경된 경우 서버 정보 업데이트
      console.log('[ChromeRemoteDevTools] Updating server info', { serverHost, serverPort });
    }

    // Auto-connect if enabled / 활성화된 경우 자동 연결
    if (autoConnect && !connectionRef.current && jsiInjected !== false) {
      setConnectionStatus('connecting');
      connectionRef.current = connect(serverHost, serverPort)
        .then(() => {
          console.log('✅ [ChromeRemoteDevTools] Connected to server / 서버에 연결됨');
          setConnectionStatus('connected');
        })
        .catch((error) => {
          console.error('❌ [ChromeRemoteDevTools] Failed to connect to server:', error);
          setConnectionStatus('disconnected');
          connectionRef.current = null;
        });
    }

    // Cleanup function / 정리 함수
    return () => {
      // Note: Connection cleanup is handled by the native module / 참고: 연결 정리는 네이티브 모듈에서 처리됨
      if (!autoConnect) {
        connectionRef.current = null;
      }
    };
  }, [serverHost, serverPort, autoConnect, jsiInjected]);

  return (
    <>
      {children}
      {showStatusUI && (
        <View style={styles.statusContainer}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>JSI Injection:</Text>
            <Text
              style={[
                styles.statusValue,
                jsiInjected === true ? styles.statusSuccess : jsiInjected === false ? styles.statusError : styles.statusPending,
              ]}
            >
              {jsiInjected === true ? '✅ Success' : jsiInjected === false ? '❌ Failed' : '⏳ Checking...'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Connection:</Text>
            <Text
              style={[
                styles.statusValue,
                connectionStatus === 'connected' ? styles.statusSuccess : connectionStatus === 'connecting' ? styles.statusPending : styles.statusError,
              ]}
            >
              {connectionStatus === 'connected' ? '✅ Connected' : connectionStatus === 'connecting' ? '⏳ Connecting...' : '❌ Disconnected'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Server:</Text>
            <Text style={styles.statusValue}>{serverHost}:{serverPort}</Text>
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  statusContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 10,
    borderRadius: 8,
    minWidth: 200,
    zIndex: 9999,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  statusLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statusValue: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '400',
  },
  statusSuccess: {
    color: '#4CAF50',
  },
  statusError: {
    color: '#F44336',
  },
  statusPending: {
    color: '#FF9800',
  },
});
