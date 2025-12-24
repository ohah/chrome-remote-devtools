// SessionReplay domain implementation / SessionReplay 도메인 구현
import BaseDomain from './base';
import { Event } from './protocol';

export default class SessionReplay extends BaseDomain {
  override namespace = 'SessionReplay';
  private isEnabled = false;

  constructor(options: { socket: WebSocket }) {
    super(options);
  }

  // Enable SessionReplay domain / SessionReplay 도메인 활성화
  override enable(): void {
    this.isEnabled = true;
  }

  // Disable SessionReplay domain / SessionReplay 도메인 비활성화
  disable(): void {
    this.isEnabled = false;
  }

  // Send rrweb event as CDP event / rrweb 이벤트를 CDP 이벤트로 전송
  // This is a CDP method that can be called via execute() / execute()를 통해 호출 가능한 CDP 메서드
  sendEvent(params?: { events?: unknown[] }): { success: boolean } {
    if (!this.isEnabled) {
      return { success: false };
    }

    const events = params?.events || [];
    if (events.length === 0) {
      return { success: false };
    }

    this.send({
      method: Event.sessionReplayEventRecorded,
      params: {
        events,
      },
    });

    return { success: true };
  }
}
