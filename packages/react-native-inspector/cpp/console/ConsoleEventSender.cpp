/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Modified for Chrome Remote DevTools / Chrome Remote DevTools용으로 수정됨
 */

#include "ConsoleEventSender.h"
#include "ConsoleGlobals.h"
#include "ConsoleUtils.h"
#include "../ConsoleHook.h" // For SendCDPMessageCallback / SendCDPMessageCallback을 위해
#include <folly/json.h>
#include <chrono>
#include <cstring>

// Platform-specific log support / 플랫폼별 로그 지원
#ifdef __ANDROID__
#include <android/log.h>
#define LOG_TAG "ConsoleEventSender"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)
#define LOGW(...) __android_log_print(ANDROID_LOG_WARN, LOG_TAG, __VA_ARGS__)
#elif defined(__APPLE__)
#define LOG_TAG "ConsoleEventSender"
#define LOGI(...) ((void)0)
#define LOGE(...) ((void)0)
#define LOGW(...) ((void)0)
#else
#define LOGI(...)
#define LOGE(...)
#define LOGW(...)
#endif

// Forward declaration / 전방 선언
namespace chrome_remote_devtools {
  extern SendCDPMessageCallback g_sendCDPMessageCallback;
}

namespace chrome_remote_devtools {
namespace console {

// Get server host and port from global / 전역에서 서버 호스트와 포트 가져오기
static void getServerInfo(facebook::jsi::Runtime& runtime, std::string& serverHost, int& serverPort) {
  serverHost = "localhost";
  serverPort = 8080;
  try {
    facebook::jsi::Value hostValue = runtime.global().getProperty(runtime, "__ChromeRemoteDevToolsServerHost");
    if (hostValue.isString()) {
      serverHost = hostValue.asString(runtime).utf8(runtime);
    }
    facebook::jsi::Value portValue = runtime.global().getProperty(runtime, "__ChromeRemoteDevToolsServerPort");
    if (portValue.isNumber()) {
      serverPort = static_cast<int>(portValue.asNumber());
    }
  } catch (...) {
    // Use defaults / 기본값 사용
  }
}

// Send console API called event / console API 호출 이벤트 전송
void sendConsoleAPICalled(facebook::jsi::Runtime& runtime,
                          const std::string& type,
                          const std::vector<RemoteObject>& args) {
  try {
    // Create args array using folly::dynamic / folly::dynamic을 사용하여 args 배열 생성
    folly::dynamic argsArray = folly::dynamic::array;
    for (const auto& arg : args) {
      folly::dynamic argObj = folly::dynamic::object;
      argObj["type"] = arg.type;
      // Always include subtype field (empty string if not set) / subtype 필드를 항상 포함 (설정되지 않았으면 빈 문자열)
      argObj["subtype"] = arg.subtype.empty() ? "" : arg.subtype;
      // For objects, do NOT include value field / 객체의 경우 value 필드를 포함하지 않음
      // Only include value for primitive types / 기본 타입에만 value 포함
      if (arg.type != "object" || arg.subtype == "null") {
        // Primitive types or null: include value with correct type / 기본 타입 또는 null: 올바른 타입으로 value 포함
        if (!arg.value.empty()) {
          if (arg.type == "number") {
            // Parse number and store as double / 숫자를 파싱하여 double로 저장
            try {
              double numValue = std::stod(arg.value);
              argObj["value"] = numValue;
            } catch (...) {
              // If parsing fails, use string / 파싱 실패 시 문자열 사용
              argObj["value"] = arg.value;
            }
          } else if (arg.type == "boolean") {
            // Parse boolean and store as bool / 불린을 파싱하여 bool로 저장
            if (arg.value == "true") {
              argObj["value"] = true;
            } else if (arg.value == "false") {
              argObj["value"] = false;
            } else {
              // If parsing fails, use string / 파싱 실패 시 문자열 사용
              argObj["value"] = arg.value;
            }
          } else if (arg.type == "object" && arg.subtype == "null") {
            // null: store as nullptr / null: nullptr로 저장
            argObj["value"] = nullptr;
          } else {
            // String or other types: use string value / 문자열 또는 기타 타입: 문자열 값 사용
            argObj["value"] = arg.value;
          }
        } else if (arg.type == "object" && arg.subtype == "null") {
          // null without value string: store as nullptr / 값 문자열이 없는 null: nullptr로 저장
          argObj["value"] = nullptr;
        }
      }
      // For objects (type == "object" && subtype != "null"), format according to CDP spec / 객체의 경우 (type == "object" && subtype != "null"), CDP 스펙에 따라 포맷팅
      // CDP spec: Objects should use "Object" as description, not JSON string / CDP 스펙: 객체는 JSON 문자열이 아닌 "Object"를 description으로 사용해야 함
      // Details should be in preview.properties, not in description or value / 상세 내용은 description이나 value가 아닌 preview.properties에 있어야 함

      // Add description if present (for objects) / description이 있으면 추가 (객체용)
      if (!arg.description.empty()) {
        // For objects, try to parse description as JSON and create preview / 객체의 경우 description을 JSON으로 파싱하여 preview 생성
        if (arg.type == "object" && arg.subtype != "null") {
          try {
            // Try to parse description as JSON / description을 JSON으로 파싱 시도
            folly::dynamic parsedDesc = folly::parseJson(arg.description);
            if (parsedDesc.isObject()) {
              // Generate unique objectId / 고유한 objectId 생성
              size_t objectId = console::g_objectIdCounter.fetch_add(1);
              argObj["objectId"] = std::to_string(objectId);

              // Store original JSON string for Runtime.getProperties / Runtime.getProperties를 위해 원본 JSON 문자열 저장
              argObj["_originalDescription"] = arg.description;

              // Set description to "Object" instead of JSON string / description을 JSON 문자열이 아닌 "Object"로 설정
              argObj["description"] = "Object";
              // Add className for better DevTools display / 더 나은 DevTools 표시를 위해 className 추가
              argObj["className"] = "Object";

              // Create preview object / preview 객체 생성
              folly::dynamic preview = folly::dynamic::object;
              preview["type"] = "object";
              preview["subtype"] = ""; // Empty subtype for preview / preview를 위한 빈 subtype
              preview["description"] = "Object";

              // Extract properties from parsed JSON / 파싱된 JSON에서 속성 추출
              folly::dynamic properties = folly::dynamic::array;
              size_t propertyCount = 0;
              const size_t maxProperties = 100; // Limit properties for preview / preview를 위한 속성 제한
              for (const auto& pair : parsedDesc.items()) {
                if (propertyCount >= maxProperties) {
                  break;
                }
                propertyCount++;

                folly::dynamic prop = folly::dynamic::object;
                prop["name"] = pair.first.asString();

                // Determine property type and value / 속성 타입과 값 결정
                if (pair.second.isBool()) {
                  prop["type"] = "boolean";
                  prop["subtype"] = ""; // Empty subtype / 빈 subtype
                  prop["value"] = pair.second.asBool() ? "true" : "false";
                } else if (pair.second.isNumber()) {
                  prop["type"] = "number";
                  prop["subtype"] = ""; // Empty subtype / 빈 subtype
                  prop["value"] = std::to_string(pair.second.asDouble());
                } else if (pair.second.isString()) {
                  prop["type"] = "string";
                  prop["subtype"] = ""; // Empty subtype / 빈 subtype
                  prop["value"] = pair.second.asString();
                } else if (pair.second.isNull()) {
                  prop["type"] = "object";
                  prop["subtype"] = "null";
                  prop["value"] = "null";
                } else {
                  prop["type"] = "object";
                  prop["subtype"] = ""; // Empty subtype / 빈 subtype
                  prop["value"] = "Object";
                }

                properties.push_back(prop);
              }

              preview["properties"] = properties;
              // Set overflow flag if there are more properties / 더 많은 속성이 있으면 overflow 플래그 설정
              preview["overflow"] = propertyCount < parsedDesc.size();
              argObj["preview"] = preview;
            } else {
              // If not a valid JSON object, use description as-is / 유효한 JSON 객체가 아니면 description을 그대로 사용
              argObj["description"] = arg.description;
            }
          } catch (...) {
            // If parsing fails, use description as-is / 파싱 실패 시 description을 그대로 사용
            argObj["description"] = arg.description;
          }
        } else {
          // For non-object types, use description as-is / 객체가 아닌 타입의 경우 description을 그대로 사용
          argObj["description"] = arg.description;
        }
      }
      argsArray.push_back(argObj);
    }

    // Create CDP message using folly::dynamic / folly::dynamic을 사용하여 CDP 메시지 생성
    auto timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(
      std::chrono::system_clock::now().time_since_epoch()
    ).count();

    folly::dynamic params = folly::dynamic::object;
    params["type"] = type;
    params["args"] = argsArray;
    params["executionContextId"] = 1;
    params["timestamp"] = timestamp;
    params["stackTrace"] = folly::dynamic::object("callFrames", folly::dynamic::array);

    folly::dynamic cdpMessage = folly::dynamic::object;
    cdpMessage["method"] = "Runtime.consoleAPICalled";
    cdpMessage["params"] = params;

    // Serialize to JSON string / JSON 문자열로 직렬화
    folly::json::serialization_opts opts;
    std::string cdpMessageJson = folly::json::serialize(cdpMessage, opts);

    // Get server info / 서버 정보 가져오기
    std::string serverHost;
    int serverPort;
    getServerInfo(runtime, serverHost, serverPort);

    // Try to send via platform-specific callback first / 먼저 플랫폼별 콜백을 통해 전송 시도
    if (chrome_remote_devtools::g_sendCDPMessageCallback != nullptr) {
      try {
        chrome_remote_devtools::g_sendCDPMessageCallback(serverHost.c_str(), serverPort, cdpMessageJson.c_str());
        LOGI("Sending CDP message via platform callback / 플랫폼 콜백을 통해 CDP 메시지 전송");
        return;
      } catch (const std::exception& e) {
        LOGE("Failed to send via platform callback: %s", e.what());
      } catch (...) {
        LOGE("Failed to send via platform callback (unknown exception) / 플랫폼 콜백을 통해 전송 실패 (알 수 없는 예외)");
      }
    }

    // Fallback: Try to send via TurboModule directly from JSI / 폴백: JSI에서 TurboModule을 직접 호출하여 전송 시도
    try {
      // Get NativeModules from react-native / react-native에서 NativeModules 가져오기
      facebook::jsi::Value reactNativeValue = runtime.global().getProperty(runtime, "require");
      if (!reactNativeValue.isObject() || !reactNativeValue.asObject(runtime).isFunction(runtime)) {
        LOGW("require is not available / require를 사용할 수 없음");
      } else {
        facebook::jsi::Function requireFunc = reactNativeValue.asObject(runtime).asFunction(runtime);
        facebook::jsi::String reactNativeStr = facebook::jsi::String::createFromUtf8(runtime, "react-native");
        facebook::jsi::Value rnModule = requireFunc.call(runtime, reactNativeStr);

        if (!rnModule.isObject()) {
          LOGW("react-native module is not an object / react-native 모듈이 객체가 아님");
        } else {
          facebook::jsi::Object rnObj = rnModule.asObject(runtime);

          // Try TurboModuleRegistry first (New Architecture) / TurboModuleRegistry 먼저 시도 (New Architecture)
          facebook::jsi::Value turboModuleRegistryValue = rnObj.getProperty(runtime, "TurboModuleRegistry");
          if (!turboModuleRegistryValue.isObject()) {
            LOGW("TurboModuleRegistry is not available / TurboModuleRegistry를 사용할 수 없음");
          } else {
            facebook::jsi::Object turboModuleRegistry = turboModuleRegistryValue.asObject(runtime);
            facebook::jsi::Value getMethod = turboModuleRegistry.getProperty(runtime, "get");
            if (!getMethod.isObject() || !getMethod.asObject(runtime).isFunction(runtime)) {
              LOGW("TurboModuleRegistry.get is not available / TurboModuleRegistry.get을 사용할 수 없음");
            } else {
              facebook::jsi::Function getFunc = getMethod.asObject(runtime).asFunction(runtime);
              facebook::jsi::String moduleName = facebook::jsi::String::createFromUtf8(runtime, "ChromeRemoteDevToolsInspector");
              facebook::jsi::Value moduleValue = getFunc.call(runtime, turboModuleRegistry, moduleName);

              if (!moduleValue.isObject()) {
                LOGW("ChromeRemoteDevToolsInspector TurboModule is not available / ChromeRemoteDevToolsInspector TurboModule을 사용할 수 없음");
              } else {
                facebook::jsi::Object moduleObj = moduleValue.asObject(runtime);
                facebook::jsi::Value sendMethodValue = moduleObj.getProperty(runtime, "sendCDPMessage");
                if (!sendMethodValue.isObject() || !sendMethodValue.asObject(runtime).isFunction(runtime)) {
                  LOGW("sendCDPMessage is not available / sendCDPMessage를 사용할 수 없음");
                } else {
                  facebook::jsi::Function sendMethod = sendMethodValue.asObject(runtime).asFunction(runtime);

                  // Call sendCDPMessage with serverHost, serverPort, and message / sendCDPMessage 호출 (serverHost, serverPort, message)
                  try {
                    sendMethod.callWithThis(
                      runtime,
                      runtime.global(),
                      facebook::jsi::String::createFromUtf8(runtime, serverHost),
                      serverPort,
                      facebook::jsi::String::createFromUtf8(runtime, cdpMessageJson)
                    );
                    LOGI("Sending CDP message via JSI TurboModule (direct) / JSI TurboModule을 통해 CDP 메시지 전송 (직접)");
                    return;
                  } catch (const std::exception& e) {
                    LOGE("Failed to call sendCDPMessage: %s", e.what());
                  } catch (...) {
                    LOGE("Failed to call sendCDPMessage (unknown exception) / sendCDPMessage 호출 실패 (알 수 없는 예외)");
                  }
                }
              }
            }
          }

          // Fallback to NativeModules (Legacy Architecture) / NativeModules로 폴백 (Legacy Architecture)
          facebook::jsi::Value nativeModulesValue = rnObj.getProperty(runtime, "NativeModules");
          if (!nativeModulesValue.isObject()) {
            LOGW("NativeModules is not available / NativeModules를 사용할 수 없음");
          } else {
            facebook::jsi::Object nativeModules = nativeModulesValue.asObject(runtime);
            facebook::jsi::Value inspectorValue = nativeModules.getProperty(runtime, "ChromeRemoteDevToolsInspector");
            if (!inspectorValue.isObject()) {
              LOGW("ChromeRemoteDevToolsInspector NativeModule is not available / ChromeRemoteDevToolsInspector NativeModule을 사용할 수 없음");
            } else {
              facebook::jsi::Object inspectorObj = inspectorValue.asObject(runtime);
              facebook::jsi::Value sendMethodValue = inspectorObj.getProperty(runtime, "sendCDPMessage");
              if (!sendMethodValue.isObject() || !sendMethodValue.asObject(runtime).isFunction(runtime)) {
                LOGW("sendCDPMessage is not available in NativeModule / NativeModule에서 sendCDPMessage를 사용할 수 없음");
              } else {
                facebook::jsi::Function sendMethod = sendMethodValue.asObject(runtime).asFunction(runtime);

                // Call sendCDPMessage with serverHost, serverPort, and message / sendCDPMessage 호출 (serverHost, serverPort, message)
                try {
                  sendMethod.callWithThis(
                    runtime,
                    runtime.global(),
                    facebook::jsi::String::createFromUtf8(runtime, serverHost),
                    serverPort,
                    facebook::jsi::String::createFromUtf8(runtime, cdpMessageJson)
                  );
                  LOGI("Sending CDP message via JSI NativeModules (direct) / JSI NativeModules를 통해 CDP 메시지 전송 (직접)");
                  return;
                } catch (const std::exception& e) {
                  LOGE("Failed to call sendCDPMessage (NativeModule): %s", e.what());
                } catch (...) {
                  LOGE("Failed to call sendCDPMessage (NativeModule, unknown exception) / sendCDPMessage 호출 실패 (NativeModule, 알 수 없는 예외)");
                }
              }
            }
          }
        }
      }

      LOGW("TurboModule not available, console.log will work normally but CDP messages won't be sent / TurboModule을 사용할 수 없음, console.log는 정상 작동하지만 CDP 메시지가 전송되지 않음");
    } catch (const std::exception& e) {
      LOGE("Failed to send via JSI TurboModule: %s", e.what());
    } catch (...) {
      LOGE("Failed to send via JSI TurboModule (unknown exception) / JSI TurboModule을 통해 전송 실패 (알 수 없는 예외)");
    }
  } catch (const std::exception& e) {
    // CDP message building failed / CDP 메시지 구성 실패
    LOGE("Failed to build CDP message: %s", e.what());
  } catch (...) {
    // CDP message building failed / CDP 메시지 구성 실패
    LOGE("Failed to build CDP message (unknown exception) / CDP 메시지 구성 실패 (알 수 없는 예외)");
  }
}

} // namespace console
} // namespace chrome_remote_devtools

