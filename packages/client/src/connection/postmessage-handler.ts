// PostMessage handler for CDP communication / CDP 통신을 위한 PostMessage 핸들러
import type ChromeDomain from '../cdp';

/**
 * CDP response type / CDP 응답 타입
 * Matches ChromeDomain.execute() return type / ChromeDomain.execute() 반환 타입과 일치
 */
export type CDPResponse =
  | { id?: number; result?: unknown; error?: unknown }
  | Promise<{ id?: number; result?: unknown; error?: unknown }>;

/**
 * PostMessage handler class / PostMessage 핸들러 클래스
 */
export class PostMessageHandler {
  private handler: ((event: MessageEvent) => void) | null = null;

  constructor(private domain: ChromeDomain | null) {
    this.setup();
  }

  /**
   * Set domain instance / 도메인 인스턴스 설정
   */
  setDomain(domain: ChromeDomain | null): void {
    this.domain = domain;
  }

  /**
   * Setup message listener / 메시지 리스너 설정
   */
  private setup(): void {
    this.handler = this.handleMessage.bind(this);
    window.addEventListener('message', this.handler);
  }

  /**
   * Handle incoming postMessage events / 들어오는 postMessage 이벤트 처리
   */
  private handleMessage(event: MessageEvent): void {
    // Only process CDP messages / CDP 메시지만 처리
    if (!event.data || typeof event.data !== 'object') {
      return;
    }

    // Handle DEVTOOLS_READY message / DEVTOOLS_READY 메시지 처리
    if (event.data.type === 'DEVTOOLS_READY') {
      // Notify that DevTools is ready / DevTools 준비 완료 알림
      window.dispatchEvent(new CustomEvent('devtools-ready', { detail: { ready: true } }));
      return;
    }

    // Handle CDP_MESSAGE type (from PostMessageTransport) / CDP_MESSAGE 타입 처리 (PostMessageTransport에서)
    if (event.data.type === 'CDP_MESSAGE' && event.data.message) {
      this.handleCDPMessage(event, true);
      return;
    }

    // Legacy: Check if this is a direct CDP message (has method or id) / 레거시: 직접 CDP 메시지인지 확인 (method 또는 id가 있음)
    const message = event.data as { id?: number; method?: string; params?: unknown };
    if (message.method || message.id !== undefined) {
      this.handleCDPMessage(event, false, true);
    }
  }

  /**
   * Handle CDP message / CDP 메시지 처리
   */
  private handleCDPMessage(
    event: MessageEvent,
    isJSONString: boolean,
    useLegacyFormat: boolean = false
  ): void {
    if (!this.domain) {
      return;
    }

    try {
      const message = isJSONString ? JSON.parse(event.data.message) : event.data;
      const result = this.domain.execute(message);
      this.sendResponse(event.source, message.id, result, useLegacyFormat);
    } catch (e) {
      console.warn('Failed to parse CDP message:', e);
    }
  }

  /**
   * Send response via postMessage / postMessage로 응답 전송
   */
  private sendResponse(
    source: MessageEventSource | null,
    messageId: number | undefined,
    result: CDPResponse,
    useLegacyFormat: boolean = false
  ): void {
    const send = (response: { id?: number; result?: unknown; error?: unknown }) => {
      if (response.id !== undefined && source instanceof Window) {
        try {
          if (useLegacyFormat) {
            // Legacy format / 레거시 형식
            source.postMessage(response, '*');
          } else {
            // CDP_MESSAGE format / CDP_MESSAGE 형식
            const cdpMessage = {
              type: 'CDP_MESSAGE',
              message: JSON.stringify(response),
            };
            source.postMessage(cdpMessage, '*');
          }
        } catch (e) {
          console.warn('Failed to send postMessage response:', e);
        }
      }
    };

    if (result instanceof Promise) {
      result.then(send).catch((error) => {
        send({
          id: messageId,
          error: {
            code: -32000,
            message: error instanceof Error ? error.message : String(error),
          },
        });
      });
    } else {
      send(result);
    }
  }

  /**
   * Destroy handler and cleanup / 핸들러 제거 및 정리
   */
  destroy(): void {
    if (this.handler) {
      window.removeEventListener('message', this.handler);
      this.handler = null;
    }
  }
}
