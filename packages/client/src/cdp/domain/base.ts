// Base domain class for all CDP domains / 모든 CDP 도메인의 기본 클래스
import type { EventStorage } from '../../persistence/event-storage';

export default class BaseDomain {
  protected socket: WebSocket | null;
  namespace: string = '';
  protected eventStorage: EventStorage | null = null;
  protected devtoolsWindow: Window | null = null;
  private eventQueue: Array<{ type: string; message: string }> = [];

  // Index signature for dynamic method access / 동적 메서드 접근을 위한 인덱스 시그니처
  [key: string]: WebSocket | string | unknown | null;

  constructor(options: { socket: WebSocket | null; eventStorage?: EventStorage }) {
    this.socket = options.socket;
    this.eventStorage = options.eventStorage || null;
  }

  /**
   * Set DevTools window for postMessage communication / postMessage 통신을 위한 DevTools window 설정
   * @param devtoolsWindow - DevTools window reference / DevTools window 참조
   */
  setDevToolsWindow(devtoolsWindow: Window): void {
    this.devtoolsWindow = devtoolsWindow;
    // Send queued events now that DevTools is ready / DevTools가 준비되었으므로 큐에 저장된 이벤트 전송
    this.flushEventQueue();
  }

  /**
   * Flush queued events to DevTools / 큐에 저장된 이벤트를 DevTools로 전송
   */
  private flushEventQueue(): void {
    if (!this.devtoolsWindow || this.eventQueue.length === 0) {
      return;
    }

    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      if (event) {
        try {
          this.devtoolsWindow.postMessage(event, '*');
        } catch (e) {
          console.warn('Failed to send queued postMessage event:', e);
        }
      }
    }
  }

  // Enable domain / 도메인 활성화
  enable(): void {
    // Override in subclasses / 서브클래스에서 오버라이드
  }

  // Send CDP message / CDP 메시지 전송
  protected send(data: unknown): void {
    // Check if this is an event (has method but no id) / 이벤트인지 확인 (method는 있지만 id는 없음)
    const eventData = data as { method?: string; id?: number; params?: unknown };
    if (eventData.method && eventData.id === undefined) {
      // This is an event, try to save it / 이벤트이므로 저장 시도
      // Save to IndexedDB in both WebSocket and postMessage modes / WebSocket 및 postMessage 모드 모두에서 IndexedDB에 저장
      if (this.eventStorage) {
        void this.eventStorage.saveEvent(eventData.method, eventData.params);
      }
    }

    // Send via WebSocket if socket exists and is connected / 소켓이 있고 연결되어 있으면 WebSocket으로 전송
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const message = JSON.stringify(data);
      this.socket.send(message);
    } else if (eventData.method && eventData.id === undefined) {
      // If no WebSocket or not open and this is an event, send via postMessage / WebSocket이 없거나 열려있지 않고 이벤트인 경우 postMessage로 전송
      // This happens when skipWebSocket is true (postMessage mode) / skipWebSocket이 true일 때 발생 (postMessage 모드)
      if (typeof window !== 'undefined') {
        const cdpMessage = {
          type: 'CDP_MESSAGE',
          message: JSON.stringify(data),
        };

        // Try to use stored DevTools window first / 먼저 저장된 DevTools window 사용 시도
        let targetWindow: Window | null = null;
        if (this.devtoolsWindow) {
          targetWindow = this.devtoolsWindow;
        } else {
          // Fallback: try to find parent/opener window / 폴백: parent/opener window 찾기 시도
          targetWindow = window.opener || (window !== window.top ? window.parent : null);
        }

        if (targetWindow) {
          try {
            targetWindow.postMessage(cdpMessage, '*');
          } catch (e) {
            // If postMessage fails, queue the event / postMessage 실패 시 이벤트를 큐에 저장
            console.warn('Failed to send postMessage event, queuing:', e);
            this.eventQueue.push(cdpMessage);
          }
        } else {
          // No target window yet, queue the event / 대상 창이 아직 없으면 이벤트를 큐에 저장
          this.eventQueue.push(cdpMessage);
        }
      }
    }
  }
}
