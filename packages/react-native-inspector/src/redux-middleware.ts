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
  instanceId?: string | number;
  maxAge?: number;
}

// Store instances for tracking
let nextInstanceId = 1;
const storeInstances = new Map<string | number, { name: string; initialized: boolean }>();
const storeNameCount = new Map<string, number>(); // Track count of stores with same name / 같은 이름을 가진 스토어 개수 추적

// Track next action ID for each instance / 각 instance별 다음 액션 ID 추적
const nextActionIds: Map<string | number, number> = new Map();

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
 * import { createReduxDevToolsMiddleware } from '@ohah/redux-devtools-plugin';
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
  // Generate instance ID from store name / 스토어 이름에서 인스턴스 ID 생성
  let instanceId: string | number;
  if (config?.instanceId !== undefined) {
    instanceId = config.instanceId;
  } else {
    // Generate default name if not provided / 제공되지 않으면 기본 이름 생성
    const defaultName = `Redux-Store-${nextInstanceId}`;
    const name = config?.name ?? defaultName;
    
    // Get count for this store name / 이 스토어 이름에 대한 개수 가져오기
    const count = storeNameCount.get(name) || 0;
    storeNameCount.set(name, count + 1);
    
    // Create instance ID with index if multiple stores have same name / 같은 이름을 가진 여러 스토어가 있으면 인덱스와 함께 인스턴스 ID 생성
    const baseId = name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || `redux-store-${nextInstanceId++}`;
    
    // Add index suffix if multiple stores with same name / 같은 이름을 가진 여러 스토어가 있으면 인덱스 접미사 추가
    instanceId = count > 0 ? `${baseId}-${count}` : baseId;
  }
  const name = config?.name ?? `Redux-Store-${nextInstanceId}`;
  const maxAge = config?.maxAge ?? 50;
  let initialized = false;

  storeInstances.set(instanceId, { name, initialized: false });

  // Initialize nextActionId for this instance / 이 instance의 nextActionId 초기화
  if (!nextActionIds.has(instanceId)) {
    nextActionIds.set(instanceId, 1);
  }

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

      // Get and increment next action ID for this instance / 이 instance의 다음 액션 ID 가져오기 및 증가
      const currentActionId = nextActionIds.get(instanceId) || 1;
      const nextActionId = currentActionId + 1;
      nextActionIds.set(instanceId, nextActionId);

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
          nextActionId, // Add nextActionId / nextActionId 추가
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
 * import { createReduxDevToolsEnhancer } from '@ohah/redux-devtools-plugin';
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
  // Generate instance ID from store name / 스토어 이름에서 인스턴스 ID 생성
  let instanceId: string | number;
  if (config?.instanceId !== undefined) {
    instanceId = config.instanceId;
  } else {
    // Generate default name if not provided / 제공되지 않으면 기본 이름 생성
    const defaultName = `Redux-Store-${nextInstanceId}`;
    const name = config?.name ?? defaultName;
    
    // Get count for this store name / 이 스토어 이름에 대한 개수 가져오기
    const count = storeNameCount.get(name) || 0;
    storeNameCount.set(name, count + 1);
    
    // Create instance ID with index if multiple stores have same name / 같은 이름을 가진 여러 스토어가 있으면 인덱스와 함께 인스턴스 ID 생성
    const baseId = name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || `redux-store-${nextInstanceId++}`;
    
    // Add index suffix if multiple stores with same name / 같은 이름을 가진 여러 스토어가 있으면 인덱스 접미사 추가
    instanceId = count > 0 ? `${baseId}-${count}` : baseId;
  }
  const name = config?.name ?? `Redux-Store-${nextInstanceId}`;
  const maxAge = config?.maxAge ?? 50;

  // Initialize nextActionId for this instance / 이 instance의 nextActionId 초기화
  if (!nextActionIds.has(instanceId)) {
    nextActionIds.set(instanceId, 1);
  }

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

      // Get and increment next action ID for this instance / 이 instance의 다음 액션 ID 가져오기 및 증가
      const currentActionId = nextActionIds.get(instanceId) || 1;
      const nextActionId = currentActionId + 1;
      nextActionIds.set(instanceId, nextActionId);

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
          nextActionId, // Add nextActionId / nextActionId 추가
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
