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
   * Save CDP message to IndexedDB / IndexedDB에 CDP 메시지 저장
   * Can save both events and commands / 이벤트와 명령 모두 저장 가능
   */
  private saveMessageToStorage(cdpMessage: unknown): void {
    if (this.eventStorage) {
      void this.eventStorage.saveMessage(cdpMessage);
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
      (data as any).id === undefined
    );
  }

  /**
   * Send stored messages from IndexedDB to DevTools / IndexedDB에 저장된 메시지를 DevTools로 전송
   * Note: SessionReplay events are excluded and handled separately by SessionReplay domain / 참고: SessionReplay 이벤트는 제외되고 SessionReplay 도메인에서 별도로 처리됨
   */
  private async sendStoredEventsFromIndexedDB(): Promise<void> {
    // In replay mode, don't send stored events / replay 모드에서는 저장된 이벤트를 전송하지 않음
    // Only file-based messages should be sent in replay mode / replay 모드에서는 파일 기반 메시지만 전송되어야 함
    if (typeof window !== 'undefined' && (window as any).__CHROME_REMOTE_DEVTOOLS_REPLAY_MODE__) {
      return;
    }

    if (!this.devtoolsWindow || !this.eventStorage) {
      return;
    }

    try {
      const storedMessages = await this.eventStorage.getEvents();
      if (storedMessages.length > 0) {
        // Filter out SessionReplay events (handled separately by SessionReplay domain) / SessionReplay 이벤트 제외 (SessionReplay 도메인에서 별도 처리)
        const messagesToSend = storedMessages.filter((msg) => {
          try {
            const cdpMessage = JSON.parse(msg.message);
            const method = cdpMessage.method || '';
            return !method.startsWith('SessionReplay.');
          } catch {
            return true; // If parsing fails, include it / 파싱 실패 시 포함
          }
        });

        if (messagesToSend.length > 0) {
          // Send all messages in batches (already in postMessage format) / 모든 메시지를 배치로 전송 (이미 postMessage 형식)
          const batchSize = 100;
          for (let i = 0; i < messagesToSend.length; i += batchSize) {
            const batch = messagesToSend.slice(i, i + batchSize);
            for (const message of batch) {
              // Use stored postMessage format directly / 저장된 postMessage 형식을 직접 사용
              this.sendViaPostMessage(message, this.devtoolsWindow!);
            }
            // Small delay between batches / 배치 간 작은 지연
            await new Promise((resolve) => setTimeout(resolve, 10));
          }
        }

        // Clear non-SessionReplay messages after sending / 전송 후 SessionReplay가 아닌 메시지 삭제
        // SessionReplay events will be sent separately by SessionReplay.replayStoredEvents() / SessionReplay 이벤트는 SessionReplay.replayStoredEvents()에서 별도로 전송됨
        await this.eventStorage.clearEvents(['SessionReplay.']);
      }
    } catch (error) {
      console.error(
        'Failed to send stored messages to DevTools / 저장된 메시지를 DevTools로 전송 실패:',
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
   * Handles message storage, WebSocket transmission, and postMessage fallback / 메시지 저장, WebSocket 전송, postMessage 폴백 처리
   */
  protected send(data: unknown): void {
    // In replay mode, only file-based messages should be sent / replay 모드에서는 파일 기반 메시지만 전송되어야 함
    // File messages are sent directly from DevToolsPlayground, not through this method / 파일 메시지는 DevToolsPlayground에서 직접 전송되며, 이 메서드를 거치지 않음
    // Block all other message sending (stored events, new events) / 다른 모든 메시지 전송 차단 (저장된 이벤트, 새로운 이벤트)
    if (typeof window !== 'undefined' && (window as any).__CHROME_REMOTE_DEVTOOLS_REPLAY_MODE__) {
      return;
    }

    // Save all CDP messages (events and commands) to storage / 모든 CDP 메시지(이벤트 및 명령)를 저장소에 저장
    if (this.isCDPMessage(data)) {
      this.saveMessageToStorage(data);
    }

    // Try to send via WebSocket first / 먼저 WebSocket으로 전송 시도
    if (this.sendViaWebSocket(data)) {
      return;
    }

    // If WebSocket is not available and this is a message, use postMessage / WebSocket을 사용할 수 없고 메시지인 경우 postMessage 사용
    // This happens when skipWebSocket is true (postMessage mode) / skipWebSocket이 true일 때 발생 (postMessage 모드)
    if (this.isCDPMessage(data)) {
      const targetWindow = this.getTargetWindow();
      const cdpMessage = this.createCDPMessage(data);

      if (targetWindow) {
        // Try to send via postMessage / postMessage로 전송 시도
        if (!this.sendViaPostMessage(cdpMessage, targetWindow)) {
          // If postMessage fails, queue the message / postMessage 실패 시 메시지를 큐에 저장
          this.queueEvent(cdpMessage);
        }
      } else {
        // No target window yet, queue the message / 대상 창이 아직 없으면 메시지를 큐에 저장
        this.queueEvent(cdpMessage);
      }
    }
  }

  /**
   * Check if data is a CDP message (event or command) / 데이터가 CDP 메시지(이벤트 또는 명령)인지 확인
   */
  private isCDPMessage(data: unknown): boolean {
    if (typeof data !== 'object' || data === null) {
      return false;
    }
    // Must have method (for events) or id (for commands) / method(이벤트용) 또는 id(명령용)가 있어야 함
    return 'method' in data || 'id' in data;
  }
}
