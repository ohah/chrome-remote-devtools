// Base domain class for all CDP domains / 모든 CDP 도메인의 기본 클래스
import type { EventStorage } from '../../persistence/event-storage';

export default class BaseDomain {
  protected socket: WebSocket;
  namespace: string = '';
  protected eventStorage: EventStorage | null = null;

  // Index signature for dynamic method access / 동적 메서드 접근을 위한 인덱스 시그니처
  [key: string]: WebSocket | string | unknown;

  constructor(options: { socket: WebSocket; eventStorage?: EventStorage }) {
    this.socket = options.socket;
    this.eventStorage = options.eventStorage || null;
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
      if (this.eventStorage) {
        void this.eventStorage.saveEvent(eventData.method, eventData.params);
      }
    }

    if (this.socket.readyState === WebSocket.OPEN) {
      const message = JSON.stringify(data);
      this.socket.send(message);
    }
  }
}
