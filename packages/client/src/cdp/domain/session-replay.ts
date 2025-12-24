// SessionReplay domain implementation / SessionReplay 도메인 구현
import BaseDomain from './base';
import { Event } from './protocol';
import type { DomainOptions } from '../types';

export default class SessionReplay extends BaseDomain {
  override namespace = 'SessionReplay';
  private isEnabled = false;

  constructor(options: DomainOptions) {
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

  // Replay stored events / 저장된 이벤트 재생
  async replayStoredEvents(): Promise<{ success: boolean; count?: number }> {
    if (!this.eventStorage || !this.socket) {
      console.warn(
        'Cannot replay SessionReplay events: eventStorage or socket not available / SessionReplay 이벤트 재생 불가: eventStorage 또는 socket이 사용 불가'
      );
      return { success: false };
    }

    try {
      const storedEvents = await this.eventStorage.getEvents();
      const sessionReplayEvents = storedEvents.filter(
        (e) => e.method === 'SessionReplay.eventRecorded'
      );

      if (sessionReplayEvents.length === 0) {
        return { success: true, count: 0 };
      }

      // Send stored SessionReplay events directly via WebSocket / 저장된 SessionReplay 이벤트를 WebSocket으로 직접 전송
      // Use direct socket.send() instead of this.send() to avoid re-storing events / 이벤트를 다시 저장하지 않도록 this.send() 대신 직접 socket.send() 사용
      let sentCount = 0;
      for (const event of sessionReplayEvents) {
        const params = event.params as { events?: unknown[] };
        if (params && Array.isArray(params.events) && params.events.length > 0) {
          if (this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(
              JSON.stringify({
                method: Event.sessionReplayEventRecorded,
                params: {
                  events: params.events,
                },
              })
            );
            sentCount++;
          } else {
            console.warn(
              `WebSocket not open, cannot send SessionReplay event / WebSocket이 열려있지 않아 SessionReplay 이벤트 전송 불가`
            );
          }
          // Small delay between events / 이벤트 간 작은 지연
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }

      return { success: true, count: sentCount };
    } catch (error) {
      console.error('Failed to replay stored events / 저장된 이벤트 재생 실패:', error);
      return { success: false };
    }
  }
}
