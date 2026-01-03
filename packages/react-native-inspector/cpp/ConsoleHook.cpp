/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Modified for Chrome Remote DevTools / Chrome Remote DevTools용으로 수정됨
 */

#include "ConsoleHook.h"
#include <cstring>
#include <chrono>
#include <atomic>
#include <folly/dynamic.h>
#include <folly/json.h>

// Platform-specific log support / 플랫폼별 로그 지원
#ifdef __ANDROID__
#include <android/log.h>
#define LOG_TAG "ConsoleHook"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)
#define LOGW(...) __android_log_print(ANDROID_LOG_WARN, LOG_TAG, __VA_ARGS__)
#elif defined(__APPLE__)
#include <Foundation/Foundation.h>
#define LOG_TAG "ConsoleHook"
#define LOGI(...) NSLog(@"[INFO] " LOG_TAG ": " __VA_ARGS__)
#define LOGE(...) NSLog(@"[ERROR] " LOG_TAG ": " __VA_ARGS__)
#define LOGW(...) NSLog(@"[WARN] " LOG_TAG ": " __VA_ARGS__)
#else
#define LOGI(...)
#define LOGE(...)
#define LOGW(...)
#endif

namespace chrome_remote_devtools {

// Global counter for objectId generation / objectId 생성을 위한 전역 카운터
static std::atomic<size_t> g_objectIdCounter{1};

// Platform-specific callback for sending CDP messages / CDP 메시지 전송을 위한 플랫폼별 콜백
// Note: Made non-static so NetworkHook can access it / 참고: NetworkHook에서 접근할 수 있도록 static 제거
SendCDPMessageCallback g_sendCDPMessageCallback = nullptr;

void setSendCDPMessageCallback(SendCDPMessageCallback callback) {
  g_sendCDPMessageCallback = callback;
}

RemoteObject jsiValueToRemoteObject(facebook::jsi::Runtime& runtime, const facebook::jsi::Value& value) {
  RemoteObject result;
  try {
    if (value.isString()) {
      result.type = "string";
      result.value = value.asString(runtime).utf8(runtime);
    } else if (value.isNumber()) {
      result.type = "number";
      result.value = std::to_string(value.asNumber());
    } else if (value.isBool()) {
      result.type = "boolean";
      result.value = value.getBool() ? "true" : "false";
    } else if (value.isUndefined()) {
      result.type = "undefined";
    } else if (value.isNull()) {
      result.type = "object";
      result.subtype = "null";
      result.value = "null";
    } else if (value.isObject()) {
      result.type = "object";
      // For objects, do NOT set value field / 객체의 경우 value 필드를 설정하지 않음
      // Only set description with JSON stringified value / description에만 JSON 문자열화된 값을 설정
      // This allows DevTools to display it as an object, not a string / 이를 통해 DevTools가 문자열이 아닌 객체로 표시할 수 있음

      // Try to stringify object using JSON.stringify / JSON.stringify를 사용하여 객체 문자열화 시도
      try {
        auto jsonObj = runtime.global().getPropertyAsObject(runtime, "JSON");
        auto jsonStringify = jsonObj.getPropertyAsFunction(runtime, "stringify");
        auto jsonValue = jsonStringify.call(runtime, value);
        if (jsonValue.isString()) {
          result.description = jsonValue.asString(runtime).utf8(runtime);
        }
      } catch (...) {
        // JSON.stringify failed, use default / JSON.stringify 실패, 기본값 사용
        result.description = "[object Object]";
      }

      // Check if it's an array / 배열인지 확인
      try {
        auto obj = value.asObject(runtime);
        if (obj.isArray(runtime)) {
          result.subtype = "array";
          // Try to get array length / 배열 길이 가져오기 시도
          try {
            auto lengthProp = obj.getProperty(runtime, "length");
            if (lengthProp.isNumber()) {
              int length = static_cast<int>(lengthProp.asNumber());
              if (result.description.empty()) {
                result.description = "Array(" + std::to_string(length) + ")";
              }
            }
          } catch (...) {
            // Failed to get length / 길이 가져오기 실패
          }
        } else if (obj.isFunction(runtime)) {
          result.subtype = "function";
          // Try to get function name / 함수 이름 가져오기 시도
          try {
            auto nameProp = obj.getProperty(runtime, "name");
            if (nameProp.isString()) {
              result.description = "f " + nameProp.asString(runtime).utf8(runtime) + "()";
            } else {
              result.description = "f ()";
            }
          } catch (...) {
            result.description = "f ()";
          }
        } else {
          // Generic object / 일반 객체
          // Try to get constructor name / 생성자 이름 가져오기 시도
          try {
            auto constructorValue = obj.getProperty(runtime, "constructor");
            if (constructorValue.isObject()) {
              auto constructorObj = constructorValue.asObject(runtime);
              auto nameValue = constructorObj.getProperty(runtime, "name");
              if (nameValue.isString()) {
                std::string name = nameValue.asString(runtime).utf8(runtime);
                if (name != "Object") {
                  // Custom constructor / 커스텀 생성자
                  // Keep JSON stringified description for better preview / 더 나은 미리보기를 위해 JSON 문자열화된 description 유지
                }
              }
            }
          } catch (...) {
            // Ignore / 무시
          }
        }
      } catch (...) {
        // Not an array or function / 배열이나 함수가 아님
      }
    }
  } catch (...) {
    // Conversion failed / 변환 실패
    result.type = "string";
    result.value = "[unknown]";
  }
  return result;
}

bool hookConsoleMethods(facebook::jsi::Runtime& runtime) {
  try {
    // Get original console object / 원본 console 객체 가져오기
    facebook::jsi::Object originalConsole(runtime);
    bool consoleExists = false;

    try {
      facebook::jsi::Value consoleValue = runtime.global().getProperty(runtime, "console");
      if (consoleValue.isObject()) {
        originalConsole = consoleValue.asObject(runtime);
        consoleExists = true;
      }
    } catch (...) {
      // console doesn't exist, use newly created one / console이 없으면 새로 생성한 것 사용
      consoleExists = false;
    }

    // Helper to get log level from method name / 메서드 이름에서 로그 레벨 가져오는 헬퍼
    auto getLogLevel = [](const char* methodName) -> int {
      if (std::strcmp(methodName, "error") == 0) return 6; // ERROR
      if (std::strcmp(methodName, "warn") == 0) return 5;  // WARN
      if (std::strcmp(methodName, "info") == 0) return 4;  // INFO
      if (std::strcmp(methodName, "debug") == 0) return 3; // DEBUG
      return 4; // Default to INFO
    };

    // Console methods to hook / 훅할 console 메서드들
    const char* methods[] = {"log", "warn", "error", "info", "debug"};

    // Backup original methods before replacing / 교체하기 전에 원본 메서드 백업
    // Store them in hidden properties on the console object / console 객체의 숨겨진 속성에 저장
    for (const char* methodName : methods) {
      try {
        // Backup original method if exists / 원본 메서드가 있으면 백업
        if (consoleExists) {
          try {
            facebook::jsi::Value originalMethodValue = originalConsole.getProperty(runtime, methodName);
            if (originalMethodValue.isObject() && originalMethodValue.asObject(runtime).isFunction(runtime)) {
              // Store original in a hidden property / 숨겨진 속성에 원본 저장
              std::string backupPropName = std::string("__original_") + methodName;
              originalConsole.setProperty(runtime, backupPropName.c_str(), std::move(originalMethodValue));
            }
          } catch (...) {
            // Method doesn't exist or failed to backup / 메서드가 없거나 백업 실패
          }
        }

            // Create wrapped function / 래핑된 함수 생성
            auto wrappedMethod = facebook::jsi::Function::createFromHostFunction(
              runtime,
              facebook::jsi::PropNameID::forAscii(runtime, methodName),
              0, // Variable arguments / 가변 인자
              [methodName, getLogLevel](facebook::jsi::Runtime& rt,
                                              const facebook::jsi::Value& /* this */,
                                              const facebook::jsi::Value* args,
                                              size_t count) -> facebook::jsi::Value {
            // 1. Convert JSI values to RemoteObjects / JSI 값을 RemoteObject로 변환
            std::vector<RemoteObject> parsedArgs;
            for (size_t i = 0; i < count; i++) {
              parsedArgs.push_back(jsiValueToRemoteObject(rt, args[i]));
            }

            int level = getLogLevel(methodName);

            // Build CDP message and send via callback / CDP 메시지 구성 및 콜백을 통해 전송
            try {
              // Map log level to CDP console type / 로그 레벨을 CDP console type으로 매핑
              std::string cdpType = "log";
              if (level == 6) cdpType = "error";
              else if (level == 5) cdpType = "warning";
              else if (level == 3) cdpType = "debug";

              // Create args array using folly::dynamic / folly::dynamic을 사용하여 args 배열 생성
              folly::dynamic argsArray = folly::dynamic::array;
              for (const auto& arg : parsedArgs) {
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
                        size_t objectId = g_objectIdCounter.fetch_add(1);
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
              params["type"] = cdpType;
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

              // Get server host and port from global / 전역에서 서버 호스트와 포트 가져오기
              std::string serverHost = "localhost";
              int serverPort = 8080;
              try {
                facebook::jsi::Value hostValue = rt.global().getProperty(rt, "__ChromeRemoteDevToolsServerHost");
                if (hostValue.isString()) {
                  serverHost = hostValue.asString(rt).utf8(rt);
                }
                facebook::jsi::Value portValue = rt.global().getProperty(rt, "__ChromeRemoteDevToolsServerPort");
                if (portValue.isNumber()) {
                  serverPort = static_cast<int>(portValue.asNumber());
                }
              } catch (...) {
                // Use defaults / 기본값 사용
              }

              // Declare variables before goto label / goto 라벨 전에 변수 선언
              bool messageSent = false;
              bool turboModuleCalled = false;

              // Try to send via platform-specific callback first / 먼저 플랫폼별 콜백을 통해 전송 시도
              if (g_sendCDPMessageCallback != nullptr) {
                try {
                  g_sendCDPMessageCallback(serverHost.c_str(), serverPort, cdpMessageJson.c_str());
                  LOGI("Sending CDP message via platform callback / 플랫폼 콜백을 통해 CDP 메시지 전송");
                  messageSent = true;
                  goto send_success;
                } catch (const std::exception& e) {
                  LOGE("Failed to send via platform callback: %s", e.what());
                } catch (...) {
                  LOGE("Failed to send via platform callback (unknown exception) / 플랫폼 콜백을 통해 전송 실패 (알 수 없는 예외)");
                }
              }

              // Fallback: Try to send via TurboModule directly from JSI / 폴백: JSI에서 TurboModule을 직접 호출하여 전송 시도
              try {
                // Get NativeModules from react-native / react-native에서 NativeModules 가져오기
                facebook::jsi::Value reactNativeValue = rt.global().getProperty(rt, "require");
                if (!reactNativeValue.isObject() || !reactNativeValue.asObject(rt).isFunction(rt)) {
                  LOGW("require is not available / require를 사용할 수 없음");
                } else {
                  facebook::jsi::Function requireFunc = reactNativeValue.asObject(rt).asFunction(rt);
                  facebook::jsi::String reactNativeStr = facebook::jsi::String::createFromUtf8(rt, "react-native");
                  facebook::jsi::Value rnModule = requireFunc.call(rt, reactNativeStr);

                  if (!rnModule.isObject()) {
                    LOGW("react-native module is not an object / react-native 모듈이 객체가 아님");
                  } else {
                    facebook::jsi::Object rnObj = rnModule.asObject(rt);

                    // Try TurboModuleRegistry first (New Architecture) / TurboModuleRegistry 먼저 시도 (New Architecture)
                    facebook::jsi::Value turboModuleRegistryValue = rnObj.getProperty(rt, "TurboModuleRegistry");
                    if (!turboModuleRegistryValue.isObject()) {
                      LOGW("TurboModuleRegistry is not available / TurboModuleRegistry를 사용할 수 없음");
                    } else {
                      facebook::jsi::Object turboModuleRegistry = turboModuleRegistryValue.asObject(rt);
                      facebook::jsi::Value getMethod = turboModuleRegistry.getProperty(rt, "get");
                      if (!getMethod.isObject() || !getMethod.asObject(rt).isFunction(rt)) {
                        LOGW("TurboModuleRegistry.get is not available / TurboModuleRegistry.get을 사용할 수 없음");
                      } else {
                        facebook::jsi::Function getFunc = getMethod.asObject(rt).asFunction(rt);
                        facebook::jsi::String moduleName = facebook::jsi::String::createFromUtf8(rt, "ChromeRemoteDevToolsInspector");
                        facebook::jsi::Value moduleValue = getFunc.call(rt, turboModuleRegistry, moduleName);

                        if (!moduleValue.isObject()) {
                          LOGW("ChromeRemoteDevToolsInspector TurboModule is not available / ChromeRemoteDevToolsInspector TurboModule을 사용할 수 없음");
                        } else {
                          facebook::jsi::Object moduleObj = moduleValue.asObject(rt);
                          facebook::jsi::Value sendMethodValue = moduleObj.getProperty(rt, "sendCDPMessage");
                          if (!sendMethodValue.isObject() || !sendMethodValue.asObject(rt).isFunction(rt)) {
                            LOGW("sendCDPMessage is not available / sendCDPMessage를 사용할 수 없음");
                          } else {
                            facebook::jsi::Function sendMethod = sendMethodValue.asObject(rt).asFunction(rt);

                            // Call sendCDPMessage with serverHost, serverPort, and message / sendCDPMessage 호출 (serverHost, serverPort, message)
                            try {
                              sendMethod.callWithThis(
                                rt,
                                rt.global(),
                                facebook::jsi::String::createFromUtf8(rt, serverHost),
                                serverPort,
                                facebook::jsi::String::createFromUtf8(rt, cdpMessageJson)
                              );
                              LOGI("Sending CDP message via JSI TurboModule (direct) / JSI TurboModule을 통해 CDP 메시지 전송 (직접)");
                              turboModuleCalled = true;
                              goto send_success;
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
                    if (!turboModuleCalled) {
                      facebook::jsi::Value nativeModulesValue = rnObj.getProperty(rt, "NativeModules");
                      if (!nativeModulesValue.isObject()) {
                        LOGW("NativeModules is not available / NativeModules를 사용할 수 없음");
                      } else {
                        facebook::jsi::Object nativeModules = nativeModulesValue.asObject(rt);
                        facebook::jsi::Value inspectorValue = nativeModules.getProperty(rt, "ChromeRemoteDevToolsInspector");
                        if (!inspectorValue.isObject()) {
                          LOGW("ChromeRemoteDevToolsInspector NativeModule is not available / ChromeRemoteDevToolsInspector NativeModule을 사용할 수 없음");
                        } else {
                          facebook::jsi::Object inspectorObj = inspectorValue.asObject(rt);
                          facebook::jsi::Value sendMethodValue = inspectorObj.getProperty(rt, "sendCDPMessage");
                          if (!sendMethodValue.isObject() || !sendMethodValue.asObject(rt).isFunction(rt)) {
                            LOGW("sendCDPMessage is not available in NativeModule / NativeModule에서 sendCDPMessage를 사용할 수 없음");
                          } else {
                            facebook::jsi::Function sendMethod = sendMethodValue.asObject(rt).asFunction(rt);

                            // Call sendCDPMessage with serverHost, serverPort, and message / sendCDPMessage 호출 (serverHost, serverPort, message)
                            try {
                              sendMethod.callWithThis(
                                rt,
                                rt.global(),
                                facebook::jsi::String::createFromUtf8(rt, serverHost),
                                serverPort,
                                facebook::jsi::String::createFromUtf8(rt, cdpMessageJson)
                              );
                              LOGI("Sending CDP message via JSI NativeModules (direct) / JSI NativeModules를 통해 CDP 메시지 전송 (직접)");
                              turboModuleCalled = true;
                              goto send_success;
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
                }

                if (!turboModuleCalled) {
                  LOGW("TurboModule not available, console.log will work normally but CDP messages won't be sent / TurboModule을 사용할 수 없음, console.log는 정상 작동하지만 CDP 메시지가 전송되지 않음");
                }
              } catch (const std::exception& e) {
                LOGE("Failed to send via JSI TurboModule: %s", e.what());
              } catch (...) {
                LOGE("Failed to send via JSI TurboModule (unknown exception) / JSI TurboModule을 통해 전송 실패 (알 수 없는 예외)");
              }

              send_success:;
            } catch (const std::exception& e) {
              // CDP message building failed / CDP 메시지 구성 실패
              LOGE("Failed to build CDP message: %s", e.what());
            } catch (...) {
              // CDP message building failed / CDP 메시지 구성 실패
              LOGE("Failed to build CDP message (unknown exception) / CDP 메시지 구성 실패 (알 수 없는 예외)");
            }

            // 2. Call original method if exists / 원본 메서드가 있으면 호출
            // Get original from backup property on console object / console 객체의 백업 속성에서 원본 가져오기
            try {
              facebook::jsi::Value consoleValue = rt.global().getProperty(rt, "console");
              if (consoleValue.isObject()) {
                facebook::jsi::Object consoleObj = consoleValue.asObject(rt);
                std::string backupPropName = std::string("__original_") + methodName;
                facebook::jsi::Value originalMethodValue = consoleObj.getProperty(rt, backupPropName.c_str());
                if (originalMethodValue.isObject() && originalMethodValue.asObject(rt).isFunction(rt)) {
                  auto originalMethod = originalMethodValue.asObject(rt).asFunction(rt);
                  return originalMethod.call(rt, args, count);
                }
              }
            } catch (...) {
              // Failed to call original, return undefined / 원본 호출 실패, undefined 반환
            }

            // If no original, return undefined / 원본이 없으면 undefined 반환
            return facebook::jsi::Value::undefined();
          }
        );

        // Set wrapped method to console / console에 래핑된 메서드 설정
        originalConsole.setProperty(runtime, methodName, wrappedMethod);
      } catch (...) {
        // Failed to hook method, continue with others / 메서드 훅 실패, 다른 메서드 계속
      }
    }

    // Set console to global / console을 global에 설정
    runtime.global().setProperty(runtime, "console", originalConsole);

    return true;
  } catch (...) {
    return false;
  }
}

// Find object by __cdpObjectId in runtime / 런타임에서 __cdpObjectId로 객체 찾기
facebook::jsi::Value findObjectById(facebook::jsi::Runtime& runtime, const std::string& objectId) {
  try {
    // Search in global scope / 전역 스코프에서 검색
    auto global = runtime.global();
    auto propertyNames = global.getPropertyNames(runtime);

    for (size_t i = 0; i < propertyNames.size(runtime); i++) {
      try {
        auto nameValue = propertyNames.getValueAtIndex(runtime, i);
        if (!nameValue.isString()) continue;

        std::string propName = nameValue.asString(runtime).utf8(runtime);
        auto propValue = global.getProperty(runtime, propName.c_str());

        // Check if it's an object / 객체인지 확인
        if (propValue.isObject() && !propValue.isNull()) {
          try {
            auto obj = propValue.asObject(runtime);

            // Check if object has __cdpObjectId property / 객체에 __cdpObjectId 속성이 있는지 확인
            auto cdpIdValue = obj.getProperty(runtime, "__cdpObjectId");
            if (cdpIdValue.isString()) {
              std::string cdpId = cdpIdValue.asString(runtime).utf8(runtime);
              if (cdpId == objectId) {
                return propValue;  // Found! / 찾음!
              }
            }

            // Also check nested objects recursively (limited depth) / 중첩된 객체도 재귀적으로 확인 (제한된 깊이)
            // This is expensive, so limit to direct properties / 비용이 크므로 직접 속성만 확인
          } catch (...) {
            // Property access failed, continue / 속성 접근 실패, 계속
            continue;
          }
        }
      } catch (...) {
        // Property iteration failed, continue / 속성 순회 실패, 계속
        continue;
      }
    }

    // Also search in common global objects / 일반적인 전역 객체에서도 검색
    // Check window, global, globalThis / window, global, globalThis 확인
    const char* globalNames[] = {"window", "global", "globalThis"};
    for (const char* globalName : globalNames) {
      try {
        auto globalObjValue = global.getProperty(runtime, globalName);
        if (globalObjValue.isObject()) {
          auto globalObj = globalObjValue.asObject(runtime);
          auto propertyNames = globalObj.getPropertyNames(runtime);

          for (size_t i = 0; i < propertyNames.size(runtime); i++) {
            try {
              auto nameValue = propertyNames.getValueAtIndex(runtime, i);
              if (!nameValue.isString()) continue;

              std::string propName = nameValue.asString(runtime).utf8(runtime);
              auto propValue = globalObj.getProperty(runtime, propName.c_str());

              if (propValue.isObject() && !propValue.isNull()) {
                auto obj = propValue.asObject(runtime);
                auto cdpIdValue = obj.getProperty(runtime, "__cdpObjectId");
                if (cdpIdValue.isString()) {
                  std::string cdpId = cdpIdValue.asString(runtime).utf8(runtime);
                  if (cdpId == objectId) {
                    return propValue;
                  }
                }
              }
            } catch (...) {
              continue;
            }
          }
        }
      } catch (...) {
        continue;
      }
    }
  } catch (...) {
    // Search failed / 검색 실패
  }

  return facebook::jsi::Value::undefined();
}

// Get object properties for Runtime.getProperties / Runtime.getProperties를 위한 객체 속성 가져오기
std::string getObjectProperties(facebook::jsi::Runtime& runtime, const std::string& objectId, bool ownProperties) {
  (void)ownProperties; // Suppress unused parameter warning / 사용되지 않은 파라미터 경고 억제

  try {
    // Find object by ID / ID로 객체 찾기
    auto objValue = findObjectById(runtime, objectId);
    if (objValue.isUndefined() || !objValue.isObject() || objValue.isNull()) {
      // Object not found, return empty result / 객체를 찾지 못함, 빈 결과 반환
      folly::dynamic response = folly::dynamic::object;
      response["result"] = folly::dynamic::array();
      response["internalProperties"] = folly::dynamic::array();
      response["privateProperties"] = folly::dynamic::array();
      folly::json::serialization_opts opts;
      return folly::json::serialize(response, opts);
    }

    auto obj = objValue.asObject(runtime);
    folly::dynamic properties = folly::dynamic::array();

    // Get property names / 속성 이름 가져오기
    auto propertyNames = obj.getPropertyNames(runtime);
    size_t propertyCount = propertyNames.size(runtime);

    for (size_t i = 0; i < propertyCount; i++) {
      try {
        auto nameValue = propertyNames.getValueAtIndex(runtime, i);
        if (!nameValue.isString()) continue;

        std::string propName = nameValue.asString(runtime).utf8(runtime);

        // Skip __cdpObjectId property / __cdpObjectId 속성 건너뛰기
        if (propName == "__cdpObjectId") {
          continue;
        }

        // Get property value / 속성 값 가져오기
        auto propValue = obj.getProperty(runtime, propName.c_str());

        // Convert to RemoteObject format / RemoteObject 형식으로 변환
        auto remoteObj = jsiValueToRemoteObject(runtime, propValue);

        folly::dynamic prop = folly::dynamic::object;
        prop["name"] = propName;
        prop["enumerable"] = true;
        prop["configurable"] = true;
        prop["writable"] = true;
        prop["isOwn"] = true;

        // Build value object / value 객체 구성
        folly::dynamic valueObj = folly::dynamic::object;
        valueObj["type"] = remoteObj.type;

        if (!remoteObj.subtype.empty()) {
          valueObj["subtype"] = remoteObj.subtype;
        } else if (remoteObj.type == "object") {
          valueObj["subtype"] = "";
        }

        if (remoteObj.type == "number") {
          try {
            double numValue = std::stod(remoteObj.value);
            valueObj["value"] = numValue;
            valueObj["description"] = remoteObj.value;
          } catch (...) {
            valueObj["value"] = remoteObj.value;
          }
        } else if (remoteObj.type == "boolean") {
          valueObj["value"] = remoteObj.value == "true";
        } else if (remoteObj.type == "string") {
          valueObj["value"] = remoteObj.value;
        } else if (remoteObj.type == "object" && remoteObj.subtype == "null") {
          valueObj["subtype"] = "null";
          valueObj["value"] = nullptr;
        } else if (remoteObj.type == "object") {
          // For nested objects, generate objectId if needed / 중첩된 객체의 경우 필요하면 objectId 생성
          // For now, just show as Object / 지금은 Object로만 표시
          valueObj["description"] = "Object";
          valueObj["className"] = "Object";

          // If description contains JSON, we could add objectId / description에 JSON이 있으면 objectId 추가 가능
          if (!remoteObj.description.empty() && remoteObj.description[0] == '{') {
            size_t nestedObjectId = g_objectIdCounter.fetch_add(1);
            std::string nestedIdStr = std::to_string(nestedObjectId);

            // Try to add __cdpObjectId to nested object / 중첩된 객체에 __cdpObjectId 추가 시도
            try {
              if (propValue.isObject() && !propValue.isNull()) {
                auto nestedObj = propValue.asObject(runtime);
                nestedObj.setProperty(runtime, "__cdpObjectId",
                                      facebook::jsi::String::createFromUtf8(runtime, nestedIdStr));
                valueObj["objectId"] = nestedIdStr;
              }
            } catch (...) {
              // Failed to add ID to nested object / 중첩된 객체에 ID 추가 실패
            }
          }
        }

        prop["value"] = valueObj;
        properties.push_back(prop);
      } catch (...) {
        // Property access failed, continue / 속성 접근 실패, 계속
        continue;
      }
    }

    // Build response / 응답 구성
    folly::dynamic response = folly::dynamic::object;
    response["result"] = properties;
    response["internalProperties"] = folly::dynamic::array();
    response["privateProperties"] = folly::dynamic::array();

    folly::json::serialization_opts opts;
    return folly::json::serialize(response, opts);
  } catch (...) {
    // Error occurred, return empty result / 에러 발생, 빈 결과 반환
    folly::dynamic response = folly::dynamic::object;
    response["result"] = folly::dynamic::array();
    response["internalProperties"] = folly::dynamic::array();
    response["privateProperties"] = folly::dynamic::array();
    folly::json::serialization_opts opts;
    return folly::json::serialize(response, opts);
  }
}

} // namespace chrome_remote_devtools

