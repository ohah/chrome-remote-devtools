// WebSocket fixture for tests / 테스트용 WebSocket 픽스처
import { WebSocket } from 'ws';

export interface InspectorWebSocket {
  ws: WebSocket;
  send: (message: unknown) => void;
  receive: () => Promise<unknown>;
  close: () => void;
}

export function createInspectorWebSocket(
  wsUrl: string,
  clientId: string
): Promise<InspectorWebSocket> {
  return new Promise((resolve, reject) => {
    const inspectorId = `inspector-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const ws = new WebSocket(`${wsUrl}/remote/debug/devtools/${inspectorId}?clientId=${clientId}`);

    const messageQueue: unknown[] = [];
    let messageResolver: ((value: unknown) => void) | null = null;

    ws.on('open', () => {
      resolve({
        ws,
        send: (message: unknown) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
          }
        },
        receive: () => {
          return new Promise((resolve) => {
            if (messageQueue.length > 0) {
              resolve(messageQueue.shift());
            } else {
              messageResolver = resolve;
            }
          });
        },
        close: () => {
          ws.close();
        },
      });
    });

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        if (messageResolver) {
          messageResolver(message);
          messageResolver = null;
        } else {
          messageQueue.push(message);
        }
      } catch (error) {
        // Ignore parse errors
      }
    });

    ws.on('error', reject);
  });
}
