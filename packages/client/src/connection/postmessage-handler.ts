// PostMessage handler for CDP communication / CDP 통신을 위한 PostMessage 핸들러
import type ChromeDomain from '../cdp';
import type { CDPResponse } from '../cdp/types';

/**
 * CDP execute result type / CDP execute 결과 타입
 * Matches ChromeDomain.execute() return type / ChromeDomain.execute() 반환 타입과 일치
 * Can be a CDPResponse or a Promise that resolves to CDPResponse / CDPResponse 또는 CDPResponse로 resolve되는 Promise일 수 있음
 */
export type CDPExecuteResult = CDPResponse | Promise<CDPResponse>;

/**
 * PostMessage handler class / PostMessage 핸들러 클래스
 */
export class PostMessageHandler {
  private handler: ((event: MessageEvent) => void) | null = null;
  private devtoolsWindow: Window | null = null;

  constructor(private domain: ChromeDomain | null) {
    this.setup();
  }

  /**
   * Set domain instance / 도메인 인스턴스 설정
   */
  setDomain(domain: ChromeDomain | null): void {
    this.domain = domain;
    // Update DevTools window in domain if available / 도메인에 DevTools window가 있으면 업데이트
    if (this.devtoolsWindow && domain) {
      domain.setDevToolsWindow(this.devtoolsWindow);
    }
  }

  /**
   * Setup message listener / 메시지 리스너 설정
   */
  private setup(): void {
    this.handler = this.handleMessage.bind(this);
    window.addEventListener('message', this.handler);
  }

  /**
   * Check if source is a valid Window object / source가 유효한 Window 객체인지 확인
   * Uses postMessage method check instead of instanceof for cross-origin compatibility / 크로스 오리진 호환성을 위해 instanceof 대신 postMessage 메서드 확인 사용
   */
  private isWindow(source: MessageEventSource | null): source is Window {
    return (
      source !== null &&
      typeof source === 'object' &&
      'postMessage' in source &&
      typeof (source as any).postMessage === 'function'
    );
  }

  /**
   * Handle incoming postMessage events / 들어오는 postMessage 이벤트 처리
   */
  private handleMessage(event: MessageEvent): void {
    // Only process CDP messages / CDP 메시지만 처리
    if (!event.data || typeof event.data !== 'object') {
      return;
    }

    // Check if we're in replay mode and ignore messages from DevTools windows / replay 모드인지 확인하고 DevTools 창에서 온 메시지 무시
    if (typeof window !== 'undefined' && (window as any).__CHROME_REMOTE_DEVTOOLS_REPLAY_MODE__) {
      // In replay mode, ignore all messages from DevTools windows / replay 모드에서는 DevTools 창에서 온 모든 메시지 무시
      // Only file-based messages should be processed / 파일 기반 메시지만 처리되어야 함
      return;
    }

    // Handle DEVTOOLS_READY message / DEVTOOLS_READY 메시지 처리
    if (event.data.type === 'DEVTOOLS_READY') {
      // Try to store DevTools window reference / DevTools window 참조 저장 시도
      // Use isWindow() helper instead of instanceof for cross-origin compatibility / 크로스 오리진 호환성을 위해 instanceof 대신 isWindow() 헬퍼 사용
      if (this.isWindow(event.source)) {
        this.devtoolsWindow = event.source;
        // Update domain with DevTools window / 도메인에 DevTools window 업데이트
        if (this.domain) {
          this.domain.setDevToolsWindow(this.devtoolsWindow);
        }
      } else {
        // event.source is not available, will try to get it from CDP_MESSAGE / event.source를 사용할 수 없음, CDP_MESSAGE에서 시도할 예정
      }
      // Notify that DevTools is ready / DevTools 준비 완료 알림
      window.dispatchEvent(new CustomEvent('devtools-ready', { detail: { ready: true } }));
      return;
    }

    // Handle CDP_MESSAGE type (from PostMessageTransport) / CDP_MESSAGE 타입 처리 (PostMessageTransport에서)
    if (event.data.type === 'CDP_MESSAGE' && event.data.message) {
      // Store DevTools window if not already stored / 아직 저장되지 않았으면 DevTools window 저장
      if (!this.devtoolsWindow && this.isWindow(event.source)) {
        this.devtoolsWindow = event.source;
        // Update domain with DevTools window / 도메인에 DevTools window 업데이트
        if (this.domain) {
          this.domain.setDevToolsWindow(this.devtoolsWindow);
        }
      }
      this.handleCDPMessage(event, true);
      return;
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
    result: CDPExecuteResult,
    useLegacyFormat: boolean = false
  ): void {
    const send = (response: { id?: number; result?: unknown; error?: unknown }) => {
      if (response.id !== undefined && this.isWindow(source)) {
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
