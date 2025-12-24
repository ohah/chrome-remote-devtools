// Base domain class for all CDP domains / 모든 CDP 도메인의 기본 클래스
import type { DomainOptions, CDPEvent, PostMessageCDPMessage } from '../types';

export default class BaseDomain {
  protected socket: WebSocket | null;
  namespace: string = '';
  protected eventStorage: DomainOptions['eventStorage'];
  protected devtoolsWindow: Window | null = null;
  private eventQueue: PostMessageCDPMessage[] = [];

  // Index signature for dynamic method access / 동적 메서드 접근을 위한 인덱스 시그니처
  [key: string]: WebSocket | string | unknown | null;

  constructor(options: DomainOptions) {
    this.socket = options.socket;
    this.eventStorage = options.eventStorage;
  }

  /**
   * Set DevTools window for postMessage communication / postMessage 통신을 위한 DevTools window 설정
   * @param devtoolsWindow - DevTools window reference / DevTools window 참조
   */
  setDevToolsWindow(devtoolsWindow: Window): void {
    this.devtoolsWindow = devtoolsWindow;
    // Send queued events now that DevTools is ready / DevTools가 준비되었으므로 큐에 저장된 이벤트 전송
    this.flushEventQueue();
    // Send stored events from IndexedDB / IndexedDB에 저장된 이벤트 전송
    void this.sendStoredEventsFromIndexedDB();
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

  /**
   * Create CDP message for postMessage / postMessage용 CDP 메시지 생성
   */
  private createCDPMessage(data: unknown): PostMessageCDPMessage {
    return {
      type: 'CDP_MESSAGE',
      message: JSON.stringify(data),
    };
  }

  /**
   * Send message via postMessage / postMessage로 메시지 전송
   */
  private sendViaPostMessage(message: PostMessageCDPMessage, targetWindow: Window): boolean {
    try {
      targetWindow.postMessage(message, '*');
      return true;
    } catch (e) {
      console.warn('Failed to send postMessage event:', e);
      return false;
    }
  }

  /**
   * Get target window for postMessage / postMessage용 대상 창 가져오기
   */
  private getTargetWindow(): Window | null {
    if (typeof window === 'undefined') {
      return null;
    }

    // Try to use stored DevTools window first / 먼저 저장된 DevTools window 사용 시도
    if (this.devtoolsWindow) {
      return this.devtoolsWindow;
    }

    // Fallback: try to find parent/opener window / 폴백: parent/opener window 찾기 시도
    return window.opener || (window !== window.top ? window.parent : null);
  }

  /**
   * Queue event for later transmission / 나중에 전송하기 위해 이벤트를 큐에 저장
   */
  private queueEvent(message: PostMessageCDPMessage): void {
    this.eventQueue.push(message);
  }

  /**
   * Save event to IndexedDB / IndexedDB에 이벤트 저장
   */
  private saveEventToStorage(method: string, params: unknown): void {
    if (this.eventStorage) {
      void this.eventStorage.saveEvent(method, params);
    }
  }

  /**
   * Send event via WebSocket / WebSocket으로 이벤트 전송
   */
  private sendViaWebSocket(data: unknown): boolean {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const message = JSON.stringify(data);
      this.socket.send(message);
      return true;
    }
    return false;
  }

  /**
   * Check if data is a CDP event / 데이터가 CDP 이벤트인지 확인
   */
  private isCDPEvent(data: unknown): data is CDPEvent {
    return (
      typeof data === 'object' &&
      data !== null &&
      'method' in data &&
      typeof (data as any).method === 'string' &&
      !('id' in data)
    );
  }

  /**
   * Send stored events from IndexedDB to DevTools / IndexedDB에 저장된 이벤트를 DevTools로 전송
   */
  private async sendStoredEventsFromIndexedDB(): Promise<void> {
    if (!this.devtoolsWindow || !this.eventStorage) {
      return;
    }

    try {
      const storedEvents = await this.eventStorage.getEvents();
      if (storedEvents.length > 0) {
        console.log(
          `Sending ${storedEvents.length} stored events to DevTools / 저장된 ${storedEvents.length}개 이벤트를 DevTools로 전송`
        );

        // Send all events in batches / 모든 이벤트를 배치로 전송
        const batchSize = 100;
        for (let i = 0; i < storedEvents.length; i += batchSize) {
          const batch = storedEvents.slice(i, i + batchSize);
          for (const event of batch) {
            const cdpMessage = this.createCDPMessage({
              method: event.method,
              params: event.params,
            });
            this.sendViaPostMessage(cdpMessage, this.devtoolsWindow!);
          }
          // Small delay between batches / 배치 간 작은 지연
          await new Promise((resolve) => setTimeout(resolve, 10));
        }

        // Clear events after sending / 전송 후 이벤트 삭제
        await this.eventStorage.clearEvents();
        console.log('Cleared stored events after sending / 전송 후 저장된 이벤트 삭제');
      }
    } catch (error) {
      console.error(
        'Failed to send stored events to DevTools / 저장된 이벤트를 DevTools로 전송 실패:',
        error
      );
    }
  }

  // Enable domain / 도메인 활성화
  enable(): void {
    // Override in subclasses / 서브클래스에서 오버라이드
  }

  /**
   * Send CDP message / CDP 메시지 전송
   * Handles event storage, WebSocket transmission, and postMessage fallback / 이벤트 저장, WebSocket 전송, postMessage 폴백 처리
   */
  protected send(data: unknown): void {
    // Check if this is an event and save to storage / 이벤트인지 확인하고 저장소에 저장
    if (this.isCDPEvent(data)) {
      this.saveEventToStorage(data.method, data.params);
    }

    // Try to send via WebSocket first / 먼저 WebSocket으로 전송 시도
    if (this.sendViaWebSocket(data)) {
      return;
    }

    // If WebSocket is not available and this is an event, use postMessage / WebSocket을 사용할 수 없고 이벤트인 경우 postMessage 사용
    // This happens when skipWebSocket is true (postMessage mode) / skipWebSocket이 true일 때 발생 (postMessage 모드)
    if (this.isCDPEvent(data)) {
      const targetWindow = this.getTargetWindow();
      const cdpMessage = this.createCDPMessage(data);

      if (targetWindow) {
        // Try to send via postMessage / postMessage로 전송 시도
        if (!this.sendViaPostMessage(cdpMessage, targetWindow)) {
          // If postMessage fails, queue the event / postMessage 실패 시 이벤트를 큐에 저장
          this.queueEvent(cdpMessage);
        }
      } else {
        // No target window yet, queue the event / 대상 창이 아직 없으면 이벤트를 큐에 저장
        this.queueEvent(cdpMessage);
      }
    }
  }
}
