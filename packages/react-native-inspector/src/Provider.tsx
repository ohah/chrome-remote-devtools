// Chrome Remote DevTools Inspector Provider / Chrome Remote DevTools Inspector Provider
// This component checks JSI injection status and connects to the server / 이 컴포넌트는 JSI 주입 상태를 확인하고 서버에 연결합니다

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { setServerInfo } from './server-info';
import { connect } from './index';
// Import polyfill to ensure it's installed / polyfill이 설치되도록 import
// The polyfill is auto-installed when this module is imported / 이 모듈이 import될 때 polyfill이 자동으로 설치됨
import './redux-devtools-extension';

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
  showStatusUI = false,
}: ChromeRemoteDevToolsInspectorProviderProps): React.JSX.Element {
  const initializedRef = useRef(false);
  const connectionRef = useRef<Promise<void> | null>(null);
  const [jsiInjected] = useState<boolean>(true); // Extension is always available now / Extension이 이제 항상 사용 가능함
  const [connectionStatus, setConnectionStatus] = useState<
    'disconnected' | 'connecting' | 'connected'
  >('disconnected');

  useEffect(() => {
    // Set server info / 서버 정보 설정
    setServerInfo(serverHost, serverPort);

    // Only initialize once / 한 번만 초기화
    if (!initializedRef.current) {
      console.log('[ChromeRemoteDevTools] Initializing Provider', {
        serverHost,
        serverPort,
        jsiInjected,
      });
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
                jsiInjected === true
                  ? styles.statusSuccess
                  : jsiInjected === false
                    ? styles.statusError
                    : styles.statusPending,
              ]}
            >
              {jsiInjected === true
                ? '✅ Success'
                : jsiInjected === false
                  ? '❌ Failed'
                  : '⏳ Checking...'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Connection:</Text>
            <Text
              style={[
                styles.statusValue,
                connectionStatus === 'connected'
                  ? styles.statusSuccess
                  : connectionStatus === 'connecting'
                    ? styles.statusPending
                    : styles.statusError,
              ]}
            >
              {connectionStatus === 'connected'
                ? '✅ Connected'
                : connectionStatus === 'connecting'
                  ? '⏳ Connecting...'
                  : '❌ Disconnected'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Server:</Text>
            <Text style={styles.statusValue}>
              {serverHost}:{serverPort}
            </Text>
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
