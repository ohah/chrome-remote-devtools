/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Modified for Chrome Remote DevTools / Chrome Remote DevTools용으로 수정됨
 */

#include "ReduxDevToolsExtension.h"
#include "ConsoleHook.h"
#include <sstream>
#include <atomic>
#include <ctime>
#include <functional>

// Platform-specific log support / 플랫폼별 로그 지원
#ifdef __ANDROID__
#include <android/log.h>
#define LOG_TAG "ReduxDevToolsExtension"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGD(...) __android_log_print(ANDROID_LOG_DEBUG, LOG_TAG, __VA_ARGS__)
#define LOGW(...) __android_log_print(ANDROID_LOG_WARN, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)
#else
#define LOGI(...)
#define LOGD(...)
#define LOGW(...)
#define LOGE(...)
#endif

namespace chrome_remote_devtools {

// Global server info storage / 전역 서버 정보 저장소
static std::string g_serverHost = "localhost";
static int g_serverPort = 8080;
static std::atomic<bool> g_serverInfoSet{false};

/**
 * Set server info / 서버 정보 설정
 * This should be called from native module when connection is established / 연결이 설정되면 네이티브 모듈에서 호출해야 함
 */
void setReduxDevToolsServerInfo(const std::string& host, int port) {
  g_serverHost = host;
  g_serverPort = port;
  g_serverInfoSet.store(true);
  LOGI("Redux DevTools server info set: %s:%d", host.c_str(), port);
}

ReduxDevToolsExtensionHostObject::ReduxDevToolsExtensionHostObject()
    : nextInstanceId_(1) {
}

ReduxDevToolsExtensionHostObject::~ReduxDevToolsExtensionHostObject() {
}

facebook::jsi::Value ReduxDevToolsExtensionHostObject::get(
    facebook::jsi::Runtime& runtime,
    const facebook::jsi::PropNameID& name) {
  auto propName = name.utf8(runtime);

  if (propName == "connect") {
    return createConnectFunction(runtime);
  }

  // Return undefined for unknown properties / 알 수 없는 속성에 대해 undefined 반환
  return facebook::jsi::Value::undefined();
}

void ReduxDevToolsExtensionHostObject::set(
    facebook::jsi::Runtime& runtime,
    const facebook::jsi::PropNameID& name,
    const facebook::jsi::Value& value) {
  // HostObject properties are read-only / HostObject 속성은 읽기 전용
  (void)runtime;
  (void)name;
  (void)value;
}

std::vector<facebook::jsi::PropNameID> ReduxDevToolsExtensionHostObject::getPropertyNames(
    facebook::jsi::Runtime& runtime) {
  std::vector<facebook::jsi::PropNameID> names;
  names.push_back(facebook::jsi::PropNameID::forAscii(runtime, "connect"));
  return names;
}

facebook::jsi::Function ReduxDevToolsExtensionHostObject::createConnectFunction(
    facebook::jsi::Runtime& runtime) {
  return facebook::jsi::Function::createFromHostFunction(
      runtime,
      facebook::jsi::PropNameID::forAscii(runtime, "connect"),
      1, // parameter count / 매개변수 개수
      [this](facebook::jsi::Runtime& rt,
             const facebook::jsi::Value&,
             const facebook::jsi::Value* args,
             size_t count) -> facebook::jsi::Value {
        try {
          // Parse config / config 파싱
          int instanceId = 1;
          std::string name = "Redux Store";

          if (count > 0 && args[0].isObject()) {
            auto config = args[0].asObject(rt);
            if (config.hasProperty(rt, "instanceId")) {
              auto instanceIdValue = config.getProperty(rt, "instanceId");
              if (instanceIdValue.isNumber()) {
                instanceId = static_cast<int>(instanceIdValue.getNumber());
              }
            }
            if (config.hasProperty(rt, "name")) {
              auto nameValue = config.getProperty(rt, "name");
              if (nameValue.isString()) {
                name = nameValue.getString(rt).utf8(rt);
              }
            }
          }

          // Create connect response / connect 응답 생성
          return createConnectResponse(rt, instanceId, name);
        } catch (const std::exception& e) {
          LOGE("Exception in connect function: %s", e.what());
          return facebook::jsi::Value::undefined();
        } catch (...) {
          LOGE("Unknown exception in connect function");
          return facebook::jsi::Value::undefined();
        }
      });
}

facebook::jsi::Object ReduxDevToolsExtensionHostObject::createConnectResponse(
    facebook::jsi::Runtime& runtime,
    int instanceId,
    const std::string& name) {
  auto response = facebook::jsi::Object(runtime);

  // Store last state for _requestState / _requestState를 위한 마지막 상태 저장
  auto lastState = std::make_shared<facebook::jsi::Value>(facebook::jsi::Value::undefined());
  auto lastLiftedData = std::make_shared<facebook::jsi::Value>(facebook::jsi::Value::undefined());

  // Helper function to send state / 상태 전송 헬퍼 함수
  // Use std::function to make it copyable for lambda capture / 람다 캡처를 위해 std::function 사용
  std::function<void(facebook::jsi::Runtime&, const facebook::jsi::Value&, const facebook::jsi::Value&)> sendState =
      [instanceId, name](facebook::jsi::Runtime& rt,
                         const facebook::jsi::Value& state,
                         const facebook::jsi::Value& liftedData) {
        try {
          // Get server info / 서버 정보 가져오기
          std::string serverHost = g_serverHost;
          int serverPort = g_serverPort;

          if (!g_serverInfoSet.load()) {
            // Server info not set yet, skip sending / 서버 정보가 아직 설정되지 않음, 전송 건너뜀
            return;
          }

          // Create lifted state / lifted state 생성
          std::string stateJson;
          if (state.isString()) {
            stateJson = state.getString(rt).utf8(rt);
          } else {
            // Try to stringify / 문자열화 시도
            try {
              auto jsonStringify = rt.global().getPropertyAsFunction(rt, "JSON").getPropertyAsFunction(rt, "stringify");
              auto jsonValue = jsonStringify.call(rt, state);
              if (jsonValue.isString()) {
                stateJson = jsonValue.getString(rt).utf8(rt);
              }
            } catch (...) {
              stateJson = "{}";
            }
          }

          std::string liftedStateJson = "{"
            "\"actionsById\":{},"
            "\"computedStates\":[{\"state\":" + stateJson + "}],"
            "\"currentStateIndex\":0,"
            "\"nextActionId\":1,"
            "\"skippedActionIds\":[],"
            "\"stagedActionIds\":[0]"
          "}";

          // Create CDP message / CDP 메시지 생성
          std::stringstream paramsStream;
          paramsStream << "{"
            << "\"type\":\"STATE\","
            << "\"payload\":" << liftedStateJson << ","
            << "\"source\":\"@devtools-page\","
            << "\"instanceId\":" << instanceId << ","
            << "\"libConfig\":{"
              << "\"name\":\"" << name << "\","
              << "\"type\":\"redux\""
            << "}"
          << "}";

          // Send CDP message using global callback / 전역 콜백을 사용하여 CDP 메시지 전송
          extern SendCDPMessageCallback g_sendCDPMessageCallback;
          if (g_sendCDPMessageCallback && g_serverInfoSet.load()) {
            std::stringstream messageStream;
            messageStream << "{\"method\":\"Redux.message\",\"params\":" << paramsStream.str() << "}";
            g_sendCDPMessageCallback(serverHost.c_str(), serverPort, messageStream.str().c_str());
          }
        } catch (const std::exception& e) {
          LOGE("Exception in sendState: %s", e.what());
        } catch (...) {
          LOGE("Unknown exception in sendState");
        }
      };

  // init method / init 메서드
  response.setProperty(
      runtime,
      "init",
      facebook::jsi::Function::createFromHostFunction(
          runtime,
          facebook::jsi::PropNameID::forAscii(runtime, "init"),
          2, // state, liftedData / state, liftedData
          [instanceId, name, lastState, lastLiftedData, sendState](
              facebook::jsi::Runtime& rt,
              const facebook::jsi::Value&,
              const facebook::jsi::Value* args,
              size_t count) -> facebook::jsi::Value {
            try {
              if (count > 0) {
                *lastState = facebook::jsi::Value(rt, args[0]);
              }
              if (count > 1) {
                *lastLiftedData = facebook::jsi::Value(rt, args[1]);
              }

              // Get server info / 서버 정보 가져오기
              std::string serverHost = g_serverHost;
              int serverPort = g_serverPort;

              if (!g_serverInfoSet.load()) {
                // Server info not set yet, skip sending / 서버 정보가 아직 설정되지 않음, 전송 건너뜀
                return facebook::jsi::Value::undefined();
              }

              // Send INIT_INSTANCE message / INIT_INSTANCE 메시지 전송
              std::stringstream initInstanceParams;
              initInstanceParams << "{"
                << "\"type\":\"INIT_INSTANCE\","
                << "\"instanceId\":" << instanceId << ","
                << "\"source\":\"@devtools-page\""
              << "}";
              // Send CDP message using global callback / 전역 콜백을 사용하여 CDP 메시지 전송
              extern SendCDPMessageCallback g_sendCDPMessageCallback;
              if (g_sendCDPMessageCallback && g_serverInfoSet.load()) {
                std::stringstream messageStream;
                messageStream << "{\"method\":\"Redux.message\",\"params\":" << initInstanceParams.str() << "}";
                g_sendCDPMessageCallback(g_serverHost.c_str(), g_serverPort, messageStream.str().c_str());
              }

              // Send INIT message / INIT 메시지 전송
              std::string stateJson = "{}";
              if (count > 0) {
                try {
                  auto jsonStringify = rt.global().getPropertyAsFunction(rt, "JSON").getPropertyAsFunction(rt, "stringify");
                  auto jsonValue = jsonStringify.call(rt, args[0]);
                  if (jsonValue.isString()) {
                    stateJson = jsonValue.getString(rt).utf8(rt);
                  }
                } catch (...) {
                  stateJson = "{}";
                }
              }

              std::stringstream initParams;
              initParams << "{"
                << "\"type\":\"INIT\","
                << "\"instanceId\":" << instanceId << ","
                << "\"source\":\"@devtools-page\","
                << "\"name\":\"" << name << "\","
                << "\"payload\":" << stateJson << ","
                << "\"maxAge\":50,"
                << "\"timestamp\":" << static_cast<long long>(std::time(nullptr) * 1000)
              << "}";
              // Send CDP message using global callback / 전역 콜백을 사용하여 CDP 메시지 전송
              extern SendCDPMessageCallback g_sendCDPMessageCallback;
              if (g_sendCDPMessageCallback && g_serverInfoSet.load()) {
                std::stringstream messageStream;
                messageStream << "{\"method\":\"Redux.message\",\"params\":" << initParams.str() << "}";
                g_sendCDPMessageCallback(g_serverHost.c_str(), g_serverPort, messageStream.str().c_str());
              }

              // Send initial state / 초기 상태 전송
              if (count > 0) {
                if (count > 1) {
                  sendState(rt, args[0], args[1]);
                } else {
                  sendState(rt, args[0], facebook::jsi::Value::undefined());
                }
              }

              return facebook::jsi::Value::undefined();
            } catch (const std::exception& e) {
              LOGE("Exception in init: %s", e.what());
              return facebook::jsi::Value::undefined();
            } catch (...) {
              LOGE("Unknown exception in init");
              return facebook::jsi::Value::undefined();
            }
          }));

  // send method / send 메서드
  response.setProperty(
      runtime,
      "send",
      facebook::jsi::Function::createFromHostFunction(
          runtime,
          facebook::jsi::PropNameID::forAscii(runtime, "send"),
          2, // action, state / action, state
          [instanceId, name, lastState, sendState](
              facebook::jsi::Runtime& rt,
              const facebook::jsi::Value&,
              const facebook::jsi::Value* args,
              size_t count) -> facebook::jsi::Value {
            try {
              if (count > 1) {
                *lastState = facebook::jsi::Value(rt, args[1]);
              }

              // Get server info / 서버 정보 가져오기
              std::string serverHost = g_serverHost;
              int serverPort = g_serverPort;

              if (!g_serverInfoSet.load()) {
                // Server info not set yet, skip sending / 서버 정보가 아직 설정되지 않음, 전송 건너뜀
                return facebook::jsi::Value::undefined();
              }

              // Stringify action and state / action과 state 문자열화
              std::string actionJson = "{}";
              std::string stateJson = "{}";

              if (count > 0) {
                try {
                  auto jsonStringify = rt.global().getPropertyAsFunction(rt, "JSON").getPropertyAsFunction(rt, "stringify");
                  auto actionJsonValue = jsonStringify.call(rt, args[0]);
                  if (actionJsonValue.isString()) {
                    actionJson = actionJsonValue.getString(rt).utf8(rt);
                  }
                } catch (...) {
                  actionJson = "{}";
                }
              }

              if (count > 1) {
                try {
                  auto jsonStringify = rt.global().getPropertyAsFunction(rt, "JSON").getPropertyAsFunction(rt, "stringify");
                  auto stateJsonValue = jsonStringify.call(rt, args[1]);
                  if (stateJsonValue.isString()) {
                    stateJson = stateJsonValue.getString(rt).utf8(rt);
                  }
                } catch (...) {
                  stateJson = "{}";
                }
              }

              // Send ACTION message / ACTION 메시지 전송
              std::stringstream params;
              params << "{"
                << "\"type\":\"ACTION\","
                << "\"instanceId\":" << instanceId << ","
                << "\"source\":\"@devtools-page\","
                << "\"action\":" << actionJson << ","
                << "\"payload\":" << stateJson << ","
                << "\"maxAge\":50,"
                << "\"timestamp\":" << static_cast<long long>(std::time(nullptr) * 1000)
              << "}";
              // Send CDP message using global callback / 전역 콜백을 사용하여 CDP 메시지 전송
              extern SendCDPMessageCallback g_sendCDPMessageCallback;
              if (g_sendCDPMessageCallback && g_serverInfoSet.load()) {
                std::stringstream messageStream;
                messageStream << "{\"method\":\"Redux.message\",\"params\":" << params.str() << "}";
                g_sendCDPMessageCallback(g_serverHost.c_str(), g_serverPort, messageStream.str().c_str());
              }

              return facebook::jsi::Value::undefined();
            } catch (const std::exception& e) {
              LOGE("Exception in send: %s", e.what());
              return facebook::jsi::Value::undefined();
            } catch (...) {
              LOGE("Unknown exception in send");
              return facebook::jsi::Value::undefined();
            }
          }));

  // subscribe method / subscribe 메서드
  response.setProperty(
      runtime,
      "subscribe",
      facebook::jsi::Function::createFromHostFunction(
          runtime,
          facebook::jsi::PropNameID::forAscii(runtime, "subscribe"),
          1, // listener / listener
          [](facebook::jsi::Runtime& rt,
             const facebook::jsi::Value&,
             const facebook::jsi::Value*,
             size_t) -> facebook::jsi::Value {
            // Return unsubscribe function / unsubscribe 함수 반환
            return facebook::jsi::Function::createFromHostFunction(
                rt,
                facebook::jsi::PropNameID::forAscii(rt, "unsubscribe"),
                0,
                [](facebook::jsi::Runtime&,
                   const facebook::jsi::Value&,
                   const facebook::jsi::Value*,
                   size_t) -> facebook::jsi::Value {
                  return facebook::jsi::Value::undefined();
                });
          }));

  // unsubscribe method / unsubscribe 메서드
  response.setProperty(
      runtime,
      "unsubscribe",
      facebook::jsi::Function::createFromHostFunction(
          runtime,
          facebook::jsi::PropNameID::forAscii(runtime, "unsubscribe"),
          0,
          [](facebook::jsi::Runtime&,
             const facebook::jsi::Value&,
             const facebook::jsi::Value*,
             size_t) -> facebook::jsi::Value {
            return facebook::jsi::Value::undefined();
          }));

  // error method / error 메서드
  response.setProperty(
      runtime,
      "error",
      facebook::jsi::Function::createFromHostFunction(
          runtime,
          facebook::jsi::PropNameID::forAscii(runtime, "error"),
          1, // payload / payload
          [instanceId, name](
              facebook::jsi::Runtime& rt,
              const facebook::jsi::Value&,
              const facebook::jsi::Value* args,
              size_t count) -> facebook::jsi::Value {
            try {
              if (!g_serverInfoSet.load()) {
                return facebook::jsi::Value::undefined();
              }

              std::string errorStr = "{}";
              if (count > 0) {
                if (args[0].isString()) {
                  errorStr = args[0].getString(rt).utf8(rt);
                } else {
                  try {
                    auto jsonStringify = rt.global().getPropertyAsFunction(rt, "JSON").getPropertyAsFunction(rt, "stringify");
                    auto jsonValue = jsonStringify.call(rt, args[0]);
                    if (jsonValue.isString()) {
                      errorStr = jsonValue.getString(rt).utf8(rt);
                    }
                  } catch (...) {
                    errorStr = "{}";
                  }
                }
              }

              std::stringstream params;
              params << "{"
                << "\"type\":\"ERROR\","
                << "\"instanceId\":" << instanceId << ","
                << "\"source\":\"@devtools-page\","
                << "\"error\":" << errorStr << ","
                << "\"name\":\"" << name << "\","
                << "\"timestamp\":" << static_cast<long long>(std::time(nullptr) * 1000)
              << "}";
              // Send CDP message using global callback / 전역 콜백을 사용하여 CDP 메시지 전송
              extern SendCDPMessageCallback g_sendCDPMessageCallback;
              if (g_sendCDPMessageCallback && g_serverInfoSet.load()) {
                std::stringstream messageStream;
                messageStream << "{\"method\":\"Redux.message\",\"params\":" << params.str() << "}";
                g_sendCDPMessageCallback(g_serverHost.c_str(), g_serverPort, messageStream.str().c_str());
              }

              return facebook::jsi::Value::undefined();
            } catch (const std::exception& e) {
              LOGE("Exception in error: %s", e.what());
              return facebook::jsi::Value::undefined();
            } catch (...) {
              LOGE("Unknown exception in error");
              return facebook::jsi::Value::undefined();
            }
          }));

  // _requestState method / _requestState 메서드
  response.setProperty(
      runtime,
      "_requestState",
      facebook::jsi::Function::createFromHostFunction(
          runtime,
          facebook::jsi::PropNameID::forAscii(runtime, "_requestState"),
          0,
          [lastState, lastLiftedData, sendState](
              facebook::jsi::Runtime& rt,
              const facebook::jsi::Value&,
              const facebook::jsi::Value*,
              size_t) -> facebook::jsi::Value {
            try {
              if (!lastState->isUndefined()) {
                sendState(rt, *lastState, *lastLiftedData);
              }
              return facebook::jsi::Value::undefined();
            } catch (const std::exception& e) {
              LOGE("Exception in _requestState: %s", e.what());
              return facebook::jsi::Value::undefined();
            } catch (...) {
              LOGE("Unknown exception in _requestState");
              return facebook::jsi::Value::undefined();
            }
          }));

  return response;
}

void ReduxDevToolsExtensionHostObject::sendCDPMessage(
    const std::string& method,
    const std::string& params) {
  // Use platform callback from ConsoleHook / ConsoleHook의 플랫폼 콜백 사용
  // Note: g_sendCDPMessageCallback is defined in ConsoleHook.cpp / 참고: g_sendCDPMessageCallback은 ConsoleHook.cpp에 정의됨
  extern SendCDPMessageCallback g_sendCDPMessageCallback;
  if (g_sendCDPMessageCallback && g_serverInfoSet.load()) {
    std::string serverHost = g_serverHost;
    int serverPort = g_serverPort;
    if (g_serverInfoSet.load()) {
      // Create full CDP message / 전체 CDP 메시지 생성
      std::stringstream messageStream;
      messageStream << "{\"method\":\"" << method << "\",\"params\":" << params << "}";
      g_sendCDPMessageCallback(serverHost.c_str(), serverPort, messageStream.str().c_str());
    }
  }
}

std::string ReduxDevToolsExtensionHostObject::getServerInfo() {
  if (g_serverInfoSet.load()) {
    std::stringstream info;
    info << "{\"serverHost\":\"" << g_serverHost << "\",\"serverPort\":" << g_serverPort << "}";
    return info.str();
  }
  return "{}";
}

bool installReduxDevToolsExtension(facebook::jsi::Runtime& runtime) {
  try {
    LOGI("========================================");
    LOGI("Installing Redux DevTools Extension via JSI / JSI를 통해 Redux DevTools Extension 설치 중");

    // Check if already installed / 이미 설치되었는지 확인
    auto global = runtime.global();
    auto extensionName = facebook::jsi::PropNameID::forAscii(runtime, "__REDUX_DEVTOOLS_EXTENSION__");

    try {
      auto existing = global.getProperty(runtime, extensionName);
      if (!existing.isUndefined()) {
        LOGI("⚠️ Redux DevTools Extension already installed / Redux DevTools Extension이 이미 설치됨");
        LOGI("========================================");
        return true;
      }
    } catch (...) {
      // Property doesn't exist, continue with installation / 속성이 존재하지 않음, 설치 계속 진행
      LOGD("__REDUX_DEVTOOLS_EXTENSION__ does not exist, proceeding with installation / __REDUX_DEVTOOLS_EXTENSION__가 존재하지 않음, 설치 진행");
    }

    // Create HostObject / HostObject 생성
    auto hostObject = std::make_shared<ReduxDevToolsExtensionHostObject>();
    auto extensionObject = facebook::jsi::Object::createFromHostObject(runtime, hostObject);

    // Also create as function (for Redux Toolkit) / 함수로도 생성 (Redux Toolkit용)
    auto extensionFunction = facebook::jsi::Function::createFromHostFunction(
        runtime,
        facebook::jsi::PropNameID::forAscii(runtime, "__REDUX_DEVTOOLS_EXTENSION__"),
        1, // config / config
        [hostObject](facebook::jsi::Runtime& rt,
                    const facebook::jsi::Value&,
                    const facebook::jsi::Value* args,
                    size_t count) -> facebook::jsi::Value {
          // Return StoreEnhancer / StoreEnhancer 반환
          return facebook::jsi::Function::createFromHostFunction(
              rt,
              facebook::jsi::PropNameID::forAscii(rt, "enhancer"),
              1, // next / next
              [hostObject](facebook::jsi::Runtime& runtime,
                          const facebook::jsi::Value&,
                          const facebook::jsi::Value* args,
                          size_t count) -> facebook::jsi::Value {
                // Return store creator / store 생성자 반환
                return facebook::jsi::Function::createFromHostFunction(
                    runtime,
                    facebook::jsi::PropNameID::forAscii(runtime, "createStore"),
                    2, // reducer, initialState / reducer, initialState
                    [hostObject](facebook::jsi::Runtime& rt,
                                const facebook::jsi::Value&,
                                const facebook::jsi::Value* args,
                                size_t count) -> facebook::jsi::Value {
                      // Call next to create store / next를 호출하여 store 생성
                      if (count > 0 && args[0].isObject() && args[0].asObject(rt).isFunction(rt)) {
                        auto next = args[0].asObject(rt).getFunction(rt);
                        facebook::jsi::Value store;
                        if (count > 1) {
                          if (count > 2) {
                            // Call with reducer and initialState / reducer와 initialState로 호출
                            store = next.call(rt, args[1], args[2]);
                          } else {
                            // Call with reducer only / reducer만으로 호출
                            store = next.call(rt, args[1]);
                          }
                        } else {
                          // Call with no arguments / 인자 없이 호출
                          store = next.call(rt);
                        }

                        // Get connect function / connect 함수 가져오기
                        auto extensionObj = facebook::jsi::Object::createFromHostObject(rt, hostObject);
                        auto connectFn = extensionObj.getPropertyAsFunction(rt, "connect");

                        // Connect to DevTools / DevTools에 연결
                        auto devTools = connectFn.call(rt, facebook::jsi::Value::undefined());

                        // Get init method / init 메서드 가져오기
                        if (devTools.isObject()) {
                          auto devToolsObj = devTools.asObject(rt);
                          if (devToolsObj.hasProperty(rt, "init")) {
                            auto initFn = devToolsObj.getPropertyAsFunction(rt, "init");
                            if (store.isObject()) {
                              auto storeObj = store.asObject(rt);
                              if (storeObj.hasProperty(rt, "getState")) {
                                auto getStateFn = storeObj.getPropertyAsFunction(rt, "getState");
                                auto state = getStateFn.call(rt);
                                initFn.call(rt, state);
                              }
                            }
                          }
                        }

                        return store;
                      }
                      return facebook::jsi::Value::undefined();
                    });
              });
        });

    // Set both as object and function / 객체와 함수 모두로 설정
    global.setProperty(runtime, extensionName, extensionFunction);

    // Also set connect property on function / 함수에도 connect 속성 설정
    auto connectFn = extensionObject.getPropertyAsFunction(runtime, "connect");
    extensionFunction.setProperty(runtime, "connect", connectFn);

    // Create __REDUX_DEVTOOLS_EXTENSION_COMPOSE__ for Redux Toolkit / Redux Toolkit을 위한 __REDUX_DEVTOOLS_EXTENSION_COMPOSE__ 생성
    // This is used by Redux Toolkit's configureStore / Redux Toolkit의 configureStore에서 사용됩니다
    // Use JavaScript eval to create compose function / JavaScript eval을 사용하여 compose 함수 생성
    try {
      auto composeName = facebook::jsi::PropNameID::forAscii(runtime, "__REDUX_DEVTOOLS_EXTENSION_COMPOSE__");

      // Create compose function using JavaScript eval / JavaScript eval을 사용하여 compose 함수 생성
      // compose(...funcs) returns a function that applies funcs from right to left / compose(...funcs)는 오른쪽에서 왼쪽으로 funcs를 적용하는 함수를 반환합니다
      std::string composeCode = R"(
        (function() {
          function compose(...funcs) {
            if (funcs.length === 0) {
              return (arg) => arg;
            }
            if (funcs.length === 1) {
              return funcs[0];
            }
            return funcs.reduce((a, b) => (...args) => a(b(...args)));
          }
          return compose;
        })()
      )";

      // Use eval to execute JavaScript code / eval을 사용하여 JavaScript 코드 실행
      auto evalFunc = runtime.global().getPropertyAsFunction(runtime, "eval");
      auto composeResult = evalFunc.call(
          runtime,
          facebook::jsi::String::createFromUtf8(runtime, composeCode)
      );

      if (composeResult.isObject() && composeResult.asObject(runtime).isFunction(runtime)) {
        global.setProperty(runtime, composeName, composeResult);
        LOGI("   - __REDUX_DEVTOOLS_EXTENSION_COMPOSE__ installed / __REDUX_DEVTOOLS_EXTENSION_COMPOSE__ 설치됨");
      } else {
        LOGW("   - Failed to create __REDUX_DEVTOOLS_EXTENSION_COMPOSE__ / __REDUX_DEVTOOLS_EXTENSION_COMPOSE__ 생성 실패");
      }
    } catch (const std::exception& e) {
      LOGW("   - Exception creating __REDUX_DEVTOOLS_EXTENSION_COMPOSE__: %s", e.what());
    } catch (...) {
      LOGW("   - Unknown exception creating __REDUX_DEVTOOLS_EXTENSION_COMPOSE__");
    }

    // Verify installation / 설치 확인
    try {
      auto verify = global.getProperty(runtime, extensionName);
      if (!verify.isUndefined()) {
        LOGI("✅ Redux DevTools Extension installed successfully / Redux DevTools Extension이 성공적으로 설치됨");
        // Check if it's a function by trying to call it / 호출을 시도하여 함수인지 확인
        bool isFunction = false;
        try {
          if (verify.isObject()) {
            auto obj = verify.asObject(runtime);
            if (obj.isFunction(runtime)) {
              isFunction = true;
            }
          }
        } catch (...) {
          // Ignore errors / 에러 무시
        }
        LOGI("   - Type: %s", verify.isObject() ? (isFunction ? "Function" : "Object") : "Unknown");
        LOGI("   - Has connect: %s", verify.isObject() && verify.asObject(runtime).hasProperty(runtime, "connect") ? "Yes" : "No");
        LOGI("========================================");

        // Also set a flag in global for JS to check / JS에서 확인할 수 있도록 전역 플래그 설정
        auto flagName = facebook::jsi::PropNameID::forAscii(runtime, "__REDUX_DEVTOOLS_EXTENSION_JSI_INJECTED__");
        global.setProperty(runtime, flagName, facebook::jsi::Value(true));

        return true;
      } else {
        LOGE("❌ Installation verification failed: property is undefined / 설치 확인 실패: 속성이 undefined입니다");
        LOGI("========================================");
        return false;
      }
    } catch (const std::exception& e) {
      LOGE("❌ Installation verification failed: %s", e.what());
      LOGI("========================================");
      return false;
    }
  } catch (const std::exception& e) {
    LOGE("Failed to install Redux DevTools Extension: %s", e.what());
    return false;
  } catch (...) {
    LOGE("Unknown exception while installing Redux DevTools Extension");
    return false;
  }
}

} // namespace chrome_remote_devtools
