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
  setOnConnectionClose,
} from '../websocket-client';

const OPEN = 1;
const CLOSED = 3;

/** Ref to last mock WebSocket instance so tests can trigger onclose / 테스트에서 onclose를 호출할 수 있도록 마지막 인스턴스 ref */
const lastMockWsRef: { current: { onclose: ((_event: unknown) => void) | null } | null } = {
  current: null,
};

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
    lastMockWsRef.current = null;
    (globalThis as any).WebSocket = class MockWebSocket {
      static OPEN = OPEN;
      static CLOSED = CLOSED;
      readyState = OPEN;
      send = mockSend;
      close = mockWs.close;
      onopen: (() => void) | null = null;
      onclose: ((_event: unknown) => void) | null = null;
      constructor(public url: string) {
        lastMockWsRef.current = this;
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
    await connectWebSocket('localhost', 8080, 'js-test-device-id');
    const sender = getCDPSender();
    expect(sender).not.toBeNull();
    sender!('host', 8080, '{"method":"test"}');
    expect(mockSend).toHaveBeenCalledWith('{"method":"test"}');
  });

  test('sender no-ops after disconnect / 연결 해제 후 sender는 no-op', async () => {
    await connectWebSocket('localhost', 8080, 'js-test-device-id');
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
    await connectWebSocket('localhost', 8080, 'js-test-device-id');
    expect(isWebSocketConnected()).toBe(true);
  });

  test('setOnConnectionClose: callback invoked when connection closes after open / 열린 뒤 끊기면 콜백 호출', async () => {
    const onClose = mock(() => {});
    setOnConnectionClose(onClose);
    await connectWebSocket('localhost', 8080, 'js-test-device-id');
    expect(lastMockWsRef.current).not.toBeNull();
    lastMockWsRef.current!.onclose!({});
    expect(onClose).toHaveBeenCalledTimes(1);
    setOnConnectionClose(null);
  });

  test('setOnConnectionClose: callback not invoked when disconnectRequested / disconnect 시에는 콜백 미호출', async () => {
    const onClose = mock(() => {});
    setOnConnectionClose(onClose);
    await connectWebSocket('localhost', 8080, 'js-test-device-id');
    disconnectWebSocket();
    expect(onClose).toHaveBeenCalledTimes(0);
    setOnConnectionClose(null);
  });

  test('setOnConnectionClose: set to null does not throw / null 설정 시 에러 없음', async () => {
    setOnConnectionClose(null);
    await connectWebSocket('localhost', 8080, 'js-test-device-id');
    lastMockWsRef.current!.onclose!({});
    setOnConnectionClose(null);
  });

  test('setOnConnectionClose: callback not invoked when connection never opened / 연결이 열리기 전 끊기면 콜백 미호출', async () => {
    const onClose = mock(() => {});
    setOnConnectionClose(onClose);
    lastMockWsRef.current = null;
    (globalThis as any).WebSocket = class MockWebSocketNoOpen {
      onopen: (() => void) | null = null;
      onclose: ((_event: unknown) => void) | null = null;
      close = () => {};
      constructor(public url: string) {
        lastMockWsRef.current = this;
      }
    };
    const connectPromise = connectWebSocket('localhost', 8080, 'js-test-device-id');
    await new Promise((r) => setTimeout(r, 0));
    lastMockWsRef.current!.onclose!({});
    expect(onClose).toHaveBeenCalledTimes(0);
    disconnectWebSocket();
    setOnConnectionClose(null);
  });
});
