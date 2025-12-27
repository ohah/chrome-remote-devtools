// CDP Client - WebSocket connection and CDP initialization / CDP 클라이언트 - WebSocket 연결 및 CDP 초기화
import { CDPClient } from './core/cdp-client';
import { getId } from './utils/debug-id';
import type { RrwebConfig } from './config/rrweb-config';

// Global CDP client instance / 전역 CDP 클라이언트 인스턴스
let clientInstance: CDPClient | null = null;

/**
 * Configuration options for Chrome Remote DevTools / Chrome Remote DevTools 설정 옵션
 */
export interface ChromeRemoteDevToolsOptions {
  /** Server WebSocket URL / 서버 WebSocket URL */
  serverUrl?: string;
  /** Rrweb configuration / Rrweb 설정 */
  rrweb?: RrwebConfig;
  /** Skip WebSocket connection (use postMessage only) / WebSocket 연결 건너뛰기 (postMessage만 사용) */
  skipWebSocket?: boolean;
}

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

/**
 * Initialize Chrome Remote DevTools / Chrome Remote DevTools 초기화
 * @param options - Configuration options / 설정 옵션
 */
export async function init(options: ChromeRemoteDevToolsOptions = {}): Promise<void> {
  const { serverUrl, rrweb = { enable: false }, skipWebSocket = false } = options;

  const effectiveServerUrl = serverUrl || '';
  const shouldSkipWebSocket = skipWebSocket || !serverUrl;

  // Always generate and store debug_id for testing and debugging / 테스트 및 디버깅을 위해 항상 debug_id 생성 및 저장
  if (typeof window !== 'undefined') {
    const debugId = getId(); // This will create and store in sessionStorage / sessionStorage에 생성 및 저장됨

    // If in iframe and no serverUrl, notify parent about debug_id / iframe이고 serverUrl이 없으면 부모에 debug_id 알림
    if (shouldSkipWebSocket && window.parent !== window) {
      try {
        window.parent.postMessage({ type: 'SET_DEBUG_ID', debugId }, '*');
      } catch {
        // Ignore cross-origin errors / cross-origin 오류 무시
      }
      try {
        localStorage.setItem('debug_id', debugId);
      } catch {
        // Ignore if localStorage is not available / localStorage를 사용할 수 없으면 무시
      }
    }
  }

  await initCDPClient(effectiveServerUrl, rrweb, shouldSkipWebSocket);
}

/**
 * Export events to file / 이벤트를 파일로 내보내기
 */
export async function exportEvents(): Promise<void> {
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
}

// Global API for browser / 브라우저용 전역 API
if (typeof window !== 'undefined') {
  (window as any).ChromeRemoteDevTools = {
    init,
    exportEvents,
  };
}

// Export types / 타입 export
export type { RrwebConfig } from './config/rrweb-config';
