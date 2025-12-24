// Storage domain implementation / Storage 도메인 구현
import BaseDomain from '../base';

export class Storage extends BaseDomain {
  override namespace = 'Storage';

  // Get storage key for current frame / 현재 프레임의 storage key 가져오기
  getStorageKey(_params?: { frameId?: string }): { storageKey: string } {
    const storageKey = location.origin;
    return {
      storageKey,
    };
  }

  /**
   * Replay all stored events (console, network, etc.) / 모든 저장된 이벤트 재생 (console, network 등)
   * Called when Inspector connects to send previously stored events / Inspector 연결 시 이전에 저장된 이벤트를 전송하기 위해 호출됨
   */
  async replayStoredEvents(): Promise<{ success: boolean; count?: number }> {
    if (!this.eventStorage || !this.socket) {
      console.warn(
        'Cannot replay stored events: eventStorage or socket not available / 저장된 이벤트 재생 불가: eventStorage 또는 socket이 사용 불가'
      );
      return { success: false };
    }

    try {
      const storedEvents = await this.eventStorage.getEvents();

      if (storedEvents.length === 0) {
        return { success: true, count: 0 };
      }

      // Filter out SessionReplay events (handled separately) / SessionReplay 이벤트 제외 (별도 처리)
      const eventsToReplay = storedEvents.filter((e) => !e.method.startsWith('SessionReplay.'));

      if (eventsToReplay.length === 0) {
        return { success: true, count: 0 };
      }

      // Send all stored events via WebSocket / WebSocket을 통해 모든 저장된 이벤트 전송
      const batchSize = 100;
      let sentCount = 0;
      for (let i = 0; i < eventsToReplay.length; i += batchSize) {
        const batch = eventsToReplay.slice(i, i + batchSize);
        for (const event of batch) {
          if (this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(
              JSON.stringify({
                method: event.method,
                params: event.params,
              })
            );
            sentCount++;
          } else {
            console.warn(
              `WebSocket not open, cannot send event ${event.method} / WebSocket이 열려있지 않아 이벤트 ${event.method} 전송 불가`
            );
          }
        }
        // Small delay between batches / 배치 간 작은 지연
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      return { success: true, count: sentCount };
    } catch (error) {
      console.error('Failed to replay stored events / 저장된 이벤트 재생 실패:', error);
      return { success: false };
    }
  }
}
