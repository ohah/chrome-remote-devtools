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
   * Replay all stored messages (console, network, etc.) / 모든 저장된 메시지 재생 (console, network 등)
   * Called when Inspector connects to send previously stored messages / Inspector 연결 시 이전에 저장된 메시지를 전송하기 위해 호출됨
   */
  async replayStoredEvents(): Promise<{ success: boolean; count?: number }> {
    if (!this.eventStorage || !this.socket) {
      console.warn(
        'Cannot replay stored messages: eventStorage or socket not available / 저장된 메시지 재생 불가: eventStorage 또는 socket이 사용 불가'
      );
      return { success: false };
    }

    try {
      const storedMessages = await this.eventStorage.getEvents();

      if (storedMessages.length === 0) {
        return { success: true, count: 0 };
      }

      // Filter out SessionReplay events (handled separately) / SessionReplay 이벤트 제외 (별도 처리)
      const messagesToReplay = storedMessages.filter((msg) => {
        try {
          const cdpMessage = JSON.parse(msg.message);
          const method = cdpMessage.method || '';
          return !method.startsWith('SessionReplay.');
        } catch {
          return true; // If parsing fails, include it / 파싱 실패 시 포함
        }
      });

      if (messagesToReplay.length === 0) {
        return { success: true, count: 0 };
      }

      // Send all stored messages via WebSocket / WebSocket을 통해 모든 저장된 메시지 전송
      const batchSize = 100;
      let sentCount = 0;
      for (let i = 0; i < messagesToReplay.length; i += batchSize) {
        const batch = messagesToReplay.slice(i, i + batchSize);
        for (const postMessage of batch) {
          if (this.socket.readyState === WebSocket.OPEN) {
            try {
              // Parse postMessage format to extract CDP message / postMessage 형식을 파싱하여 CDP 메시지 추출
              const cdpMessage = JSON.parse(postMessage.message);
              this.socket.send(JSON.stringify(cdpMessage));
              sentCount++;
            } catch (error) {
              console.warn('Failed to parse stored message / 저장된 메시지 파싱 실패:', error);
            }
          } else {
            console.warn(
              `WebSocket not open, cannot send message / WebSocket이 열려있지 않아 메시지 전송 불가`
            );
          }
        }
        // Small delay between batches / 배치 간 작은 지연
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      return { success: true, count: sentCount };
    } catch (error) {
      console.error('Failed to replay stored messages / 저장된 메시지 재생 실패:', error);
      return { success: false };
    }
  }
}
