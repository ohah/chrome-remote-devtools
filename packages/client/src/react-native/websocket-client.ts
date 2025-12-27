// WebSocket client for React Native / React Native용 WebSocket 클라이언트

import { SessionReplayDomain } from './session-replay';

/**
 * WebSocket client for React Native / React Native용 WebSocket 클라이언트
 */
export class ReactNativeWebSocketClient {
  private socket: WebSocket | null = null;
  private sessionReplay: SessionReplayDomain | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private serverUrl: string) {}

  /**
   * Initialize WebSocket connection / WebSocket 연결 초기화
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(this.serverUrl);

        this.socket.onopen = () => {
          console.log('[React Native] WebSocket connected / [React Native] WebSocket 연결됨');
          this.reconnectAttempts = 0;
          this.sessionReplay = new SessionReplayDomain((message) => this.send(message));
          resolve();
        };

        this.socket.onerror = (error) => {
          console.error('[React Native] WebSocket error / [React Native] WebSocket 오류:', error);
          reject(error);
        };

        this.socket.onclose = () => {
          console.log('[React Native] WebSocket closed / [React Native] WebSocket 닫힘');
          this.attemptReconnect();
        };

        this.socket.onmessage = (event) => {
          // Handle incoming messages if needed / 필요시 들어오는 메시지 처리
          try {
            const message = JSON.parse(event.data);
            // Process CDP messages / CDP 메시지 처리
            this.handleMessage(message);
          } catch (error) {
            console.error(
              '[React Native] Failed to parse message / [React Native] 메시지 파싱 실패:',
              error
            );
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle incoming CDP messages / 들어오는 CDP 메시지 처리
   */
  private handleMessage(message: unknown): void {
    // Handle CDP responses if needed / 필요시 CDP 응답 처리
    // For now, just log / 지금은 로그만
    if (typeof message === 'object' && message !== null && 'method' in message) {
      console.log('[React Native] Received CDP message / [React Native] CDP 메시지 수신:', message);
    }
  }

  /**
   * Send message through WebSocket / WebSocket을 통해 메시지 전송
   */
  private send(message: unknown): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn(
        '[React Native] WebSocket not connected / [React Native] WebSocket 연결되지 않음'
      );
      return;
    }

    try {
      this.socket.send(JSON.stringify(message));
    } catch (error) {
      console.error(
        '[React Native] Failed to send message / [React Native] 메시지 전송 실패:',
        error
      );
    }
  }

  /**
   * Attempt to reconnect / 재연결 시도
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(
        '[React Native] Max reconnect attempts reached / [React Native] 최대 재연결 시도 횟수 도달'
      );
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff / 지수 백오프

    console.log(
      `[React Native] Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms / [React Native] 재연결 시도 중 (${this.reconnectAttempts}/${this.maxReconnectAttempts}) ${delay}ms 후`
    );

    this.reconnectTimer = setTimeout(() => {
      void this.initialize().catch((error) => {
        console.error('[React Native] Reconnection failed / [React Native] 재연결 실패:', error);
      });
    }, delay);
  }

  /**
   * Get SessionReplay domain / SessionReplay 도메인 가져오기
   */
  getSessionReplay(): SessionReplayDomain | null {
    return this.sessionReplay;
  }

  /**
   * Get WebSocket instance / WebSocket 인스턴스 가져오기
   */
  getSocket(): WebSocket | null {
    return this.socket;
  }

  /**
   * Check if WebSocket is connected / WebSocket 연결 여부 확인
   */
  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  /**
   * Cleanup and close connection / 정리 및 연결 닫기
   */
  cleanup(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.sessionReplay = null;
  }
}
