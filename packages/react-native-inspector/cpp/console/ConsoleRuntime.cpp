/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Modified for Chrome Remote DevTools / Chrome Remote DevTools용으로 수정됨
 */

#include "ConsoleRuntime.h"
#include "ConsoleUtils.h"
#include "ConsoleGlobals.h"
#include <folly/json.h>

// Platform-specific log support / 플랫폼별 로그 지원
#ifdef __ANDROID__
#include <android/log.h>
#define LOG_TAG "ConsoleRuntime"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGW(...) __android_log_print(ANDROID_LOG_WARN, LOG_TAG, __VA_ARGS__)
#else
#define LOGI(...)
#define LOGW(...)
#endif

namespace chrome_remote_devtools {
namespace console {

// Find object by __cdpObjectId in runtime / 런타임에서 __cdpObjectId로 객체 찾기
facebook::jsi::Value findObjectById(facebook::jsi::Runtime& runtime, const std::string& objectId) {
  LOGI("findObjectById: Looking for objectId=%s / objectId=%s인 객체 찾기", objectId.c_str(), objectId.c_str());

  try {
    // First, try to get object from __cdpObjects Map / 먼저 __cdpObjects Map에서 객체 가져오기 시도
    auto globalObj = runtime.global();

    try {
      facebook::jsi::Value cdpObjectsValue = globalObj.getProperty(runtime, "__cdpObjects");
      if (cdpObjectsValue.isUndefined()) {
        LOGW("findObjectById: __cdpObjects is undefined / __cdpObjects가 undefined임");
      } else if (!cdpObjectsValue.isObject()) {
        LOGW("findObjectById: __cdpObjects is not an object / __cdpObjects가 객체가 아님");
      } else {
        facebook::jsi::Object cdpObjectsObj = cdpObjectsValue.asObject(runtime);

        // Check if it's a Map by checking for Map-specific methods / Map 특정 메서드 확인하여 Map인지 확인
        facebook::jsi::Value getMethod = cdpObjectsObj.getProperty(runtime, "get");
        bool isMap = getMethod.isObject() && getMethod.asObject(runtime).isFunction(runtime);

        if (isMap) {
          LOGI("findObjectById: Found __cdpObjects Map, calling Map.get with objectId=%s / __cdpObjects Map 찾음, objectId=%s로 Map.get 호출", objectId.c_str(), objectId.c_str());
          facebook::jsi::Function getFunc = getMethod.asObject(runtime).asFunction(runtime);
          try {
            // callWithThis를 사용하여 this 바인딩 / callWithThis를 사용하여 this 바인딩
            facebook::jsi::Value objValue = getFunc.callWithThis(runtime, cdpObjectsObj,
                                                                  facebook::jsi::String::createFromUtf8(runtime, objectId));
            if (objValue.isUndefined()) {
              LOGW("findObjectById: Map.get returned undefined for objectId=%s / Map.get이 objectId=%s에 대해 undefined 반환", objectId.c_str(), objectId.c_str());
            } else if (!objValue.isObject() || objValue.isNull()) {
              LOGW("findObjectById: Map.get returned non-object for objectId=%s / Map.get이 objectId=%s에 대해 객체가 아닌 값 반환", objectId.c_str(), objectId.c_str());
            } else {
              LOGI("findObjectById: Found object in Map for objectId=%s / Map에서 objectId=%s인 객체 찾음", objectId.c_str(), objectId.c_str());
              return objValue;  // Found in Map! / Map에서 찾음!
            }
          } catch (const std::exception& e) {
            LOGW("findObjectById: Exception calling Map.get: %s / Map.get 호출 중 예외: %s", e.what(), e.what());
          } catch (...) {
            LOGW("findObjectById: Unknown exception calling Map.get / Map.get 호출 중 알 수 없는 예외");
          }
        } else {
          // Not a Map, try as regular object / Map이 아니면 일반 객체로 시도
          LOGI("findObjectById: __cdpObjects is not a Map, trying as regular object with key=%s / __cdpObjects가 Map이 아님, 키=%s로 일반 객체로 시도", objectId.c_str(), objectId.c_str());
          try {
            facebook::jsi::Value objValue = cdpObjectsObj.getProperty(runtime, objectId.c_str());
            if (!objValue.isUndefined() && objValue.isObject() && !objValue.isNull()) {
              LOGI("findObjectById: Found object in __cdpObjects for objectId=%s / __cdpObjects에서 objectId=%s인 객체 찾음", objectId.c_str(), objectId.c_str());
              return objValue;
            }
          } catch (...) {
            LOGW("findObjectById: Exception getting property from __cdpObjects / __cdpObjects에서 속성 가져오기 중 예외");
          }
        }
      }
    } catch (const std::exception& e) {
      LOGW("findObjectById: Exception getting from __cdpObjects: %s / __cdpObjects에서 가져오기 중 예외: %s", e.what(), e.what());
    } catch (...) {
      LOGW("findObjectById: Unknown exception getting from __cdpObjects / __cdpObjects에서 가져오기 중 알 수 없는 예외");
    }

    // Fallback: Search in global scope / 폴백: 전역 스코프에서 검색
    auto propertyNames = globalObj.getPropertyNames(runtime);

    for (size_t i = 0; i < propertyNames.size(runtime); i++) {
      try {
        auto nameValue = propertyNames.getValueAtIndex(runtime, i);
        if (!nameValue.isString()) continue;

        std::string propName = nameValue.asString(runtime).utf8(runtime);
        auto propValue = globalObj.getProperty(runtime, propName.c_str());

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
        auto globalObjValue = globalObj.getProperty(runtime, globalName);
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

  LOGI("getObjectProperties: Getting properties for objectId=%s / objectId=%s의 속성 가져오기", objectId.c_str(), objectId.c_str());

  try {
    // Find object by ID / ID로 객체 찾기
    auto objValue = findObjectById(runtime, objectId);
    if (objValue.isUndefined() || !objValue.isObject() || objValue.isNull()) {
      // Object not found, return empty result / 객체를 찾지 못함, 빈 결과 반환
      LOGW("getObjectProperties: Object not found for objectId=%s / objectId=%s인 객체를 찾을 수 없음", objectId.c_str(), objectId.c_str());
      folly::dynamic response = folly::dynamic::object;
      response["result"] = folly::dynamic::array();
      response["internalProperties"] = folly::dynamic::array();
      response["privateProperties"] = folly::dynamic::array();
      folly::json::serialization_opts opts;
      return folly::json::serialize(response, opts);
    }

    LOGI("getObjectProperties: Object found for objectId=%s, getting properties / objectId=%s인 객체 찾음, 속성 가져오기", objectId.c_str(), objectId.c_str());

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
          // jsiValueToRemoteObject already generated objectId and stored in Map / jsiValueToRemoteObject가 이미 objectId를 생성하고 Map에 저장함
          valueObj["description"] = remoteObj.description.empty() ? "Object" : remoteObj.description;
          valueObj["className"] = "Object";

          // Use objectId from RemoteObject (already set by jsiValueToRemoteObject) / RemoteObject의 objectId 사용 (jsiValueToRemoteObject가 이미 설정함)
          if (!remoteObj.objectId.empty()) {
            valueObj["objectId"] = remoteObj.objectId;
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

} // namespace console
} // namespace chrome_remote_devtools

