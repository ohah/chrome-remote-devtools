import { ReactNativeWebSocketClient } from './websocket-client';
import type { ChromeRemoteDevToolsOptions } from './config';

// Global instances / 전역 인스턴스
let websocketClient: ReactNativeWebSocketClient | null = null;

/**
 * Initialize Chrome Remote DevTools for React Native / React Native용 Chrome Remote DevTools 초기화
 * @param options - Configuration options / 설정 옵션
 */
export async function init(options: ChromeRemoteDevToolsOptions): Promise<void> {
  console.log('[React Native Client] Initializing / [React Native Client] 초기화 중');
  const { serverUrl, interceptNativeInspector = false } = options;

  if (!serverUrl) {
    throw new Error('serverUrl is required / serverUrl이 필요합니다');
  }

  console.log('[React Native Client] Server URL / [React Native Client] 서버 URL:', serverUrl);

  // Set custom WebSocket URL for native inspector interception / 네이티브 인스펙터 가로채기를 위한 커스텀 WebSocket URL 설정
  if (interceptNativeInspector && typeof global !== 'undefined') {
    // Extract host and port from serverUrl / serverUrl에서 host와 port 추출
    const url = new URL(serverUrl.replace(/^ws/, 'http'));
    const customOrigin = `${url.protocol === 'https:' ? 'wss:' : 'ws:'}//${url.host}`;

    // Set global variable for HMRClient to use / HMRClient가 사용할 전역 변수 설정
    (global as any).__CHROME_REMOTE_DEVTOOLS_HMR_URL__ = customOrigin;
    console.log(
      '[React Native Client] Native inspector interception enabled / [React Native Client] 네이티브 인스펙터 가로채기 활성화됨:',
      customOrigin
    );
  }

  // Cleanup existing connection / 기존 연결 정리
  if (websocketClient) {
    console.log(
      '[React Native Client] Cleaning up existing connection / [React Native Client] 기존 연결 정리 중'
    );
    websocketClient.cleanup();
    websocketClient = null;
  }

  // Create WebSocket client / WebSocket 클라이언트 생성
  console.log(
    '[React Native Client] Creating WebSocket client / [React Native Client] WebSocket 클라이언트 생성 중'
  );
  websocketClient = new ReactNativeWebSocketClient(serverUrl);

  // Initialize WebSocket connection / WebSocket 연결 초기화
  console.log(
    '[React Native Client] Initializing WebSocket connection / [React Native Client] WebSocket 연결 초기화 중'
  );
  await websocketClient.initialize();
  console.log('[React Native Client] WebSocket connected / [React Native Client] WebSocket 연결됨');

  console.log('[React Native Client] Initialization complete / [React Native Client] 초기화 완료');
}

/**
 * Get WebSocket client instance / WebSocket 클라이언트 인스턴스 가져오기
 */
export function getWebSocketClient(): ReactNativeWebSocketClient | null {
  return websocketClient;
}

/**
 * Get Console domain / Console 도메인 가져오기
 */
export function getConsoleDomain(): import('./console').ConsoleDomain | null {
  if (!websocketClient) {
    return null;
  }
  return websocketClient.getConsole();
}

/**
 * Destroy client and cleanup resources / 클라이언트 제거 및 리소스 정리
 */
export function destroy(): void {
  if (websocketClient) {
    websocketClient.cleanup();
    websocketClient = null;
  }
}

// Export types / 타입 export
export type { ChromeRemoteDevToolsOptions } from './config';
