// Chrome Remote DevTools Inspector Provider / Chrome Remote DevTools Inspector Provider
// This component connects to the server via WebSocket (JavaScript layer) / 이 컴포넌트는 WebSocket(JavaScript 레이어)으로 서버에 연결합니다

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, NativeModules } from 'react-native';
import { setServerInfo } from './server-info';
import { connect } from './index';
import { setOnConnectionClose, setOnConnectionOpen } from './websocket-client';
import { enableConsoleHook, disableConsoleHook } from './cdp/domain/runtime';
import { enableNetworkHook, disableNetworkHook } from './cdp/domain/network';
// Import polyfill to ensure it's installed / polyfill이 설치되도록 import
// The polyfill is auto-installed when this module is imported / 이 모듈이 import될 때 polyfill이 자동으로 설치됨
import './redux-devtools-extension';

/**
 * Detect if Metro bundler is running by checking scriptURL / scriptURL로 Metro 번들러 실행 여부 감지
 * Metro running: http://localhost:8081/index.bundle / Metro 실행 중: http://...
 * Release build: file:// or undefined / 릴리즈 빌드: file:// 또는 undefined
 */
function detectMetroMode(): boolean {
  try {
    let scriptURL: string | undefined;

    // Try new way first (RN 0.64+) / 최신 방식 먼저 시도
    if (NativeModules.SourceCode?.getConstants) {
      scriptURL = NativeModules.SourceCode.getConstants().scriptURL;
    } else {
      // Fallback to old way (RN 0.50+) / 레거시 방식으로 폴백
      scriptURL = (NativeModules.SourceCode as Record<string, unknown>)?.scriptURL as
        | string
        | undefined;
    }

    return typeof scriptURL === 'string' && scriptURL.startsWith('http');
  } catch {
    return false;
  }
}

/** Connection status for WebSocket / WebSocket 연결 상태 */
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'failed';

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
  /** Show connection status UI (WebSocket) / 연결 상태 UI 표시 (WebSocket) */
  showStatusUI?: boolean;
  /** Device ID for Inspector list (required, e.g. from getUniqueId()) / Inspector 목록용 기기 ID (필수, 예: getUniqueId() 결과) */
  deviceId: string;
}

/**
 * Chrome Remote DevTools Inspector Provider / Chrome Remote DevTools Inspector Provider
 * This component sets up Redux DevTools Extension and connects to the server via WebSocket / 이 컴포넌트는 Redux DevTools Extension을 설정하고 WebSocket으로 서버에 연결합니다
 */
export function ChromeRemoteDevToolsInspectorProvider({
  serverHost = 'localhost',
  serverPort = 8080,
  children,
  autoConnect = true,
  showStatusUI = false,
  deviceId,
}: ChromeRemoteDevToolsInspectorProviderProps): React.JSX.Element {
  const initializedRef = useRef(false);
  const connectionRef = useRef<Promise<void> | null>(null);
  const onConnectionCloseRef = useRef<(() => void) | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');

  const doConnect = useCallback(() => {
    if (!deviceId) return;
    setConnectionStatus('connecting');

    // Detect Metro mode and enable/disable hooks accordingly / Metro 모드 감지 후 훅 활성화/비활성화
    const isMetroMode = detectMetroMode();
    if (isMetroMode) {
      console.log(
        '[ChromeRemoteDevTools] Metro detected, using Metro CDP (hooks disabled) / Metro 감지됨, Metro CDP 사용 (훅 비활성화)'
      );
      disableConsoleHook();
      disableNetworkHook();
    } else {
      console.log(
        '[ChromeRemoteDevTools] Release mode, using our hooks / 릴리즈 모드, 우리 훅 사용'
      );
      enableConsoleHook();
      enableNetworkHook();
    }

    const promise = connect(serverHost, serverPort, {
      deviceId,
      onFailureAttempt: () => setConnectionStatus('failed'),
    })
      .then(() => {
        console.log('✅ [ChromeRemoteDevTools] Connected to server / 서버에 연결됨');
        setConnectionStatus('connected');
        connectionRef.current = null;
      })
      .catch((error) => {
        console.error('❌ [ChromeRemoteDevTools] Failed to connect to server:', error);
        setConnectionStatus('failed');
        connectionRef.current = null;
      });
    connectionRef.current = promise;
  }, [serverHost, serverPort, deviceId]);

  const stableOnConnectionClose = useCallback(() => {
    onConnectionCloseRef.current?.();
  }, []);

  useEffect(() => {
    // Set server info / 서버 정보 설정
    setServerInfo(serverHost, serverPort);

    // Only initialize once / 한 번만 초기화
    if (!initializedRef.current) {
      console.log('[ChromeRemoteDevTools] Initializing Provider', { serverHost, serverPort });
      initializedRef.current = true;
    } else {
      // Update server info if changed / 변경된 경우 서버 정보 업데이트
      console.log('[ChromeRemoteDevTools] Updating server info', { serverHost, serverPort });
    }

    // Auto-connect if enabled and deviceId is set / deviceId가 있고 자동 연결이 켜져 있으면 연결
    if (autoConnect && deviceId && !connectionRef.current) {
      doConnect();
    }

    // Notify when WebSocket disconnects so we can show Connect button (ref avoids stale closure) / WebSocket 끊김 시 Connect 버튼 표시 (ref로 최신 콜백 유지)
    onConnectionCloseRef.current = () => setConnectionStatus('failed');
    setOnConnectionClose(stableOnConnectionClose);
    // Notify when WebSocket opens (e.g. reconnect() from server inject) so we clear Connect button / WebSocket 연결 시 Connect 버튼 제거 (예: 서버 주입 reconnect())
    setOnConnectionOpen(() => setConnectionStatus('connected'));

    // Cleanup function / 정리 함수
    return () => {
      setOnConnectionClose(null);
      setOnConnectionOpen(null);
      onConnectionCloseRef.current = null;
      if (!autoConnect) {
        connectionRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- doConnect depends only on serverHost, serverPort, and deviceId, which are already listed
  }, [serverHost, serverPort, autoConnect, deviceId]);

  return (
    <>
      {children}
      {/* Connect button when disconnected or after first connection failure / 연결 끊김 또는 첫 연결 실패 시 Connect 버튼 표시 */}
      {connectionStatus === 'failed' && (
        <View style={styles.retryContainer}>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => doConnect()}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>Connect</Text>
          </TouchableOpacity>
        </View>
      )}
      {showStatusUI && (
        <View style={styles.statusContainer}>
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
                  : connectionStatus === 'failed'
                    ? '❌ Failed (Tap Connect)'
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
  retryContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 9999,
  },
  retryButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
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
