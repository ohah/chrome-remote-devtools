// Redux DevTools Extension JavaScript polyfill / Redux DevTools Extension JavaScript polyfill
// This polyfill is installed synchronously at import time / 이 polyfill은 import 시점에 동기적으로 설치됩니다
// It provides Redux DevTools functionality before JSI hooks are ready / JSI 훅이 준비되기 전에 Redux DevTools 기능을 제공합니다
// Works with both Redux Toolkit and Zustand / Redux Toolkit과 Zustand 모두에서 작동합니다

import { getGlobalObj } from './utils';

// Type declarations / 타입 선언
type Action = { type: string; [key: string]: unknown };
type State = unknown;

interface DevToolsConnection {
  init: (state: State, liftedData?: unknown) => void;
  send: (action: Action | null, state: State) => void;
  subscribe: (listener: (message: unknown) => void) => () => void;
  unsubscribe: () => void;
  error: (message: string) => void;
}

interface ConnectConfig {
  name?: string;
  instanceId?: number;
  [key: string]: unknown;
}

interface DevToolsExtension {
  connect: (config?: ConnectConfig) => DevToolsConnection;
}

// Pending actions queue - stores actions before server connection is ready
// 서버 연결이 준비되기 전 액션을 저장하는 대기열
interface PendingAction {
  type: 'init' | 'action';
  instanceId: number;
  name: string;
  action?: Action | null;
  state: State;
  timestamp: number;
}

const pendingActions: PendingAction[] = [];
let serverHost = '';
let serverPort = 0;
let isConnected = false;
let nextInstanceId = 1;

// CDP message sender function / CDP 메시지 전송 함수
// May return void or Promise<void> / void 또는 Promise<void>를 반환할 수 있음
let sendCDPMessageFn:
  | ((host: string, port: number, message: string) => void | Promise<void>)
  | null = null;

/**
 * Set the CDP message sender function / CDP 메시지 전송 함수 설정
 * Called when native module is ready / 네이티브 모듈이 준비되면 호출됨
 */
export function setCDPMessageSender(
  sender: (host: string, port: number, message: string) => void | Promise<void>
): void {
  sendCDPMessageFn = sender;
}

/**
 * Set server info and mark as connected / 서버 정보 설정 및 연결됨으로 표시
 * This triggers flushing of pending actions / 대기 중인 액션 전송 트리거
 */
export function setServerConnection(host: string, port: number): void {
  console.log('[ReduxDevToolsPolyfill] setServerConnection called:', host, port);
  console.log('[ReduxDevToolsPolyfill] pendingActions count:', pendingActions.length);
  console.log('[ReduxDevToolsPolyfill] sendCDPMessageFn exists:', !!sendCDPMessageFn);
  serverHost = host;
  serverPort = port;
  isConnected = true;
  flushPendingActions();
}

/**
 * Send CDP message / CDP 메시지 전송
 */
function sendCDPMessage(message: object): void {
  if (!isConnected || !sendCDPMessageFn) {
    return;
  }
  try {
    const result = sendCDPMessageFn(serverHost, serverPort, JSON.stringify(message));
    // Handle Promise if returned / Promise가 반환되면 처리
    if (result && typeof result.catch === 'function') {
      result.catch((error: unknown) => {
        console.error('[ReduxDevToolsPolyfill] Failed to send CDP message:', error);
      });
    }
  } catch (e) {
    console.error('[ReduxDevToolsPolyfill] Error sending CDP message:', e);
  }
}

/**
 * Flush pending actions to server / 대기 중인 액션을 서버로 전송
 */
function flushPendingActions(): void {
  console.log('[ReduxDevToolsPolyfill] flushPendingActions called');
  console.log('[ReduxDevToolsPolyfill] isConnected:', isConnected);
  console.log('[ReduxDevToolsPolyfill] sendCDPMessageFn exists:', !!sendCDPMessageFn);
  console.log('[ReduxDevToolsPolyfill] pendingActions.length:', pendingActions.length);

  if (!isConnected || !sendCDPMessageFn) {
    console.log('[ReduxDevToolsPolyfill] Skipping flush - not ready');
    return;
  }

  console.log('[ReduxDevToolsPolyfill] Flushing', pendingActions.length, 'pending actions');

  while (pendingActions.length > 0) {
    const pending = pendingActions.shift();
    if (!pending) continue;

    if (pending.type === 'init') {
      // Send INIT_INSTANCE message / INIT_INSTANCE 메시지 전송
      sendCDPMessage({
        method: 'Redux.message',
        params: {
          type: 'INIT_INSTANCE',
          instanceId: pending.instanceId,
          source: '@devtools-page',
        },
      });

      // Send INIT message / INIT 메시지 전송
      sendCDPMessage({
        method: 'Redux.message',
        params: {
          type: 'INIT',
          instanceId: pending.instanceId,
          source: '@devtools-page',
          name: pending.name,
          payload: JSON.stringify(pending.state),
          maxAge: 50,
          timestamp: pending.timestamp,
        },
      });
    } else if (pending.type === 'action') {
      // Send ACTION message / ACTION 메시지 전송
      sendCDPMessage({
        method: 'Redux.message',
        params: {
          type: 'ACTION',
          instanceId: pending.instanceId,
          source: '@devtools-page',
          action: pending.action ? JSON.stringify(pending.action) : undefined,
          payload: JSON.stringify(pending.state),
          maxAge: 50,
          timestamp: pending.timestamp,
        },
      });
    }
  }
}

/**
 * Create DevTools connection / DevTools 연결 생성
 * Used by both Redux Toolkit and Zustand / Redux Toolkit과 Zustand 모두에서 사용
 */
function createConnection(config?: ConnectConfig): DevToolsConnection {
  const instanceId = config?.instanceId ?? nextInstanceId++;
  const name = config?.name ?? 'Store';
  console.log('[ReduxDevToolsPolyfill] createConnection called:', { instanceId, name });

  return {
    init(state: State, _liftedData?: unknown): void {
      console.log('[ReduxDevToolsPolyfill] init called for', name, 'instanceId:', instanceId);
      const timestamp = Date.now();

      if (isConnected && sendCDPMessageFn) {
        console.log('[ReduxDevToolsPolyfill] init: sending immediately');
        // Send immediately / 즉시 전송
        sendCDPMessage({
          method: 'Redux.message',
          params: {
            type: 'INIT_INSTANCE',
            instanceId,
            source: '@devtools-page',
          },
        });
        sendCDPMessage({
          method: 'Redux.message',
          params: {
            type: 'INIT',
            instanceId,
            source: '@devtools-page',
            name,
            payload: JSON.stringify(state),
            maxAge: 50,
            timestamp,
          },
        });
      } else {
        console.log('[ReduxDevToolsPolyfill] init: queuing for later');
        // Queue for later / 나중에 전송하도록 대기열에 추가
        pendingActions.push({
          type: 'init',
          instanceId,
          name,
          state,
          timestamp,
        });
        console.log('[ReduxDevToolsPolyfill] pendingActions count now:', pendingActions.length);
      }
    },

    send(action: Action | null, state: State): void {
      const timestamp = Date.now();

      if (isConnected && sendCDPMessageFn) {
        // Send immediately / 즉시 전송
        sendCDPMessage({
          method: 'Redux.message',
          params: {
            type: 'ACTION',
            instanceId,
            source: '@devtools-page',
            action: action ? JSON.stringify(action) : undefined,
            payload: JSON.stringify(state),
            maxAge: 50,
            timestamp,
          },
        });
      } else {
        // Queue for later / 나중에 전송하도록 대기열에 추가
        pendingActions.push({
          type: 'action',
          instanceId,
          name,
          action,
          state,
          timestamp,
        });
      }
    },

    subscribe(_listener: (message: unknown) => void): () => void {
      // Return unsubscribe function / unsubscribe 함수 반환
      return () => {};
    },

    unsubscribe(): void {
      // No-op / 아무 작업 없음
    },

    error(message: string): void {
      if (isConnected && sendCDPMessageFn) {
        sendCDPMessage({
          method: 'Redux.message',
          params: {
            type: 'ERROR',
            instanceId,
            source: '@devtools-page',
            error: message,
            name,
            timestamp: Date.now(),
          },
        });
      }
    },
  };
}

/**
 * Redux DevTools Extension object / Redux DevTools Extension 객체
 * Supports both function call (Redux Toolkit) and .connect() (Zustand)
 * 함수 호출(Redux Toolkit)과 .connect()(Zustand) 모두 지원
 */
const reduxDevToolsExtension: DevToolsExtension & ((config?: unknown) => unknown) = Object.assign(
  // Function form for Redux Toolkit / Redux Toolkit용 함수 형태
  function (config?: unknown): unknown {
    // Return enhancer / enhancer 반환
    return (next: unknown) => (reducer: unknown, initialState: unknown) => {
      // Call next to create store / next를 호출하여 store 생성
      const store =
        typeof next === 'function'
          ? (next as (...args: unknown[]) => unknown)(reducer, initialState)
          : undefined;

      if (store && typeof store === 'object') {
        const storeObj = store as { getState?: () => unknown };
        if (typeof storeObj.getState === 'function') {
          // Connect to DevTools / DevTools에 연결
          const devTools = createConnection(config as ConnectConfig);
          devTools.init(storeObj.getState());
        }
      }

      return store;
    };
  },
  // Object form with connect method for Zustand / Zustand용 connect 메서드가 있는 객체 형태
  {
    connect: createConnection,
  }
);

/**
 * Compose function for Redux DevTools / Redux DevTools용 compose 함수
 * This is called by Redux Toolkit's configureStore when devTools: true
 * Redux Toolkit의 configureStore에서 devTools: true일 때 호출됨
 *
 * composeWithDevTools(options)(...enhancers) or composeWithDevTools(...enhancers)
 *
 * Redux Toolkit always expects a function to be returned / Redux Toolkit은 항상 함수가 반환되기를 기대합니다
 * The function should accept enhancers and return a composed enhancer / 함수는 enhancer들을 받아서 합성된 enhancer를 반환해야 합니다
 */
function composeWithDevTools(...args: unknown[]): (...enhancers: unknown[]) => unknown {
  // Check if first argument is options object / 첫 번째 인자가 옵션 객체인지 확인
  if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
    const options = args[0] as ConnectConfig;
    // Return a function that takes enhancers / enhancer들을 받는 함수 반환
    return (...enhancers: unknown[]) => {
      return createEnhancerWithDevTools(options, enhancers);
    };
  }

  // Called directly with enhancers / enhancer들과 직접 호출됨
  // Redux Toolkit calls: composeWithDevTools(...enhancers)
  // We need to return a function that Redux Toolkit can call with .apply / Redux Toolkit이 .apply로 호출할 수 있는 함수를 반환해야 함
  // But if args are already enhancers, we should compose them / 하지만 args가 이미 enhancer들이면 합성해야 함
  // Redux Toolkit pattern: const finalCompose = composeWithDevTools(...enhancers); finalCompose.apply(...)
  // So we need to return a function that accepts more enhancers / 따라서 더 많은 enhancer를 받는 함수를 반환해야 함

  // If args are enhancers, compose them and return a function / args가 enhancer들이면 합성하고 함수 반환
  if (args.length > 0) {
    // These are enhancers passed directly / 직접 전달된 enhancer들
    return (...additionalEnhancers: unknown[]) => {
      // Combine original args (enhancers) with additional enhancers / 원본 args(enhancer들)와 추가 enhancer들을 결합
      const allEnhancers = [...args, ...additionalEnhancers].filter(Boolean);
      return createEnhancerWithDevTools({}, allEnhancers);
    };
  }

  // No args - return function that accepts enhancers / 인자 없음 - enhancer를 받는 함수 반환
  return (...enhancers: unknown[]) => {
    return createEnhancerWithDevTools({}, enhancers);
  };
}

/**
 * Create store enhancer with DevTools / DevTools가 포함된 store enhancer 생성
 */
function createEnhancerWithDevTools(options: ConnectConfig, enhancers: unknown[]): unknown {
  // Create DevTools enhancer / DevTools enhancer 생성
  const devToolsEnhancer =
    (createStore: unknown) => (reducer: unknown, preloadedState: unknown) => {
      // Create store with original createStore / 원본 createStore로 store 생성
      const store =
        typeof createStore === 'function'
          ? (createStore as (...args: unknown[]) => unknown)(reducer, preloadedState)
          : undefined;

      if (store && typeof store === 'object') {
        const storeObj = store as {
          getState?: () => unknown;
          dispatch?: (action: unknown) => unknown;
          subscribe?: (listener: () => void) => () => void;
          replaceReducer?: (nextReducer: unknown) => void;
        };

        if (typeof storeObj.getState === 'function' && typeof storeObj.dispatch === 'function') {
          // Connect to DevTools / DevTools에 연결
          const devTools = createConnection(options);
          devTools.init(storeObj.getState());

          // Wrap dispatch to send actions to DevTools / dispatch를 감싸서 액션을 DevTools로 전송
          const originalDispatch = storeObj.dispatch;
          storeObj.dispatch = (action: unknown) => {
            const result = originalDispatch(action);
            devTools.send(action as Action, storeObj.getState!());
            return result;
          };
        }
      }

      return store;
    };

  // Compose all enhancers / 모든 enhancer 합성
  const allEnhancers = [devToolsEnhancer, ...enhancers.filter(Boolean)];

  if (allEnhancers.length === 0) {
    return (arg: unknown) => arg;
  }
  if (allEnhancers.length === 1) {
    return allEnhancers[0];
  }

  return allEnhancers.reduce(
    (a, b) =>
      (...args: unknown[]) =>
        (a as (...args: unknown[]) => unknown)((b as (...args: unknown[]) => unknown)(...args))
  );
}

/**
 * Install Redux DevTools Extension polyfill / Redux DevTools Extension polyfill 설치
 * This is called synchronously at import time / import 시점에 동기적으로 호출됨
 * Works for both Redux Toolkit and Zustand / Redux Toolkit과 Zustand 모두에서 작동
 */
export function installReduxDevToolsPolyfill(): void {
  console.log('[ReduxDevToolsPolyfill] installReduxDevToolsPolyfill called');
  const globalObj = getGlobalObj();

  // Skip if JSI version is already installed / JSI 버전이 이미 설치되어 있으면 건너뜀
  if (globalObj.__REDUX_DEVTOOLS_EXTENSION_JSI_INJECTED__) {
    console.log('[ReduxDevToolsPolyfill] Skipping - JSI version already installed');
    return;
  }

  // Skip if already installed / 이미 설치되어 있으면 건너뜀
  if (globalObj.__REDUX_DEVTOOLS_EXTENSION_JS_POLYFILL__) {
    console.log('[ReduxDevToolsPolyfill] Skipping - JS polyfill already installed');
    return;
  }

  // Install extension on global / global에 extension 설치
  globalObj.__REDUX_DEVTOOLS_EXTENSION__ = reduxDevToolsExtension;
  globalObj.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ = composeWithDevTools;

  // Also set on window if it exists (required for Zustand) / window가 존재하면 window에도 설정 (Zustand에서 필요)
  // Zustand checks: window.__REDUX_DEVTOOLS_EXTENSION__
  if (typeof window !== 'undefined') {
    (window as Record<string, unknown>).__REDUX_DEVTOOLS_EXTENSION__ = reduxDevToolsExtension;
    (window as Record<string, unknown>).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ = composeWithDevTools;
  }

  // Mark as installed / 설치됨으로 표시
  globalObj.__REDUX_DEVTOOLS_EXTENSION_JS_POLYFILL__ = true;
  console.log('[ReduxDevToolsPolyfill] ✅ Polyfill installed successfully');
}

/**
 * Get pending actions for transfer to JSI / JSI로 전달할 pending actions 가져오기
 * Called when JSI is ready to replace Metro polyfill / JSI가 Metro polyfill을 교체할 준비가 되면 호출됨
 * @returns Array of pending actions / pending actions 배열
 */
export function getPendingActions(): PendingAction[] {
  return [...pendingActions]; // Return a copy / 복사본 반환
}

/**
 * Clear pending actions / pending actions 지우기
 * Called after transferring to JSI / JSI로 전달한 후 호출됨
 */
export function clearPendingActions(): void {
  pendingActions.length = 0;
}

/**
 * Replace Metro polyfill with JSI version / Metro polyfill을 JSI 버전으로 교체
 * Called when JSI is ready / JSI가 준비되면 호출됨
 * @param jsiExtension JSI extension object / JSI extension 객체
 */
export function replaceWithJSIVersion(jsiExtension: any): void {
  const globalObj = getGlobalObj();

  console.log(
    '[ReduxDevToolsPolyfill] Replacing Metro polyfill with JSI version / Metro polyfill을 JSI 버전으로 교체 중'
  );

  // Replace extension / extension 교체
  globalObj.__REDUX_DEVTOOLS_EXTENSION__ = jsiExtension;
  if (typeof window !== 'undefined') {
    (window as Record<string, unknown>).__REDUX_DEVTOOLS_EXTENSION__ = jsiExtension;
  }

  // Also replace compose if JSI provides it / JSI가 제공하면 compose도 교체
  if (
    jsiExtension &&
    typeof jsiExtension === 'object' &&
    '__REDUX_DEVTOOLS_EXTENSION_COMPOSE__' in jsiExtension
  ) {
    globalObj.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ =
      jsiExtension.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__;
    if (typeof window !== 'undefined') {
      (window as Record<string, unknown>).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ =
        jsiExtension.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__;
    }
  }

  // Mark JSI as injected / JSI 주입 표시
  globalObj.__REDUX_DEVTOOLS_EXTENSION_JSI_INJECTED__ = true;

  // Clear Metro polyfill flag / Metro polyfill 플래그 제거
  delete globalObj.__REDUX_DEVTOOLS_EXTENSION_JS_POLYFILL__;

  console.log('[ReduxDevToolsPolyfill] ✅ Replaced with JSI version / JSI 버전으로 교체 완료');
}

// Note: installReduxDevToolsPolyfill() is now called from Metro polyfill file / 참고: installReduxDevToolsPolyfill()은 이제 Metro polyfill 파일에서 호출됩니다
// This ensures it runs before index.js / 이것은 index.js 전에 실행되도록 보장합니다

export { reduxDevToolsExtension, composeWithDevTools };
export { getPendingActions, clearPendingActions, replaceWithJSIVersion };
