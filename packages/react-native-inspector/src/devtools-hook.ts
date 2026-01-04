// Redux DevTools Extension hook for React Native / React Native용 Redux DevTools Extension 훅
// Based on reference/redux-devtools implementation / reference/redux-devtools 구현 기반
import { sendCDPMessage, setServerInfo } from './index';

// Type declarations for React Native environment / React Native 환경용 타입 선언
declare const global: typeof globalThis;
declare const window: any;
declare const document: any;

/**
 * Setup Redux DevTools Extension for React Native / React Native용 Redux DevTools Extension 설정
 * Based on reference/redux-devtools implementation / reference/redux-devtools 구현 기반
 * @param serverHost Server host / 서버 호스트
 * @param serverPort Server port / 서버 포트
 */
export function setupReduxDevToolsExtension(
  serverHost: string,
  serverPort: number
): void {
  setServerInfo(serverHost, serverPort);

  const globalObj =
    typeof global !== 'undefined'
      ? global
      : typeof window !== 'undefined'
        ? window
        : {};

  // Debug: Check current state / 디버그: 현재 상태 확인
  console.log('[ReduxDevTools] Checking extension availability...', {
    hasGlobal: typeof global !== 'undefined',
    hasWindow: typeof window !== 'undefined',
    globalExtension: (globalObj as any).__REDUX_DEVTOOLS_EXTENSION__,
    windowExtension:
      typeof window !== 'undefined'
        ? (window as any).__REDUX_DEVTOOLS_EXTENSION__
        : undefined,
  });

  if (!(globalObj as any).__REDUX_DEVTOOLS_EXTENSION__) {
    console.log('[ReduxDevTools] Setting up __REDUX_DEVTOOLS_EXTENSION__');

    // Create connect function (used by Zustand) / Zustand에서 사용하는 connect 함수
    function createConnect() {
      return (preConfig?: {
        name?: string;
        instanceId?: number;
        [key: string]: any;
      }) => {
        const config = preConfig || {};
        const instanceId = config.instanceId || 1;
        const name =
          config.name ||
          (typeof document !== 'undefined' && document.title) ||
          `Instance ${instanceId}`;

        console.log('[ReduxDevTools] connect() called', { instanceId, name, config });

        // Store connection info / 연결 정보 저장
        const connectionInfo = {
          instanceId,
          name,
          config,
        };

        // Return ConnectResponse matching reference interface / 레퍼런스 인터페이스와 일치하는 ConnectResponse 반환
        return {
          init<S, A extends { type: string }>(state: S, liftedData?: any) {
            console.log('[ReduxDevTools] init() called', {
              instanceId,
              name,
              state,
              liftedData,
            });

            // Send initial state / 초기 상태 전송
            sendCDPMessage(serverHost, serverPort, {
              method: 'Redux.init',
              params: {
                state: state,
                liftedData: liftedData,
                instanceId,
                name,
                timestamp: Date.now(),
              },
            })
              .then(() => {
                console.log('[ReduxDevTools] init() CDP message sent successfully');
              })
              .catch((error) => {
                console.warn(
                  '[ChromeRemoteDevTools] Failed to send init event:',
                  error
                );
              });
          },

          send<S, A extends { type: string }>(action: A, state: S) {
            console.log('[ReduxDevTools] send() called', {
              instanceId,
              name,
              action,
              state,
            });

            // Send action and state / 액션과 상태 전송
            sendCDPMessage(serverHost, serverPort, {
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
                console.log(
                  '[ReduxDevTools] send() CDP message sent successfully',
                  {
                    actionType: (action as any).type || 'unknown',
                  }
                );
              })
              .catch((error) => {
                console.warn(
                  '[ChromeRemoteDevTools] Failed to send Redux event:',
                  error
                );
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
                console.warn(
                  '[ChromeRemoteDevTools] Failed to send error:',
                  error
                );
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
      return Object.assign(
        (config: any) => extensionCompose(config),
        extensionCompose
      ) as any;
    }

    // Combine: function with connect method / 결합: 함수이면서 connect 메서드도 가짐
    const extension = Object.assign(extensionFunction, {
      connect: connectFn,
      disconnect: () => {
        console.log('[ReduxDevTools] disconnect() called');
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
      console.log('[ReduxDevTools] Also set on window object');
    } else {
      // React Native might have window as undefined initially / React Native는 초기에 window가 undefined일 수 있음
      // Create window object if it doesn't exist / window 객체가 없으면 생성
      try {
        (global as any).window = global;
        (global as any).window.__REDUX_DEVTOOLS_EXTENSION__ = extension;
        (global as any).window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ = extensionCompose;
        console.log('[ReduxDevTools] Created window object on global');
      } catch (e) {
        console.warn('[ReduxDevTools] Failed to create window object:', e);
      }
    }

    // Verify setup / 설정 확인
    console.log('[ReduxDevTools] __REDUX_DEVTOOLS_EXTENSION__ setup complete', {
      globalExtension: (globalObj as any).__REDUX_DEVTOOLS_EXTENSION__,
      globalCompose: (globalObj as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__,
      windowExtension:
        typeof window !== 'undefined'
          ? (window as any).__REDUX_DEVTOOLS_EXTENSION__
          : undefined,
      windowCompose:
        typeof window !== 'undefined'
          ? (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
          : undefined,
      hasConnect:
        typeof (globalObj as any).__REDUX_DEVTOOLS_EXTENSION__?.connect ===
        'function',
      isFunction:
        typeof (globalObj as any).__REDUX_DEVTOOLS_EXTENSION__ === 'function',
    });
  } else {
    console.log('[ReduxDevTools] __REDUX_DEVTOOLS_EXTENSION__ already exists');
  }
}

