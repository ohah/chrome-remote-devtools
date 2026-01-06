// Chrome Remote DevTools Inspector Provider / Chrome Remote DevTools Inspector Provider
// This component injects actual implementation into the polyfill / 이 컴포넌트는 polyfill에 실제 구현을 주입합니다

import React, { useEffect, useRef } from 'react';
import { setServerInfo } from './server-info';
import { setupReduxDevToolsExtension } from './devtools-hook';
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
}: ChromeRemoteDevToolsInspectorProviderProps): React.JSX.Element {
  const initializedRef = useRef(false);
  const connectionRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    // Setup Redux DevTools Extension with actual implementation / 실제 구현으로 Redux DevTools Extension 설정
    // This will inject implementation functions into polyfill / 이것은 polyfill에 구현 함수를 주입합니다
    // Only initialize once / 한 번만 초기화
    if (!initializedRef.current) {
      console.log(
        '[ChromeRemoteDevTools] Initializing Provider and injecting implementation functions',
        {
          serverHost,
          serverPort,
        }
      );
      setServerInfo(serverHost, serverPort);
      setupReduxDevToolsExtension(serverHost, serverPort);
      initializedRef.current = true;
    } else {
      // Update server info if changed / 변경된 경우 서버 정보 업데이트
      console.log('[ChromeRemoteDevTools] Updating server info', { serverHost, serverPort });
      setServerInfo(serverHost, serverPort);
    }

    // Auto-connect if enabled / 활성화된 경우 자동 연결
    if (autoConnect && !connectionRef.current) {
      connectionRef.current = connect(serverHost, serverPort)
        .then(() => {
          // Connection successful / 연결 성공
        })
        .catch(() => {
          // Failed to connect / 연결 실패
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
  }, [serverHost, serverPort, autoConnect]);

  return <>{children}</>;
}
