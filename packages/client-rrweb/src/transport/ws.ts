import type { RrwebEnvelope, RrwebTransport } from '../types';

/**
 * Create WebSocket transport / WebSocket 전송 생성
 */
export function createWebSocketTransport(params: {
  socket: WebSocket;
  kind?: string;
}): RrwebTransport {
  const { socket, kind = 'rrweb' } = params;

  return {
    async send(envelope: RrwebEnvelope): Promise<void> {
      const message = { ...envelope, kind };
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
        return;
      }

      // Drop silently if closed to avoid throwing in recorder / 레코더 중 예외 방지를 위해 닫힌 경우 무시
    },
  };
}
