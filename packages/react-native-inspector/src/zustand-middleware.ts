// Zustand DevTools Middleware for Chrome Remote DevTools
// Chrome Remote DevTools용 Zustand DevTools 미들웨어
// This middleware sends Zustand state changes to DevTools server
// 이 미들웨어는 Zustand state 변경을 DevTools 서버로 전송합니다

import type { StateCreator, StoreMutatorIdentifier } from 'zustand';
import { getServerInfo } from './server-info';

// Type declarations
type Action = { type: string; [key: string]: unknown };

interface DevToolsConfig {
  name?: string;
  instanceId?: number;
  maxAge?: number;
  enabled?: boolean;
}

// Store instances for tracking
let nextInstanceId = 1;

// Pending messages queue (before connection is ready)
interface PendingMessage {
  method: string;
  params: unknown;
}
const pendingMessages: PendingMessage[] = [];
let cdpMessageSender: ((host: string, port: number, message: string) => void) | null = null;
let isConnected = false;

/**
 * Set CDP message sender / CDP 메시지 전송자 설정
 */
export function setZustandCDPSender(
  sender: (host: string, port: number, message: string) => void
): void {
  console.log('[ZustandMiddleware] setZustandCDPSender called');
  cdpMessageSender = sender;
  console.log('[ZustandMiddleware] CDP sender set:', !!cdpMessageSender);
}

/**
 * Mark connection as ready and flush pending messages / 연결 준비 완료 표시 및 대기 메시지 전송
 */
export function setZustandConnectionReady(): void {
  console.log('[ZustandMiddleware] setZustandConnectionReady called');
  console.log(
    '[ZustandMiddleware] Current state - isConnected:',
    isConnected,
    'pendingMessages:',
    pendingMessages.length
  );
  isConnected = true;
  flushPendingMessages();
}

/**
 * Send CDP message to DevTools server / DevTools 서버로 CDP 메시지 전송
 */
function sendCDPMessage(message: { method: string; params: unknown }): void {
  const serverInfo = getServerInfo();
  const messageType = (message.params as any)?.type || 'unknown';

  console.log('[ZustandMiddleware] sendCDPMessage called:', {
    type: messageType,
    isConnected,
    hasCDPSender: !!cdpMessageSender,
    hasServerInfo: !!serverInfo,
    serverInfo: serverInfo ? { host: serverInfo.serverHost, port: serverInfo.serverPort } : null,
    pendingMessagesCount: pendingMessages.length,
  });

  if (!isConnected || !cdpMessageSender || !serverInfo) {
    console.log('[ZustandMiddleware] ⏳ Queuing message (not ready):', messageType);
    // Queue for later / 나중에 전송하도록 대기열에 추가
    pendingMessages.push(message);
    console.log('[ZustandMiddleware] Pending messages count:', pendingMessages.length);
    return;
  }

  try {
    console.log(
      '[ZustandMiddleware] 📤 Sending message:',
      messageType,
      'to',
      serverInfo.serverHost,
      ':',
      serverInfo.serverPort
    );
    cdpMessageSender(serverInfo.serverHost, serverInfo.serverPort, JSON.stringify(message));
    console.log('[ZustandMiddleware] ✅ Message sent successfully:', messageType);
  } catch (e) {
    console.error('[ZustandMiddleware] ❌ Error sending message:', messageType, e);
    // Ignore errors / 에러 무시
  }
}

/**
 * Flush pending messages / 대기 메시지 전송
 */
function flushPendingMessages(): void {
  const serverInfo = getServerInfo();

  console.log('[ZustandMiddleware] flushPendingMessages called');
  console.log('[ZustandMiddleware] State check:', {
    isConnected,
    hasCDPSender: !!cdpMessageSender,
    hasServerInfo: !!serverInfo,
    serverInfo: serverInfo ? { host: serverInfo.serverHost, port: serverInfo.serverPort } : null,
    pendingMessagesCount: pendingMessages.length,
  });

  if (!isConnected || !cdpMessageSender || !serverInfo) {
    console.log('[ZustandMiddleware] ⏸️ Skipping flush - not ready');
    return;
  }

  console.log('[ZustandMiddleware] 📤 Flushing', pendingMessages.length, 'pending messages');

  while (pendingMessages.length > 0) {
    const message = pendingMessages.shift();
    if (message) {
      const messageType = (message.params as any)?.type || 'unknown';
      try {
        console.log('[ZustandMiddleware] 📤 Flushing message:', messageType);
        cdpMessageSender(serverInfo.serverHost, serverInfo.serverPort, JSON.stringify(message));
        console.log('[ZustandMiddleware] ✅ Flushed message:', messageType);
      } catch (e) {
        console.error('[ZustandMiddleware] ❌ Error flushing message:', messageType, e);
        // Ignore errors / 에러 무시
      }
    }
  }

  console.log('[ZustandMiddleware] ✅ Flush complete');
}

/**
 * Zustand DevTools middleware type / Zustand DevTools 미들웨어 타입
 */
type DevToolsMiddleware = <
  T,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
>(
  initializer: StateCreator<T, Mps, Mcs>,
  config?: DevToolsConfig
) => StateCreator<T, Mps, Mcs>;

/**
 * Create Zustand DevTools middleware / Zustand DevTools 미들웨어 생성
 *
 * Usage / 사용법:
 * ```typescript
 * import { create } from 'zustand';
 * import { chromeDevtools } from '@ohah/chrome-remote-devtools-react-native';
 *
 * const useStore = create(
 *   chromeDevtools(
 *     (set) => ({
 *       count: 0,
 *       increment: () => set((state) => ({ count: state.count + 1 })),
 *     }),
 *     { name: 'CounterStore' }
 *   )
 * );
 * ```
 */
export const chromeDevtools: DevToolsMiddleware = (initializer, config) => (set, get, store) => {
  const instanceId = config?.instanceId ?? nextInstanceId++;
  const name = config?.name ?? 'Zustand Store';
  const maxAge = config?.maxAge ?? 50;
  const enabled = config?.enabled ?? true;

  console.log('[ZustandMiddleware] chromeDevtools middleware called:', {
    instanceId,
    name,
    enabled,
  });

  if (!enabled) {
    console.log('[ZustandMiddleware] Middleware disabled, skipping');
    return initializer(set, get, store);
  }

  // Track action names for better DevTools display
  let currentActionName = 'anonymous';

  // Send INIT_INSTANCE / INIT_INSTANCE 전송
  console.log('[ZustandMiddleware] Sending INIT_INSTANCE for', name);
  sendCDPMessage({
    method: 'Redux.message',
    params: {
      type: 'INIT_INSTANCE',
      instanceId,
      source: '@devtools-page',
    },
  });

  // Wrap set function to track state changes / state 변경을 추적하도록 set 함수 래핑
  const wrappedSet = ((partial: any, replace?: any) => {
    // Determine action name from partial / partial에서 액션 이름 결정
    let actionName = currentActionName;
    if (typeof partial === 'function') {
      actionName = partial.name || 'anonymous';
    }

    console.log('[ZustandMiddleware] wrappedSet called:', { actionName, storeName: name });

    // Call original set / 원본 set 호출
    set(partial, replace);

    // Get new state / 새 state 가져오기
    const newState = get();

    // Send ACTION message / ACTION 메시지 전송
    console.log('[ZustandMiddleware] Sending ACTION for', name, 'action:', actionName);
    sendCDPMessage({
      method: 'Redux.message',
      params: {
        type: 'ACTION',
        instanceId,
        source: '@devtools-page',
        action: JSON.stringify({ type: actionName } as Action),
        payload: JSON.stringify(newState),
        maxAge,
        timestamp: Date.now(),
      },
    });
  }) as typeof set;

  // Initialize store / store 초기화
  const initialState = initializer(wrappedSet, get, store);

  // Send INIT with initial state / 초기 state와 함께 INIT 전송
  // Use setTimeout to ensure state is set / state가 설정되도록 setTimeout 사용
  setTimeout(() => {
    console.log('[ZustandMiddleware] Sending INIT for', name);
    sendCDPMessage({
      method: 'Redux.message',
      params: {
        type: 'INIT',
        instanceId,
        source: '@devtools-page',
        name,
        payload: JSON.stringify(get()),
        maxAge,
        timestamp: Date.now(),
      },
    });
  }, 0);

  return initialState;
};

/**
 * Named action wrapper for better DevTools display / DevTools 표시를 위한 이름 있는 액션 래퍼
 *
 * Usage / 사용법:
 * ```typescript
 * import { namedAction } from '@ohah/chrome-remote-devtools-react-native';
 *
 * const useStore = create(
 *   chromeDevtools((set) => ({
 *     count: 0,
 *     increment: () => set(namedAction('increment', (state) => ({ count: state.count + 1 }))),
 *   }))
 * );
 * ```
 */
export function namedAction<T, R>(name: string, fn: (state: T) => R): (state: T) => R {
  const namedFn = (state: T) => fn(state);
  Object.defineProperty(namedFn, 'name', { value: name });
  return namedFn;
}
