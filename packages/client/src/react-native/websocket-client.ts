// WebSocket client for React Native / React Native용 WebSocket 클라이언트

import { SessionReplayDomain } from './session-replay';
import { ConsoleDomain } from './console';
import { getId, getQuery } from './utils';

/**
 * WebSocket client for React Native / React Native용 WebSocket 클라이언트
 */
export class ReactNativeWebSocketClient {
  private socket: WebSocket | null = null;
  private sessionReplay: SessionReplayDomain | null = null;
  private consoleDomain: ConsoleDomain | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private serverUrl: string) {}

  /**
   * Build WebSocket URL with correct path / 올바른 경로로 WebSocket URL 구성
   */
  private buildWebSocketUrl(): string {
    // Extract protocol and host from serverUrl / serverUrl에서 프로토콜과 호스트 추출
    let protocol = 'ws:';
    if (this.serverUrl.startsWith('wss://') || this.serverUrl.startsWith('https://')) {
      protocol = 'wss:';
    } else if (this.serverUrl.startsWith('ws://') || this.serverUrl.startsWith('http://')) {
      protocol = 'ws:';
    }

    const host = this.serverUrl.replace(/^(http|https|ws|wss):\/\//i, '');
    const clientId = getId();
    const query = getQuery();

    // Build URL: ws://host/remote/debug/client/:id?query / URL 구성: ws://host/remote/debug/client/:id?query
    return `${protocol}//${host}/remote/debug/client/${clientId}?${query}`;
  }

  /**
   * Initialize WebSocket connection / WebSocket 연결 초기화
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = this.buildWebSocketUrl();
        console.log('[React Native] Connecting to / [React Native] 연결 중:', wsUrl);
        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
          console.log('[React Native] WebSocket connected / [React Native] WebSocket 연결됨');
          this.reconnectAttempts = 0;
          this.sessionReplay = new SessionReplayDomain((message) => this.send(message));
          // Enable console domain by default / 기본적으로 console 도메인 활성화
          this.consoleDomain = new ConsoleDomain((message) => this.send(message));
          this.consoleDomain.enable();
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
            // Check if data is already an object (parsed) / 데이터가 이미 객체(파싱됨)인지 확인
            const isObject = typeof event.data === 'object' && event.data !== null;
            const isBlob = event.data instanceof Blob;
            const isArrayBuffer = event.data instanceof ArrayBuffer;
            const isString = typeof event.data === 'string';

            if (isObject && !isBlob && !isArrayBuffer) {
              // Check if it looks like a CDP message object / CDP 메시지 객체처럼 보이는지 확인
              const data = event.data as Record<string, unknown>;
              if ('method' in data || 'id' in data || 'result' in data || 'error' in data) {
                // Already parsed object, use directly / 이미 파싱된 객체, 직접 사용
                this.handleMessage(event.data);
                return;
              }
            }

            // Convert to string / 문자열로 변환
            let messageText: string;
            if (isString) {
              messageText = event.data as string;
            } else if (isBlob) {
              // Blob: convert to text asynchronously / Blob: 비동기로 텍스트 변환
              (event.data as Blob).text().then((text) => {
                try {
                  const message = JSON.parse(text);
                  this.handleMessage(message);
                } catch (error) {
                  // Use native console.error to avoid hooking / 훅을 피하기 위해 네이티브 console.error 사용
                  const nativeError = console.error;
                  if (nativeError) {
                    nativeError(
                      '[React Native] Failed to parse Blob message / [React Native] Blob 메시지 파싱 실패:',
                      error,
                      'Text:',
                      text
                    );
                  }
                }
              });
              return;
            } else if (isArrayBuffer) {
              // Convert ArrayBuffer to string manually (TextDecoder not available in React Native) / ArrayBuffer를 수동으로 문자열로 변환 (React Native에는 TextDecoder 없음)
              const buffer = event.data as ArrayBuffer;
              const uint8Array = new Uint8Array(buffer);
              // Convert to string using String.fromCharCode / String.fromCharCode를 사용하여 문자열로 변환
              // For large buffers, process in chunks to avoid stack overflow / 큰 버퍼의 경우 스택 오버플로우를 피하기 위해 청크로 처리
              const chunkSize = 8192;
              let result = '';
              for (let i = 0; i < uint8Array.length; i += chunkSize) {
                const chunk = uint8Array.slice(i, i + chunkSize);
                result += String.fromCharCode.apply(null, Array.from(chunk));
              }
              messageText = result;
            } else {
              // Fallback: convert to string / 폴백: string으로 변환
              messageText = String(event.data);
            }

            // Try to parse JSON / JSON 파싱 시도
            const message = JSON.parse(messageText);
            // Process CDP messages / CDP 메시지 처리
            this.handleMessage(message);
          } catch (error) {
            // Use native console.error to avoid hooking / 훅을 피하기 위해 네이티브 console.error 사용
            // Log raw data for debugging / 디버깅을 위해 원본 데이터 로그
            const nativeError = console.error;
            if (nativeError) {
              nativeError(
                '[React Native] Failed to parse message / [React Native] 메시지 파싱 실패:',
                error,
                'Data type:',
                typeof event.data,
                'Data constructor:',
                event.data?.constructor?.name,
                'Data:',
                event.data,
                'Data string (first 200 chars):',
                String(event.data).substring(0, 200)
              );
            }
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
    // Handle CDP commands and send responses / CDP 명령 처리 및 응답 전송
    if (typeof message === 'object' && message !== null) {
      const cdpMessage = message as { id?: number; method?: string; params?: unknown };

      // If it's a command (has id), send response / 명령인 경우 (id가 있음) 응답 전송
      if (cdpMessage.id !== undefined && cdpMessage.method) {
        // Send empty result for all enable commands and other commands / 모든 enable 명령 및 기타 명령에 대해 빈 결과 전송
        this.send({
          id: cdpMessage.id,
          result: {},
        });
      }
      // Events (no id) don't need responses / 이벤트(id 없음)는 응답이 필요 없음
    }
  }

  /**
   * Send message through WebSocket / WebSocket을 통해 메시지 전송
   */
  private send(message: unknown): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      // Use native console.warn to avoid hooking / 훅을 피하기 위해 네이티브 console.warn 사용
      const nativeWarn = console.warn;
      if (nativeWarn) {
        nativeWarn(
          '[React Native] WebSocket not connected / [React Native] WebSocket 연결되지 않음'
        );
      }
      return;
    }

    try {
      const messageStr = JSON.stringify(message);
      this.socket.send(messageStr);
    } catch (error) {
      // Use native console.error to avoid hooking / 훅을 피하기 위해 네이티브 console.error 사용
      const nativeError = console.error;
      if (nativeError) {
        nativeError(
          '[React Native] Failed to send message / [React Native] 메시지 전송 실패:',
          error
        );
      }
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
   * Get Console domain / Console 도메인 가져오기
   */
  getConsole(): ConsoleDomain | null {
    return this.consoleDomain;
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

    // Disable console domain before cleanup / 정리 전에 console 도메인 비활성화
    if (this.consoleDomain) {
      this.consoleDomain.disable();
      this.consoleDomain = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.sessionReplay = null;
  }
}
