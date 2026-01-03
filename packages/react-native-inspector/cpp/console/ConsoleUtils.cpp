/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Modified for Chrome Remote DevTools / Chrome Remote DevTools용으로 수정됨
 */

#include "ConsoleUtils.h"

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

