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

    // Automatically replay stored events when enabled (same as WebSocket mode) / 활성화 시 저장된 이벤트 자동 재생 (웹소켓 모드와 동일)
    void this.replayStoredEvents().catch((error) => {
      console.error(
        'Failed to replay stored SessionReplay events / 저장된 SessionReplay 이벤트 재생 실패:',
        error
      );
    });
  }

  // Override setDevToolsWindow to replay stored events when DevTools is ready (postMessage mode) / DevTools 준비 시 저장된 이벤트를 재생하도록 setDevToolsWindow 오버라이드 (postMessage 모드)
  override setDevToolsWindow(devtoolsWindow: Window): void {
    // Set devtoolsWindow first so replayStoredEvents() can use it / replayStoredEvents()가 사용할 수 있도록 먼저 devtoolsWindow 설정
    this.devtoolsWindow = devtoolsWindow;

    // Replay stored events if enabled (postMessage mode) / 활성화된 경우 저장된 이벤트 재생 (postMessage 모드)
    // Wait for replayStoredEvents() to complete before calling super.setDevToolsWindow() / super.setDevToolsWindow() 호출 전에 replayStoredEvents() 완료 대기
    if (this.isEnabled) {
      void this.replayStoredEvents()
        .then(() => {
          // Call super.setDevToolsWindow() after replaying SessionReplay events / SessionReplay 이벤트 재생 후 super.setDevToolsWindow() 호출
          // This will send other events (console, network) and clear all events / 다른 이벤트(console, network)를 전송하고 모든 이벤트를 삭제함
          super.setDevToolsWindow(devtoolsWindow);
        })
        .catch((error) => {
          console.error(
            'Failed to replay stored SessionReplay events after DevTools ready / DevTools 준비 후 저장된 SessionReplay 이벤트 재생 실패:',
            error
          );
          // Still call super.setDevToolsWindow() even if replay failed / 재생 실패해도 super.setDevToolsWindow() 호출
          super.setDevToolsWindow(devtoolsWindow);
        });
    } else {
      // If not enabled, just call super.setDevToolsWindow() / 활성화되지 않았으면 super.setDevToolsWindow()만 호출
      super.setDevToolsWindow(devtoolsWindow);
    }
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
    if (!this.eventStorage) {
      return { success: false };
    }

    try {
      const storedMessages = await this.eventStorage.getEvents();
      // Filter SessionReplay events from postMessage format / postMessage 형식에서 SessionReplay 이벤트 필터링
      const sessionReplayMessages = storedMessages.filter((msg) => {
        try {
          const cdpMessage = JSON.parse(msg.message);
          return cdpMessage.method === 'SessionReplay.eventRecorded';
        } catch {
          return false;
        }
      });

      if (sessionReplayMessages.length === 0) {
        return { success: true, count: 0 };
      }

      let sentCount = 0;
      for (const postMessage of sessionReplayMessages) {
        try {
          const cdpMessage = JSON.parse(postMessage.message);
          const params = cdpMessage.params as { events?: unknown[] };
          if (params && Array.isArray(params.events) && params.events.length > 0) {
            // For WebSocket mode: send CDP message directly / WebSocket 모드: CDP 메시지 직접 전송
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
              this.socket.send(JSON.stringify(cdpMessage));
              sentCount++;
            } else if (!this.socket) {
              // For postMessage mode: use stored postMessage format directly / postMessage 모드: 저장된 postMessage 형식을 직접 사용
              if (this.devtoolsWindow) {
                try {
                  this.devtoolsWindow.postMessage(postMessage, '*');
                  sentCount++;
                } catch (error) {
                  console.warn(
                    '[SessionReplay] Failed to send event via postMessage / [SessionReplay] postMessage로 이벤트 전송 실패:',
                    error
                  );
                }
              } else {
                // DevTools window not ready yet, will retry when setDevToolsWindow is called / DevTools window가 아직 준비되지 않음, setDevToolsWindow 호출 시 재시도
                return { success: false };
              }
            }
            // Small delay between events / 이벤트 간 작은 지연
            await new Promise((resolve) => setTimeout(resolve, 10));
          } else {
            console.warn(
              `[SessionReplay] Event params invalid or empty events array / [SessionReplay] 이벤트 params가 유효하지 않거나 events 배열이 비어있음:`,
              params
            );
          }
        } catch (error) {
          console.warn('[SessionReplay] Failed to parse stored message / [SessionReplay] 저장된 메시지 파싱 실패:', error);
        }
      }

      // Clear SessionReplay events after sending / 전송 후 SessionReplay 이벤트 삭제
      if (sentCount > 0 && this.eventStorage) {
        // Clear only SessionReplay events / SessionReplay 이벤트만 삭제
        await this.eventStorage.clearEvents(['SessionReplay.']);
      }

      return { success: true, count: sentCount };
    } catch (error) {
      console.error('Failed to replay stored events / 저장된 이벤트 재생 실패:', error);
      return { success: false };
    }
  }
}
