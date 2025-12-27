// SessionReplay domain for React Native / React Native용 SessionReplay 도메인

/**
 * SessionReplay domain for sending rrweb events / rrweb 이벤트 전송을 위한 SessionReplay 도메인
 */
export class SessionReplayDomain {
  private isEnabled = false;
  private sendMessage: (message: unknown) => void;

  constructor(sendMessage: (message: unknown) => void) {
    this.sendMessage = sendMessage;
  }

  /**
   * Enable SessionReplay / SessionReplay 활성화
   */
  enable(): void {
    this.isEnabled = true;
  }

  /**
   * Disable SessionReplay / SessionReplay 비활성화
   */
  disable(): void {
    this.isEnabled = false;
  }

  /**
   * Send rrweb events / rrweb 이벤트 전송
   * @param events - Array of rrweb events / rrweb 이벤트 배열
   */
  sendEvent(params?: { events?: unknown[] }): { success: boolean } {
    if (!this.isEnabled) {
      return { success: false };
    }

    const events = params?.events || [];
    if (events.length === 0) {
      return { success: false };
    }

    this.sendMessage({
      method: 'SessionReplay.eventRecorded',
      params: {
        events,
      },
    });

    return { success: true };
  }

  /**
   * Check if SessionReplay is enabled / SessionReplay 활성화 여부 확인
   */
  isSessionReplayEnabled(): boolean {
    return this.isEnabled;
  }
}
