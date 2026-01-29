/**
 * WebSocket client tests / WebSocket 클라이언트 테스트
 * Covers getCDPSender null/closed safety, connect flow, and message dispatch / getCDPSender null/closed 안전성, 연결 흐름, 메시지 전달
 */
import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import {
  connectWebSocket,
  getCDPSender,
  disconnectWebSocket,
  isWebSocketConnected,
} from '../websocket-client';

const OPEN = 1;
const CLOSED = 3;

describe('websocket-client', () => {
  let mockSend: ReturnType<typeof mock>;
  let mockWs: { readyState: number; send: ReturnType<typeof mock>; close: ReturnType<typeof mock> };

  beforeEach(() => {
    mockSend = mock(() => {});
    mockWs = {
      readyState: OPEN,
      send: mockSend,
      close: mock(() => {}),
    };
    (globalThis as any).WebSocket = class MockWebSocket {
      static OPEN = OPEN;
      static CLOSED = CLOSED;
      readyState = OPEN;
      send = mockSend;
      close = mockWs.close;
      onopen: (() => void) | null = null;
      constructor(public url: string) {
        queueMicrotask(() => {
          if (this.onopen) this.onopen();
        });
      }
    };
  });

  afterEach(() => {
    disconnectWebSocket();
    (globalThis as any).WebSocket = undefined;
  });

  test('getCDPSender returns null when not connected / 미연결 시 getCDPSender는 null', () => {
    expect(getCDPSender()).toBeNull();
  });

  test('connectWebSocket resolves and getCDPSender returns sender / 연결 후 sender 반환', async () => {
    await connectWebSocket('localhost', 8080);
    const sender = getCDPSender();
    expect(sender).not.toBeNull();
    sender!('host', 8080, '{"method":"test"}');
    expect(mockSend).toHaveBeenCalledWith('{"method":"test"}');
  });

  test('sender no-ops after disconnect / 연결 해제 후 sender는 no-op', async () => {
    await connectWebSocket('localhost', 8080);
    const sender = getCDPSender();
    expect(sender).not.toBeNull();
    disconnectWebSocket();
    sender!('host', 8080, '{"method":"after-close"}');
    expect(mockSend).toHaveBeenCalledTimes(0);
  });

  test('isWebSocketConnected returns false when disconnected / 미연결 시 false', () => {
    expect(isWebSocketConnected()).toBe(false);
  });

  test('isWebSocketConnected returns true after connect / 연결 후 true', async () => {
    await connectWebSocket('localhost', 8080);
    expect(isWebSocketConnected()).toBe(true);
  });
});
