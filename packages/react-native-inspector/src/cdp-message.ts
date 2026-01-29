// CDP message utilities / CDP 메시지 유틸리티
// Send CDP messages via JavaScript WebSocket / JavaScript WebSocket으로 CDP 메시지 전송

import { getCDPSender } from './websocket-client';

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
  const messageStr = JSON.stringify(message);
  sender(serverHost, serverPort, messageStr);
}
