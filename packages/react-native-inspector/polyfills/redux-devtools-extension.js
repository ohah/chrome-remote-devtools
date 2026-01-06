/**
 * Redux DevTools Extension polyfill for React Native / React Native용 Redux DevTools Extension polyfill
 * This file is executed before all other JavaScript files via Metro's getPolyfills() / 이 파일은 Metro의 getPolyfills()를 통해 다른 모든 JavaScript 파일보다 먼저 실행됩니다
 * This ensures __REDUX_DEVTOOLS_EXTENSION__ is available before any store is created / 이것은 store가 생성되기 전에 __REDUX_DEVTOOLS_EXTENSION__가 사용 가능하도록 보장합니다
 *
 * This polyfill only sets up the structure. Actual implementation will be injected later by Provider component / 이 polyfill은 구조만 설정합니다. 실제 구현은 나중에 Provider 컴포넌트에 의해 주입됩니다
 */

// Setup global and window objects / global 및 window 객체 설정
var globalObj =
  typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : {};

// Ensure window exists for Zustand compatibility / Zustand 호환성을 위해 window가 존재하는지 확인
if (typeof window === 'undefined' && typeof global !== 'undefined') {
  try {
    global.window = global;
  } catch {
    // Ignore errors during initialization / 초기화 중 에러 무시
  }
}

// Store for actual implementation functions (will be injected later by Provider) / 실제 구현 함수 저장소 (나중에 Provider에 의해 주입됨)
var implementationStore = {
  // sendCDPMessage implementation / sendCDPMessage 구현
  sendCDPMessage: null,
  // getServerInfo implementation / getServerInfo 구현
  getServerInfo: null,
  // connect call tracker / connect 호출 추적기
  trackConnectCall: null,
  // updateConnectCallInfo / connect 호출 정보 업데이트
  updateConnectCallInfo: null,
};

// Register implementation store on global for later injection / 나중에 주입하기 위해 global에 구현 저장소 등록
if (typeof global !== 'undefined') {
  global.__ReduxDevToolsImplementationStore = implementationStore;
}

// Only setup if not already set / 아직 설정되지 않은 경우에만 설정
if (!globalObj.__REDUX_DEVTOOLS_EXTENSION__) {
  // Create connect function (used by Zustand) / Zustand에서 사용하는 connect 함수
  // This will use implementation functions if available, otherwise no-op / 구현 함수가 있으면 사용하고, 없으면 no-op
  function createConnect() {
    return function (preConfig) {
      var config = preConfig || {};
      var instanceId = config.instanceId || 1;
      var name =
        config.name ||
        (typeof document !== 'undefined' && document.title) ||
        'Instance ' + instanceId;

      // Track connect call if tracker is available / 추적기가 있으면 connect 호출 추적
      if (implementationStore.trackConnectCall) {
        implementationStore.trackConnectCall(name, instanceId, config);
      }

      // Return ConnectResponse / ConnectResponse 반환
      return {
        init: function (state, liftedData) {
          // Use implementation if available / 구현이 있으면 사용
          if (implementationStore.sendCDPMessage && implementationStore.getServerInfo) {
            var serverInfo = implementationStore.getServerInfo();
            if (serverInfo) {
              // Update connect call info / connect 호출 정보 업데이트
              if (implementationStore.updateConnectCallInfo) {
                implementationStore.updateConnectCallInfo(name, {
                  initCalled: true,
                  initTimestamp: Date.now(),
                });
              }

              // Send initial state / 초기 상태 전송
              implementationStore
                .sendCDPMessage(serverInfo.serverHost, serverInfo.serverPort, {
                  method: 'Redux.init',
                  params: {
                    state: state,
                    liftedData: liftedData,
                    instanceId: instanceId,
                    name: name,
                    timestamp: Date.now(),
                  },
                })
                .catch(function () {
                  // Failed to send init event / init 이벤트 전송 실패
                });
            }
          }
        },

        send: function (action, state) {
          // Use implementation if available / 구현이 있으면 사용
          if (implementationStore.sendCDPMessage && implementationStore.getServerInfo) {
            var serverInfo = implementationStore.getServerInfo();
            if (serverInfo) {
              // Send action and state / 액션과 상태 전송
              implementationStore
                .sendCDPMessage(serverInfo.serverHost, serverInfo.serverPort, {
                  method: 'Redux.actionDispatched',
                  params: {
                    action: action,
                    state: state,
                    instanceId: instanceId,
                    name: name,
                    timestamp: Date.now(),
                  },
                })
                .catch(function () {
                  // Failed to send Redux event / Redux 이벤트 전송 실패
                });
            }
          }
        },

        subscribe: function (_listener) {
          // Subscribe to messages from DevTools / DevTools로부터 메시지 구독
          // For React Native, this is a no-op but returns unsubscribe function / React Native에서는 no-op이지만 unsubscribe 함수 반환
          return function () {
            // Unsubscribe / 구독 해제
          };
        },

        unsubscribe: function () {
          // Unsubscribe / 구독 해제
        },

        error: function (payload) {
          // Use implementation if available / 구현이 있으면 사용
          if (implementationStore.sendCDPMessage && implementationStore.getServerInfo) {
            var serverInfo = implementationStore.getServerInfo();
            if (serverInfo) {
              // Send error / 에러 전송
              implementationStore
                .sendCDPMessage(serverInfo.serverHost, serverInfo.serverPort, {
                  method: 'Redux.error',
                  params: {
                    error: payload,
                    instanceId: instanceId,
                    name: name,
                    timestamp: Date.now(),
                  },
                })
                .catch(function () {
                  // Failed to send error / 에러 전송 실패
                });
            }
          }
        },
      };
    };
  }

  // Create connect function / connect 함수 생성
  var connectFn = createConnect();

  // Create extension as function (used by Redux Toolkit) / Redux Toolkit에서 사용하는 함수
  function createExtensionFunction() {
    var extensionFn = function (config) {
      // Return StoreEnhancer / StoreEnhancer 반환
      return function (next) {
        return function (reducer, initialState) {
          var store = next(reducer, initialState);

          // Connect to DevTools / DevTools에 연결
          var devTools = connectFn({
            name: (config && config.name) || 'Redux Store',
            instanceId: (config && config.instanceId) || 1,
          });

          // Send initial state / 초기 상태 전송
          devTools.init(store.getState());

          // Wrap dispatch to track actions / 액션 추적을 위해 dispatch 래핑
          var originalDispatch = store.dispatch;
          store.dispatch = function (action) {
            var result = originalDispatch(action);
            var state = store.getState();
            devTools.send(action, state);
            return result;
          };

          return store;
        };
      };
    };

    // Add debug property / 디버그 속성 추가
    extensionFn.__isReduxDevToolsExtension = true;

    return extensionFn;
  }

  // Create extension function / extension 함수 생성
  var extensionFunction = createExtensionFunction();

  // Create extension compose function / extension compose 함수 생성
  function createExtensionCompose() {
    var extensionCompose = function (config) {
      return function () {
        var funcs = Array.prototype.slice.call(arguments);
        if (funcs.length === 0) {
          return extensionFunction(config);
        }
        if (funcs.length === 1 && typeof funcs[0] === 'object') {
          return extensionCompose(funcs[0]);
        }
        // Compose with other enhancers / 다른 enhancer들과 compose
        return function () {
          var args = Array.prototype.slice.call(arguments);
          var enhancer = extensionFunction(config);
          var initialValue = enhancer.apply(null, args);
          return funcs.reduceRight(function (composed, f) {
            return f(composed);
          }, initialValue);
        };
      };
    };

    // Support both call signatures / 두 가지 호출 시그니처 지원
    var composeFn = function (config) {
      return extensionCompose(config);
    };
    if (typeof Object !== 'undefined' && Object.assign) {
      return Object.assign(composeFn, extensionCompose);
    } else {
      // Fallback for environments without Object.assign / Object.assign이 없는 환경을 위한 폴백
      for (var key in extensionCompose) {
        if (extensionCompose.hasOwnProperty(key)) {
          composeFn[key] = extensionCompose[key];
        }
      }
      return composeFn;
    }
  }

  // Create compose function / compose 함수 생성
  var extensionCompose = createExtensionCompose();

  // Combine: function with connect method / 결합: 함수이면서 connect 메서드도 가짐
  var extension = extensionFunction;
  if (typeof Object !== 'undefined' && Object.assign) {
    extension = Object.assign(extensionFunction, {
      connect: connectFn,
      disconnect: function () {
        // Disconnect / 연결 해제
      },
    });
  } else {
    // Fallback for environments without Object.assign / Object.assign이 없는 환경을 위한 폴백
    extension.connect = connectFn;
    extension.disconnect = function () {
      // Disconnect / 연결 해제
    };
  }

  // Set both / 둘 다 설정
  globalObj.__REDUX_DEVTOOLS_EXTENSION__ = extension;
  globalObj.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ = extensionCompose;

  // Also set on window if it exists (for compatibility) / window가 존재하면 window에도 설정 (호환성)
  if (typeof window !== 'undefined') {
    window.__REDUX_DEVTOOLS_EXTENSION__ = extension;
    window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ = extensionCompose;
  } else {
    // React Native might have window as undefined initially / React Native는 초기에 window가 undefined일 수 있음
    try {
      global.window = global;
      global.window.__REDUX_DEVTOOLS_EXTENSION__ = extension;
      global.window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ = extensionCompose;
    } catch {
      // Failed to create window object / window 객체 생성 실패
    }
  }
}
