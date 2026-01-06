// Redux DevTools Extension hook for React Native / React Native용 Redux DevTools Extension 훅
// Based on reference/redux-devtools implementation / reference/redux-devtools 구현 기반

import { sendCDPMessage } from './cdp-message';
import { setServerInfo, getServerInfo } from './server-info';

// Type declarations for React Native environment / React Native 환경용 타입 선언
declare const global: typeof globalThis;
declare const window: any;
declare const document: any;

// Track connect calls for UI display / UI 표시를 위한 connect 호출 추적
interface ConnectCallInfo {
  storeName: string;
  timestamp: number;
  instanceId: number;
  config: any;
  initCalled: boolean;
  initTimestamp?: number;
}

const connectCalls: Map<string, ConnectCallInfo> = new Map();

/**
 * Get connect call information / connect 호출 정보 가져오기
 * @param storeName Store name / store 이름
 * @returns Connect call information or null / connect 호출 정보 또는 null
 */
export function getConnectCallInfo(storeName: string): ConnectCallInfo | null {
  return connectCalls.get(storeName) || null;
}

/**
 * Get all connect call information / 모든 connect 호출 정보 가져오기
 * @returns Map of store names to connect call info / store 이름에서 connect 호출 정보로의 맵
 */
export function getAllConnectCallInfo(): Map<string, ConnectCallInfo> {
  return new Map(connectCalls);
}

/**
 * Setup Redux DevTools Extension for React Native / React Native용 Redux DevTools Extension 설정
 * Based on reference/redux-devtools implementation / reference/redux-devtools 구현 기반
 * @param serverHost Server host / 서버 호스트
 * @param serverPort Server port / 서버 포트
 */
export function setupReduxDevToolsExtension(serverHost: string, serverPort: number): void {
  setServerInfo(serverHost, serverPort);

  const globalObj =
    typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : {};

  // Check if implementation store exists (from polyfill) / 구현 저장소가 있는지 확인 (polyfill에서)
  const implementationStore =
    typeof global !== 'undefined' ? (global as any).__ReduxDevToolsImplementationStore : null;

  if (implementationStore) {
    // Inject actual implementation functions / 실제 구현 함수 주입
    implementationStore.sendCDPMessage = async (
      serverHostParam: string,
      serverPortParam: number,
      message: unknown
    ) => {
      console.log('[ReduxDevTools] sendCDPMessage called', {
        serverHost: serverHostParam,
        serverPort: serverPortParam,
        method: (message as any)?.method,
      });
      return sendCDPMessage(serverHostParam, serverPortParam, message);
    };

    implementationStore.getServerInfo = () => {
      const serverInfo = getServerInfo();
      if (serverInfo) {
        console.log('[ReduxDevTools] getServerInfo called', serverInfo);
        return serverInfo;
      }
      const fallback = { serverHost, serverPort };
      console.log('[ReduxDevTools] getServerInfo called (fallback)', fallback);
      return fallback;
    };

    implementationStore.trackConnectCall = (storeName: string, instanceId: number, config: any) => {
      console.log('[ReduxDevTools] trackConnectCall called', { storeName, instanceId, config });
      const connectInfo: ConnectCallInfo = {
        storeName,
        timestamp: Date.now(),
        instanceId,
        config,
        initCalled: false,
      };
      connectCalls.set(storeName, connectInfo);
    };

    implementationStore.updateConnectCallInfo = (
      storeName: string,
      updates: { initCalled?: boolean; initTimestamp?: number }
    ) => {
      console.log('[ReduxDevTools] updateConnectCallInfo called', { storeName, updates });
      const connectInfo = connectCalls.get(storeName);
      if (connectInfo) {
        if (updates.initCalled !== undefined) {
          connectInfo.initCalled = updates.initCalled;
        }
        if (updates.initTimestamp !== undefined) {
          connectInfo.initTimestamp = updates.initTimestamp;
        }
        connectCalls.set(storeName, connectInfo);
      }
    };

    console.log('[ReduxDevTools] Implementation functions injected into polyfill');
    return; // Polyfill already set up extension, just inject implementation / Polyfill이 이미 extension을 설정했으므로 구현만 주입
  }

  if (!(globalObj as any).__REDUX_DEVTOOLS_EXTENSION__) {
    // Create connect function (used by Zustand) / Zustand에서 사용하는 connect 함수
    function createConnect() {
      return (preConfig?: { name?: string; instanceId?: number; [key: string]: any }) => {
        const config = preConfig || {};
        const instanceId = config.instanceId || 1;
        const name =
          config.name ||
          (typeof document !== 'undefined' && document.title) ||
          `Instance ${instanceId}`;
        console.log('[ReduxDevTools] connect() called', { instanceId, name, config });

        // Track connect call / connect 호출 추적
        const connectInfo: ConnectCallInfo = {
          storeName: name,
          timestamp: Date.now(),
          instanceId,
          config,
          initCalled: false,
        };
        connectCalls.set(name, connectInfo);

        // Helper function to get current server info / 현재 서버 정보를 가져오는 헬퍼 함수
        const getCurrentServerInfo = () => {
          const serverInfo = getServerInfo();
          if (serverInfo) {
            return serverInfo;
          }
          // Fallback to initial values if not set / 설정되지 않았으면 초기값으로 폴백
          return { serverHost, serverPort };
        };

        // Return ConnectResponse matching reference interface / 레퍼런스 인터페이스와 일치하는 ConnectResponse 반환
        return {
          init<S>(state: S, liftedData?: any) {
            // Update connect call info / connect 호출 정보 업데이트
            const connectInfo = connectCalls.get(name);
            if (connectInfo) {
              connectInfo.initCalled = true;
              connectInfo.initTimestamp = Date.now();
              connectCalls.set(name, connectInfo);
              console.log('[ReduxDevTools] init() called', {
                instanceId,
                name,
                state,
                liftedData,
              });
            }

            // Get current server info dynamically / 현재 서버 정보를 동적으로 가져오기
            const currentServerInfo = getCurrentServerInfo();

            // Send initial state / 초기 상태 전송
            sendCDPMessage(currentServerInfo.serverHost, currentServerInfo.serverPort, {
              method: 'Redux.init',
              params: {
                state: state,
                liftedData: liftedData,
                instanceId,
                name,
                timestamp: Date.now(),
              },
            }).catch(() => {
              // Failed to send init event / init 이벤트 전송 실패
            });
          },

          send<S, A extends { type: string }>(action: A, state: S) {
            // Get current server info dynamically / 현재 서버 정보를 동적으로 가져오기
            const currentServerInfo = getCurrentServerInfo();

            // Send action and state / 액션과 상태 전송
            sendCDPMessage(currentServerInfo.serverHost, currentServerInfo.serverPort, {
              method: 'Redux.actionDispatched',
              params: {
                action: action,
                state: state,
                instanceId,
                name,
                timestamp: Date.now(),
              },
            })
              .then(() => {
                console.log('[ReduxDevTools] send() CDP message sent successfully', {
                  actionType: (action as any).type || 'unknown',
                });
              })
              .catch((error) => {
                console.warn('[ChromeRemoteDevTools] Failed to send Redux event:', error);
              });
          },

          subscribe<S, A extends { type: string }>(
            listener: (message: any) => void
          ): (() => void) | undefined {
            console.log('[ReduxDevTools] subscribe() called', {
              instanceId,
              name,
            });

            // Subscribe to messages from DevTools / DevTools로부터 메시지 구독
            // For React Native, this is a no-op but returns unsubscribe function / React Native에서는 no-op이지만 unsubscribe 함수 반환
            return () => {
              console.log('[ReduxDevTools] unsubscribe() called', {
                instanceId,
                name,
              });
              // Unsubscribe / 구독 해제
            };
          },

          unsubscribe() {
            console.log('[ReduxDevTools] unsubscribe() called', {
              instanceId,
              name,
            });
            // Unsubscribe / 구독 해제
          },

          error(payload: string) {
            console.log('[ReduxDevTools] error() called', {
              instanceId,
              name,
              payload,
            });

            // Send error / 에러 전송
            sendCDPMessage(serverHost, serverPort, {
              method: 'Redux.error',
              params: {
                error: payload,
                instanceId,
                name,
                timestamp: Date.now(),
              },
            })
              .then(() => {
                console.log('[ReduxDevTools] error() CDP message sent successfully');
              })
              .catch((error) => {
                console.warn('[ChromeRemoteDevTools] Failed to send error:', error);
              });
          },
        };
      };
    }

    // Create connect function / connect 함수 생성
    const connectFn = createConnect();

    // Create extension as function (used by Redux Toolkit) / Redux Toolkit에서 사용하는 함수
    function createExtensionFunction() {
      return (config?: any) => {
        console.log('[ReduxDevTools] Extension called as function (for Redux Toolkit)', { config });

        // Return StoreEnhancer / StoreEnhancer 반환
        return (next: any) => (reducer: any, initialState?: any) => {
          const store = next(reducer, initialState);

          // Connect to DevTools / DevTools에 연결
          const devTools = connectFn({
            name: config?.name || 'Redux Store',
            ...config,
          });

          // Send initial state / 초기 상태 전송
          devTools.init(store.getState());

          // Wrap dispatch to track actions / 액션 추적을 위해 dispatch 래핑
          const originalDispatch = store.dispatch;
          store.dispatch = (action: any) => {
            const result = originalDispatch(action);
            const state = store.getState();
            devTools.send(action, state);
            return result;
          };

          return store;
        };
      };
    }

    // Create extension function / extension 함수 생성
    const extensionFunction = createExtensionFunction();

    // Create extension compose function / extension compose 함수 생성
    function createExtensionCompose(): any {
      const extensionCompose = (config?: any): any => {
        return (...funcs: any[]): any => {
          if (funcs.length === 0) {
            return extensionFunction(config);
          }
          if (funcs.length === 1 && typeof funcs[0] === 'object') {
            return extensionCompose(funcs[0]);
          }
          // Compose with other enhancers / 다른 enhancer들과 compose
          return (...args: any[]): any => {
            const enhancer = extensionFunction(config);
            // Use apply to avoid spread argument type error / spread argument 타입 오류를 피하기 위해 apply 사용
            const initialValue = (enhancer as any).apply(null, args);
            return (funcs as any[]).reduceRight(
              (composed: any, f: any) => f(composed),
              initialValue
            );
          };
        };
      };

      // Support both call signatures / 두 가지 호출 시그니처 지원
      return Object.assign((config: any) => extensionCompose(config), extensionCompose) as any;
    }

    // Combine: function with connect method / 결합: 함수이면서 connect 메서드도 가짐
    const extension = Object.assign(extensionFunction, {
      connect: connectFn,
      disconnect: () => {
        // Disconnect all connections / 모든 연결 해제
      },
    });

    // Create compose function / compose 함수 생성
    const extensionCompose = createExtensionCompose();

    // Set both / 둘 다 설정
    (globalObj as any).__REDUX_DEVTOOLS_EXTENSION__ = extension;
    (globalObj as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ = extensionCompose;

    // Also set on window if it exists (for compatibility) / window가 존재하면 window에도 설정 (호환성)
    // IMPORTANT: Zustand devtools middleware might check window first / 중요: Zustand devtools middleware가 window를 먼저 체크할 수 있음
    if (typeof window !== 'undefined') {
      (window as any).__REDUX_DEVTOOLS_EXTENSION__ = extension;
      (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ = extensionCompose;
    } else {
      // React Native might have window as undefined initially / React Native는 초기에 window가 undefined일 수 있음
      // Create window object if it doesn't exist / window 객체가 없으면 생성
      try {
        (global as any).window = global;
        (global as any).window.__REDUX_DEVTOOLS_EXTENSION__ = extension;
        (global as any).window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ = extensionCompose;
      } catch {
        // Failed to create window object / window 객체 생성 실패
      }
    }
  }
}

// Auto-initialize on import / import 시 자동 초기화
// Default values from environment variables or fallback to localhost:8080 / 환경 변수에서 기본값 가져오거나 localhost:8080으로 폴백
const DEFAULT_HOST =
  (typeof process !== 'undefined' && process.env?.CHROME_REMOTE_DEVTOOLS_HOST) ||
  (typeof global !== 'undefined' && (global as any).__ChromeRemoteDevToolsServerHost) ||
  'localhost';
const DEFAULT_PORT =
  (typeof process !== 'undefined' &&
    process.env?.CHROME_REMOTE_DEVTOOLS_PORT &&
    parseInt(process.env.CHROME_REMOTE_DEVTOOLS_PORT, 10)) ||
  (typeof global !== 'undefined' && (global as any).__ChromeRemoteDevToolsServerPort) ||
  8080;

// Auto-setup if not already set / 아직 설정되지 않았으면 자동 설정
if (typeof global !== 'undefined' && !(global as any).__REDUX_DEVTOOLS_EXTENSION__) {
  setupReduxDevToolsExtension(DEFAULT_HOST, DEFAULT_PORT);
}
