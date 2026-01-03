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

namespace chrome_remote_devtools {
namespace console {

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
            size_t nestedObjectId = console::g_objectIdCounter.fetch_add(1);
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

} // namespace console
} // namespace chrome_remote_devtools

