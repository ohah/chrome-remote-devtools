// CDP message utilities / CDP 메시지 유틸리티
// Re-exports event send path from cdp/domain/base; raw send via WebSocket here / cdp/domain/base에서 이벤트 전송 경로 re-export, WebSocket 원시 전송은 여기

import { getCDPSender } from './websocket-client';

export {
  sendCDPEvent,
  setCDPEventSender,
  setCDPConnectionReady,
  type CDPEventMessage,
  type CDPEventSender,
} from './cdp/domain/base';

/**
 * Send CDP message to Inspector WebSocket / Inspector WebSocket으로 CDP 메시지 전송
 * @param serverHost Server host / 서버 호스트
 * @param serverPort Server port / 서버 포트
 * @param message CDP message object / CDP 메시지 객체
 * @returns Promise that resolves when message is sent / 메시지가 전송되면 resolve되는 Promise
 */
export async function sendCDPMessage(
  serverHost: string,
  serverPort: number,
  message: unknown
): Promise<void> {
  const sender = getCDPSender();
  if (sender == null) return;
  let messageStr: string;
  try {
    messageStr = JSON.stringify(message);
  } catch (e) {
    console.error('[CDPMessage] Failed to stringify message (e.g. circular ref, BigInt):', e);
    throw e;
  }
  sender(serverHost, serverPort, messageStr);
}
