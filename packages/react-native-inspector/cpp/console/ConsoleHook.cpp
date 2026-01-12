/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Modified for Chrome Remote DevTools / Chrome Remote DevTools용으로 수정됨
 */

#include "ConsoleHook.h"
#include "ConsoleUtils.h"
#include "ConsoleEventSender.h"
#include "ConsoleGlobals.h" // For g_objectIdCounter / g_objectIdCounter를 위해
#include "../ConsoleHook.h" // For RemoteObject / RemoteObject를 위해
#include <cstring>
#include <optional>

using chrome_remote_devtools::console::storeObjectInCdpMap;

// Platform-specific log support / 플랫폼별 로그 지원
#ifdef __ANDROID__
#include <android/log.h>
#define LOG_TAG "ConsoleHook"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)
#define LOGW(...) __android_log_print(ANDROID_LOG_WARN, LOG_TAG, __VA_ARGS__)
#elif defined(__APPLE__)
#define LOG_TAG "ConsoleHook"
#define LOGI(...) ((void)0)
#define LOGE(...) ((void)0)
#define LOGW(...) ((void)0)
#else
#define LOGI(...)
#define LOGE(...)
#define LOGW(...)
#endif

namespace chrome_remote_devtools {
namespace console {

bool hookConsoleMethods(facebook::jsi::Runtime& runtime) {
  try {
    // Check if already hooked by checking for backup property / 백업 속성 확인하여 이미 훅되었는지 확인
    try {
      facebook::jsi::Value consoleValue = runtime.global().getProperty(runtime, "console");
      if (consoleValue.isObject()) {
        facebook::jsi::Object consoleObj = consoleValue.asObject(runtime);
        facebook::jsi::Value originalLogValue = consoleObj.getProperty(runtime, "__original_log");
        if (originalLogValue.isObject() && originalLogValue.asObject(runtime).isFunction(runtime)) {
          // Already hooked, skip / 이미 훅되었으므로 건너뜀
          return true;
        }
      }
    } catch (...) {
      // Failed to check, continue with hooking / 확인 실패, 훅 계속 진행
    }

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
            // 1. Add __cdpObjectId to objects and store in global Map / 객체에 __cdpObjectId 추가하고 전역 Map에 저장
            // This allows Runtime.getProperties to find objects later / 이를 통해 Runtime.getProperties가 나중에 객체를 찾을 수 있음
            LOGI("ConsoleHook: console.%s called with %zu arguments / console.%s가 %zu개의 인자로 호출됨", methodName, count, methodName, count);
            try {
              // Get or create __cdpObjects Map in global scope / 전역 스코프에서 __cdpObjects Map 가져오기 또는 생성
              facebook::jsi::Value global = rt.global();
              facebook::jsi::Object globalObj = global.asObject(rt);
              facebook::jsi::Value cdpObjectsValue = globalObj.getProperty(rt, "__cdpObjects");
              LOGI("ConsoleHook: __cdpObjects value type: %s / __cdpObjects 값 타입: %s",
                   cdpObjectsValue.isUndefined() ? "undefined" : (cdpObjectsValue.isObject() ? "object" : "other"),
                   cdpObjectsValue.isUndefined() ? "undefined" : (cdpObjectsValue.isObject() ? "object" : "other"));

              std::optional<facebook::jsi::Object> cdpObjectsMapOpt;
              bool mapExists = false;

              if (cdpObjectsValue.isUndefined() || !cdpObjectsValue.isObject()) {
                // Create new Map / 새 Map 생성
                facebook::jsi::Value mapConstructorValue = globalObj.getProperty(rt, "Map");
                if (mapConstructorValue.isObject() && mapConstructorValue.asObject(rt).isFunction(rt)) {
                  facebook::jsi::Function mapConstructor = mapConstructorValue.asObject(rt).asFunction(rt);
                  // callAsConstructor로 Map 인스턴스 생성 / callAsConstructor로 Map 인스턴스 생성
                  facebook::jsi::Value mapInstance = mapConstructor.callAsConstructor(rt);
                  if (mapInstance.isObject()) {
                    cdpObjectsMapOpt = mapInstance.asObject(rt);
                    globalObj.setProperty(rt, "__cdpObjects", mapInstance);
                    mapExists = true;
                    LOGI("ConsoleHook: Created __cdpObjects Map / __cdpObjects Map 생성");
                  }
                }
              } else {
                cdpObjectsMapOpt = cdpObjectsValue.asObject(rt);
                mapExists = true;
                LOGI("ConsoleHook: Using existing __cdpObjects / 기존 __cdpObjects 사용");
              }

              // Store objects in the Map / Map에 객체 저장
              if (mapExists && cdpObjectsMapOpt.has_value()) {
                facebook::jsi::Object& cdpObjectsMap = *cdpObjectsMapOpt;
                for (size_t i = 0; i < count; i++) {
                  try {
                    if (args[i].isObject() && !args[i].isNull()) {
                      auto obj = args[i].asObject(rt);
                      // Check if object already has __cdpObjectId / 객체에 이미 __cdpObjectId가 있는지 확인
                      facebook::jsi::Value existingId = obj.getProperty(rt, "__cdpObjectId");
                      std::string objectIdStr;

                      if (existingId.isUndefined()) {
                        // Generate unique objectId / 고유한 objectId 생성
                        size_t objectId = g_objectIdCounter.fetch_add(1);
                        objectIdStr = std::to_string(objectId);
                        // Add __cdpObjectId to the object / 객체에 __cdpObjectId 추가
                        obj.setProperty(rt, "__cdpObjectId",
                                        facebook::jsi::String::createFromUtf8(rt, objectIdStr));
                        LOGI("ConsoleHook: Added __cdpObjectId=%s to object", objectIdStr.c_str());
                      } else if (existingId.isString()) {
                        objectIdStr = existingId.asString(rt).utf8(rt);
                        LOGI("ConsoleHook: Object already has __cdpObjectId=%s", objectIdStr.c_str());
                      } else {
                        // __cdpObjectId exists but is not a string; skip using it /
                        // __cdpObjectId가 존재하지만 문자열이 아님; 사용 건너뜀
                        LOGW("ConsoleHook: __cdpObjectId exists but is not a string; skipping object");
                        continue;
                      }

                      // Store object in Map using objectId as key / objectId를 키로 사용하여 Map에 객체 저장
                      if (storeObjectInCdpMap(rt, objectIdStr, args[i])) {
                        LOGI("ConsoleHook: Stored object with objectId=%s in __cdpObjects Map", objectIdStr.c_str());
                      } else {
                        LOGW("ConsoleHook: Failed to store object with objectId=%s in __cdpObjects Map", objectIdStr.c_str());
                      }
                    }
                  } catch (...) {
                    LOGW("ConsoleHook: Failed to store object in __cdpObjects Map at index %zu", i);
                  }
                }
              }
            } catch (...) {
              // Failed to create or access __cdpObjects Map, continue / __cdpObjects Map 생성 또는 접근 실패, 계속
            }

            // 2. Convert JSI values to RemoteObjects / JSI 값을 RemoteObject로 변환
            std::vector<RemoteObject> parsedArgs;
            for (size_t i = 0; i < count; i++) {
              parsedArgs.push_back(jsiValueToRemoteObject(rt, args[i]));
            }

            int level = getLogLevel(methodName);

            // Map log level to CDP console type / 로그 레벨을 CDP console type으로 매핑
            std::string cdpType = "log";
            if (level == 6) cdpType = "error";
            else if (level == 5) cdpType = "warning";
            else if (level == 3) cdpType = "debug";

            // Send console API called event / console API 호출 이벤트 전송
            sendConsoleAPICalled(rt, cdpType, parsedArgs);

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

} // namespace console
} // namespace chrome_remote_devtools

