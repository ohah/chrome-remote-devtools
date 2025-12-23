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

      // WebSocket is not open, reject promise to trigger error handling / WebSocket이 열려있지 않으면 Promise를 reject하여 에러 처리 트리거
      throw new Error(`WebSocket is not open (readyState: ${socket.readyState})`);
    },
  };
}
