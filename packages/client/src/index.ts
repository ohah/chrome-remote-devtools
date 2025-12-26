// CDP Client - WebSocket connection and CDP initialization / CDP 클라이언트 - WebSocket 연결 및 CDP 초기화
import { CDPClient } from './core/cdp-client';
import { getId } from './utils/debug-id';
import { getRrwebConfig, type RrwebConfig } from './config/rrweb-config';

// Global CDP client instance / 전역 CDP 클라이언트 인스턴스
let clientInstance: CDPClient | null = null;

/**
 * Initialize CDP client / CDP 클라이언트 초기화
 * @param serverUrl - Server URL / 서버 URL
 * @param rrwebConfig - Rrweb configuration / Rrweb 설정
 * @param skipWebSocket - Skip WebSocket connection / WebSocket 연결 건너뛰기
 */
export async function initCDPClient(
  serverUrl: string,
  rrwebConfig: RrwebConfig = { enable: false },
  skipWebSocket: boolean = false
): Promise<void> {
  // Destroy existing client if any / 기존 클라이언트가 있으면 제거
  if (clientInstance) {
    clientInstance.destroy();
  }

  // Create new client instance / 새 클라이언트 인스턴스 생성
  clientInstance = new CDPClient();
  await clientInstance.initialize(serverUrl, rrwebConfig, skipWebSocket);
}

// Auto-initialize CDP client / CDP 클라이언트 자동 초기화
if (typeof document !== 'undefined') {
  const script = document.currentScript as HTMLScriptElement | null;
  const serverUrl = script?.dataset.serverUrl || script?.getAttribute('data-server-url');
  const debugId = getId(); // Create debug_id / debug_id 생성

  // Skip WebSocket if no serverUrl (use postMessage only) / serverUrl이 없으면 WebSocket 건너뛰기 (postMessage만 사용)
  const skipWebSocket = !serverUrl;

  // If no serverUrl, use empty string (will be ignored in WebSocketClient) / serverUrl이 없으면 빈 문자열 사용 (WebSocketClient에서 무시됨)
  const effectiveServerUrl = serverUrl || '';

  // If in iframe and no serverUrl, notify parent about debug_id / iframe이고 serverUrl이 없으면 부모에 debug_id 알림
  if (skipWebSocket && window.parent !== window) {
    // Try to store in parent's sessionStorage via postMessage / postMessage로 부모의 sessionStorage에 저장 시도
    try {
      window.parent.postMessage({ type: 'SET_DEBUG_ID', debugId }, '*');
    } catch {
      // Ignore cross-origin errors / cross-origin 오류 무시
    }

    // Also try localStorage (shared in same origin) / localStorage도 시도 (같은 origin에서 공유)
    try {
      localStorage.setItem('debug_id', debugId);
    } catch {
      // Ignore if localStorage is not available / localStorage를 사용할 수 없으면 무시
    }
  }

  const rrwebConfig = getRrwebConfig(script);
  // Initialize CDP client with skipWebSocket flag / skipWebSocket 플래그로 CDP 클라이언트 초기화
  void initCDPClient(effectiveServerUrl, rrwebConfig, skipWebSocket);
}

// Global API for export / export를 위한 전역 API
if (typeof window !== 'undefined') {
  (window as any).chromeRemoteDevTools = {
    async exportEvents() {
      if (!clientInstance) {
        throw new Error('CDP client not initialized / CDP 클라이언트가 초기화되지 않았습니다');
      }
      const domain = clientInstance.getDomain();
      if (!domain) {
        throw new Error('CDP domain not available / CDP 도메인을 사용할 수 없습니다');
      }
      const eventStorage = domain.getEventStorage();
      if (!eventStorage) {
        throw new Error('Event storage not available / 이벤트 저장소를 사용할 수 없습니다');
      }
      await eventStorage.exportToFile();
    },
  };
}
