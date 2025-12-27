import { useEffect } from 'react';
import { init } from '@ohah/chrome-remote-devtools-client';

/**
 * Global client initialization component / 전역 클라이언트 초기화 컴포넌트
 * Initializes Chrome Remote DevTools client on document load / 문서 로드 시 Chrome Remote DevTools 클라이언트 초기화
 */
export default function ClientInit() {
  useEffect(() => {
    // Initialize client on mount / 마운트 시 클라이언트 초기화
    // Popup mode uses postMessage (no serverUrl needed) / 팝업 모드는 postMessage 사용 (serverUrl 불필요)
    init({
      skipWebSocket: true,
      rrweb: {
        enable: true,
      },
    }).catch((error) => {
      console.error('Failed to initialize Chrome Remote DevTools:', error);
    });
  }, []);

  return null;
}
