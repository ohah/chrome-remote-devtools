/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Modified for Chrome Remote DevTools / Chrome Remote DevTools용으로 수정됨
 */

#include "ConsoleUtils.h"
#include "ConsoleGlobals.h"

// Platform-specific log support / 플랫폼별 로그 지원
#ifdef __ANDROID__
#include <android/log.h>
#define LOG_TAG "ConsoleUtils"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGW(...) __android_log_print(ANDROID_LOG_WARN, LOG_TAG, __VA_ARGS__)
#else
#define LOGI(...)
#define LOGW(...)
#endif

namespace chrome_remote_devtools {
namespace console {

// Convert JSI value to RemoteObject / JSI 값을 RemoteObject로 변환
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

      // Always generate objectId for objects and store in Map (like web CDP client) / 객체에 대해 항상 objectId 생성하고 Map에 저장 (웹 CDP 클라이언트처럼)
      try {
        auto obj = value.asObject(runtime);
        facebook::jsi::Value cdpIdValue = obj.getProperty(runtime, "__cdpObjectId");
        std::string objectIdStr;

        if (cdpIdValue.isString()) {
          // Use existing objectId / 기존 objectId 사용
          objectIdStr = cdpIdValue.asString(runtime).utf8(runtime);
          result.objectId = objectIdStr;
        } else {
          // Generate new objectId / 새 objectId 생성
          size_t objectId = console::g_objectIdCounter.fetch_add(1);
          objectIdStr = std::to_string(objectId);

          // Add __cdpObjectId to object / 객체에 __cdpObjectId 추가
          obj.setProperty(runtime, "__cdpObjectId",
                          facebook::jsi::String::createFromUtf8(runtime, objectIdStr));

          // Store in __cdpObjects Map / __cdpObjects Map에 저장
          try {
            auto globalObj = runtime.global();
            facebook::jsi::Value cdpObjectsValue = globalObj.getProperty(runtime, "__cdpObjects");
            if (cdpObjectsValue.isUndefined() || !cdpObjectsValue.isObject()) {
              // Create new Map if doesn't exist / 없으면 새 Map 생성
              facebook::jsi::Value mapConstructorValue = globalObj.getProperty(runtime, "Map");
              if (mapConstructorValue.isObject() && mapConstructorValue.asObject(runtime).isFunction(runtime)) {
                facebook::jsi::Function mapConstructor = mapConstructorValue.asObject(runtime).asFunction(runtime);
                facebook::jsi::Value mapInstance = mapConstructor.callAsConstructor(runtime);
                if (mapInstance.isObject()) {
                  globalObj.setProperty(runtime, "__cdpObjects", mapInstance);
                  // Get the newly created Map / 새로 생성된 Map 가져오기
                  cdpObjectsValue = globalObj.getProperty(runtime, "__cdpObjects");
                }
              }
            }

            if (cdpObjectsValue.isObject()) {
              facebook::jsi::Object cdpObjectsMap = cdpObjectsValue.asObject(runtime);
              facebook::jsi::Value setMethod = cdpObjectsMap.getProperty(runtime, "set");
              if (setMethod.isObject() && setMethod.asObject(runtime).isFunction(runtime)) {
                facebook::jsi::Function setFunc = setMethod.asObject(runtime).asFunction(runtime);
                setFunc.callWithThis(runtime, cdpObjectsMap,
                                     facebook::jsi::String::createFromUtf8(runtime, objectIdStr),
                                     value);
              }
            }
          } catch (...) {
            // Failed to store in Map, continue / Map에 저장 실패, 계속
          }

          result.objectId = objectIdStr;
        }
      } catch (...) {
        // Failed to process objectId / objectId 처리 실패
      }

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

} // namespace console
} // namespace chrome_remote_devtools

