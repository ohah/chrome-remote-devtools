/**
 * Redux DevTools Extension polyfill for React Native / React Native용 Redux DevTools Extension polyfill
 * This file is executed before all other JavaScript files via Metro's getPolyfills() / 이 파일은 Metro의 getPolyfills()를 통해 다른 모든 JavaScript 파일보다 먼저 실행됩니다
 * This ensures __REDUX_DEVTOOLS_EXTENSION__ is available before any store is created / 이것은 store가 생성되기 전에 __REDUX_DEVTOOLS_EXTENSION__가 사용 가능하도록 보장합니다
 */

// Setup global and window objects / global 및 window 객체 설정
var globalObj = typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : {};

// Ensure window exists for Zustand compatibility / Zustand 호환성을 위해 window가 존재하는지 확인
if (typeof window === 'undefined' && typeof global !== 'undefined') {
  try {
    global.window = global;
  } catch (e) {
    // Ignore errors during initialization / 초기화 중 에러 무시
  }
}

// Only setup if not already set / 아직 설정되지 않은 경우에만 설정
if (!globalObj.__REDUX_DEVTOOLS_EXTENSION__) {
  // Create connect function (used by Zustand) / Zustand에서 사용하는 connect 함수
  function createConnect() {
    return function (preConfig) {
      var config = preConfig || {};
      var instanceId = config.instanceId || 1;
      var name = config.name || (typeof document !== 'undefined' && document.title) || 'Instance ' + instanceId;

      // Return ConnectResponse / ConnectResponse 반환
      return {
        init: function (state, liftedData) {
          // Initialize store state / store 상태 초기화
        },
        send: function (action, state) {
          // Send action and state / 액션과 상태 전송
        },
        subscribe: function (listener) {
          return function () {
            // Unsubscribe / 구독 해제
          };
        },
        unsubscribe: function () {
          // Unsubscribe / 구독 해제
        },
        error: function (payload) {
          // Handle error / 에러 처리
        }
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
      }
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
    } catch (e) {
      // Failed to create window object / window 객체 생성 실패
    }
  }
}
