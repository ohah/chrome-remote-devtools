// Message sender utilities for replay mode / replay 모드를 위한 메시지 전송 유틸리티
import type { PostMessageCDPMessage } from '@/shared/lib/file-to-cdp';
import type { ResponseBodyStore } from '../types';

/**
 * Send fake response for command / 명령에 대한 가짜 응답 전송
 * @param targetWindow - Target window to send message to / 메시지를 전송할 대상 창
 * @param commandId - Command ID / 명령 ID
 * @param result - Response result / 응답 결과
 */
export function sendFakeResponse(targetWindow: Window, commandId: number, result?: unknown): void {
  // Send fake response for command / 명령에 대한 가짜 응답 전송
  // In replay mode, there's no backend, so we simulate successful responses / replay 모드에서는 백엔드가 없으므로 성공 응답을 시뮬레이션
  setTimeout(() => {
    const responseMessage = {
      type: 'CDP_MESSAGE' as const,
      message: JSON.stringify({
        id: commandId,
        result: result || {}, // Use provided result or empty object / 제공된 result 사용 또는 빈 객체
      }),
    };
    targetWindow.postMessage(responseMessage, '*');
  }, 10); // Small delay to ensure command is processed first / 명령이 먼저 처리되도록 작은 지연
}

/**
 * Send buffered CDP messages / 버퍼에 있는 CDP 메시지 전송
 * @param messages - Messages to send / 전송할 메시지
 * @param targetWindow - Target window to send messages to / 메시지를 전송할 대상 창
 * @param responseBodyStore - Response body store / 응답 본문 저장소
 */
export async function sendBufferedMessages(
  messages: PostMessageCDPMessage[],
  targetWindow: Window,
  responseBodyStore: ResponseBodyStore
): Promise<void> {
  if (messages.length === 0) {
    return;
  }

  // Extract and store response bodies from responseReceived events before sending / 전송 전에 responseReceived 이벤트에서 응답 본문 추출 및 저장
  const responseReceivedEvents: Array<{ requestId: string; body: string }> = [];
  for (const msg of messages) {
    try {
      const parsed = JSON.parse(msg.message);
      if (parsed.method === 'Network.responseReceived' && parsed.params?.response?.body) {
        const requestId = parsed.params.requestId;
        const body = parsed.params.response.body;
        if (requestId && body) {
          responseBodyStore.store(requestId, body);
          responseReceivedEvents.push({ requestId, body });
        }
      }
    } catch {
      // Ignore parsing errors / 파싱 오류 무시
    }
  }

  // Wait a bit to ensure response bodies are stored / 응답 본문이 저장되었는지 확인하기 위해 잠시 대기
  if (responseReceivedEvents.length > 0) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  // Send messages in batches / 배치로 메시지 전송
  const batchSize = 100;
  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize);
    for (const message of batch) {
      try {
        targetWindow.postMessage(message, '*');
      } catch {
        // Failed to send message / 메시지 전송 실패
      }
    }
    // Small delay between batches / 배치 간 작은 지연
    if (i + batchSize < messages.length) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
}

/**
 * Send storage items as domStorageItemAdded events / storage 항목을 domStorageItemAdded 이벤트로 전송
 * @param storageItems - Storage items to send / 전송할 storage 항목
 * @param targetWindow - Target window to send messages to / 메시지를 전송할 대상 창
 */
export function sendStorageItemsAsEvents(
  storageItems: { localStorage: Array<[string, string]>; sessionStorage: Array<[string, string]> },
  targetWindow: Window
): void {
  const storageKey = window.location.origin;

  // Send localStorage items as domStorageItemAdded events / localStorage 항목을 domStorageItemAdded 이벤트로 전송
  storageItems.localStorage.forEach(([key, value]) => {
    const eventData = {
      method: 'DOMStorage.domStorageItemAdded',
      params: {
        storageId: {
          isLocalStorage: true,
          storageKey,
          securityOrigin: storageKey,
        },
        key,
        newValue: value,
      },
    };
    const eventMessage = {
      type: 'CDP_MESSAGE' as const,
      message: JSON.stringify(eventData),
    };
    targetWindow.postMessage(eventMessage, '*');
  });

  // Send sessionStorage items as domStorageItemAdded events / sessionStorage 항목을 domStorageItemAdded 이벤트로 전송
  storageItems.sessionStorage.forEach(([key, value]) => {
    const eventData = {
      method: 'DOMStorage.domStorageItemAdded',
      params: {
        storageId: {
          isLocalStorage: false,
          storageKey,
          securityOrigin: storageKey,
        },
        key,
        newValue: value,
      },
    };
    const eventMessage = {
      type: 'CDP_MESSAGE' as const,
      message: JSON.stringify(eventData),
    };
    targetWindow.postMessage(eventMessage, '*');
  });
}
