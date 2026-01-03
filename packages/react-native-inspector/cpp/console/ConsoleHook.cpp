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
#include "../ConsoleHook.h" // For RemoteObject / RemoteObject를 위해
#include <cstring>

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

