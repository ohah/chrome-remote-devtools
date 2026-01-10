// Redux DevTools Middleware for Chrome Remote DevTools
// Chrome Remote DevTools용 Redux DevTools 미들웨어
// This middleware sends Redux actions to DevTools server
// 이 미들웨어는 Redux 액션을 DevTools 서버로 전송합니다

import type { Middleware, StoreEnhancer } from 'redux';
import { getServerInfo } from './server-info';

// Type declarations
type Action = { type: string; [key: string]: unknown };
type State = unknown;

interface DevToolsConfig {
  name?: string;
  instanceId?: number;
  maxAge?: number;
}

// Store instances for tracking
let nextInstanceId = 1;
const storeInstances = new Map<number, { name: string; initialized: boolean }>();

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
export function setReduxCDPSender(
  sender: (host: string, port: number, message: string) => void
): void {
  cdpMessageSender = sender;
}

/**
 * Mark connection as ready and flush pending messages / 연결 준비 완료 표시 및 대기 메시지 전송
 */
export function setReduxConnectionReady(): void {
  isConnected = true;
  flushPendingMessages();
}

/**
 * Send CDP message to DevTools server / DevTools 서버로 CDP 메시지 전송
 */
function sendCDPMessage(message: { method: string; params: unknown }): void {
  const serverInfo = getServerInfo();

  if (!isConnected || !cdpMessageSender || !serverInfo) {
    // Queue for later / 나중에 전송하도록 대기열에 추가
    pendingMessages.push(message);
    return;
  }

  try {
    cdpMessageSender(serverInfo.host, serverInfo.port, JSON.stringify(message));
  } catch (e) {
    // Ignore errors / 에러 무시
  }
}

/**
 * Flush pending messages / 대기 메시지 전송
 */
function flushPendingMessages(): void {
  const serverInfo = getServerInfo();
  if (!isConnected || !cdpMessageSender || !serverInfo) return;

  while (pendingMessages.length > 0) {
    const message = pendingMessages.shift();
    if (message) {
      try {
        cdpMessageSender(serverInfo.host, serverInfo.port, JSON.stringify(message));
      } catch (e) {
        // Ignore errors / 에러 무시
      }
    }
  }
}

/**
 * Create Redux DevTools middleware / Redux DevTools 미들웨어 생성
 * @param config Configuration options / 설정 옵션
 * @returns Redux middleware / Redux 미들웨어
 *
 * Usage / 사용법:
 * ```typescript
 * import { createReduxDevToolsMiddleware } from '@ohah/chrome-remote-devtools-react-native';
 *
 * const store = configureStore({
 *   reducer: rootReducer,
 *   middleware: (getDefaultMiddleware) =>
 *     getDefaultMiddleware().concat(createReduxDevToolsMiddleware({ name: 'MyApp' })),
 *   devTools: false, // Disable built-in devtools / 내장 devtools 비활성화
 * });
 * ```
 */
export function createReduxDevToolsMiddleware(config?: DevToolsConfig): Middleware {
  const instanceId = config?.instanceId ?? nextInstanceId++;
  const name = config?.name ?? 'Redux Store';
  const maxAge = config?.maxAge ?? 50;
  let initialized = false;

  storeInstances.set(instanceId, { name, initialized: false });

  const middleware: Middleware = (store) => {
    // Initialize on first access / 첫 접근 시 초기화
    if (!initialized) {
      initialized = true;
      storeInstances.set(instanceId, { name, initialized: true });

      // Send INIT_INSTANCE / INIT_INSTANCE 전송
      sendCDPMessage({
        method: 'Redux.message',
        params: {
          type: 'INIT_INSTANCE',
          instanceId,
          source: '@devtools-page',
        },
      });

      // Send INIT with current state / 현재 state와 함께 INIT 전송
      sendCDPMessage({
        method: 'Redux.message',
        params: {
          type: 'INIT',
          instanceId,
          source: '@devtools-page',
          name,
          payload: JSON.stringify(store.getState()),
          maxAge,
          timestamp: Date.now(),
        },
      });
    }

    return (next) => (action) => {
      // Execute action first / 먼저 액션 실행
      const result = next(action);

      // Send action to DevTools / DevTools로 액션 전송
      sendCDPMessage({
        method: 'Redux.message',
        params: {
          type: 'ACTION',
          instanceId,
          source: '@devtools-page',
          action: JSON.stringify(action as Action),
          payload: JSON.stringify(store.getState()),
          maxAge,
          timestamp: Date.now(),
        },
      });

      return result;
    };
  };

  return middleware;
}

/**
 * Create Redux DevTools store enhancer / Redux DevTools store enhancer 생성
 * Alternative to middleware approach / 미들웨어 대신 사용할 수 있는 enhancer
 *
 * Usage / 사용법:
 * ```typescript
 * import { createReduxDevToolsEnhancer } from '@ohah/chrome-remote-devtools-react-native';
 *
 * const store = configureStore({
 *   reducer: rootReducer,
 *   enhancers: (getDefaultEnhancers) =>
 *     getDefaultEnhancers().concat(createReduxDevToolsEnhancer({ name: 'MyApp' })),
 *   devTools: false,
 * });
 * ```
 */
export function createReduxDevToolsEnhancer(config?: DevToolsConfig): StoreEnhancer {
  const instanceId = config?.instanceId ?? nextInstanceId++;
  const name = config?.name ?? 'Redux Store';
  const maxAge = config?.maxAge ?? 50;

  return (createStore) => (reducer, preloadedState) => {
    const store = createStore(reducer, preloadedState);

    // Send INIT_INSTANCE / INIT_INSTANCE 전송
    sendCDPMessage({
      method: 'Redux.message',
      params: {
        type: 'INIT_INSTANCE',
        instanceId,
        source: '@devtools-page',
      },
    });

    // Send INIT with current state / 현재 state와 함께 INIT 전송
    sendCDPMessage({
      method: 'Redux.message',
      params: {
        type: 'INIT',
        instanceId,
        source: '@devtools-page',
        name,
        payload: JSON.stringify(store.getState()),
        maxAge,
        timestamp: Date.now(),
      },
    });

    // Wrap dispatch / dispatch 래핑
    const originalDispatch = store.dispatch;
    const wrappedDispatch = (action: unknown) => {
      const result = originalDispatch(action as any);

      sendCDPMessage({
        method: 'Redux.message',
        params: {
          type: 'ACTION',
          instanceId,
          source: '@devtools-page',
          action: JSON.stringify(action as Action),
          payload: JSON.stringify(store.getState()),
          maxAge,
          timestamp: Date.now(),
        },
      });

      return result;
    };

    return {
      ...store,
      dispatch: wrappedDispatch as typeof store.dispatch,
    };
  };
}
