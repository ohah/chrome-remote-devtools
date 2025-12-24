// CDP Client main class / CDP 클라이언트 메인 클래스
import ChromeDomain from '../cdp';
import type { RrwebConfig } from '../config/rrweb-config';
import { WebSocketClient } from '../connection/websocket-client';
import { PostMessageHandler } from '../connection/postmessage-handler';
import { initRrwebRecording, type RrwebRecorderHandle } from '../initialization/rrweb-init';
import { keepScreenDisplay } from '../initialization/client-init';

/**
 * CDP Client class / CDP 클라이언트 클래스
 */
export class CDPClient {
  private domain: ChromeDomain | null = null;
  private rrwebRecorder: RrwebRecorderHandle | null = null;
  private websocketClient: WebSocketClient | null = null;
  private postMessageHandler: PostMessageHandler | null = null;

  /**
   * Initialize CDP client / CDP 클라이언트 초기화
   * @param serverUrl - Server URL / 서버 URL
   * @param rrwebConfig - Rrweb configuration / Rrweb 설정
   * @param skipWebSocket - Skip WebSocket connection / WebSocket 연결 건너뛰기
   */
  async initialize(
    serverUrl: string,
    rrwebConfig: RrwebConfig = { enable: false },
    skipWebSocket: boolean = false
  ): Promise<void> {
    // Initialize WebSocket client / WebSocket 클라이언트 초기화
    this.websocketClient = new WebSocketClient(
      serverUrl,
      rrwebConfig,
      skipWebSocket,
      (domain) => {
        this.domain = domain;
        // Update postMessage handler domain / postMessage 핸들러 도메인 업데이트
        if (this.postMessageHandler) {
          this.postMessageHandler.setDomain(domain);
        }
      },
      async (socket, domain) => {
        // Initialize rrweb recording / rrweb 녹화 초기화
        this.rrwebRecorder = await initRrwebRecording(socket, rrwebConfig, domain);
      }
    );

    await this.websocketClient.initialize();
    this.domain = this.websocketClient.getDomain();

    // Initialize postMessage handler / postMessage 핸들러 초기화
    this.postMessageHandler = new PostMessageHandler(this.domain);

    // Keep screen display active / 화면 표시 활성 상태 유지
    keepScreenDisplay();
  }

  /**
   * Get domain instance / 도메인 인스턴스 가져오기
   */
  getDomain(): ChromeDomain | null {
    return this.domain;
  }

  /**
   * Get rrweb recorder instance / rrweb 레코더 인스턴스 가져오기
   */
  getRrwebRecorder(): RrwebRecorderHandle | null {
    return this.rrwebRecorder;
  }

  /**
   * Get WebSocket client instance / WebSocket 클라이언트 인스턴스 가져오기
   */
  getWebSocketClient(): WebSocketClient | null {
    return this.websocketClient;
  }

  /**
   * Get postMessage handler instance / postMessage 핸들러 인스턴스 가져오기
   */
  getPostMessageHandler(): PostMessageHandler | null {
    return this.postMessageHandler;
  }

  /**
   * Destroy client and cleanup resources / 클라이언트 제거 및 리소스 정리
   */
  destroy(): void {
    if (this.websocketClient) {
      this.websocketClient.cleanup();
      this.websocketClient = null;
    }

    if (this.postMessageHandler) {
      this.postMessageHandler.destroy();
      this.postMessageHandler = null;
    }

    if (this.rrwebRecorder) {
      this.rrwebRecorder.stop();
      this.rrwebRecorder = null;
    }

    this.domain = null;
  }
}
