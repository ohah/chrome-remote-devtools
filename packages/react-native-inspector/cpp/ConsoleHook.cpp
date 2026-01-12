/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Modified for Chrome Remote DevTools / Chrome Remote DevTools용으로 수정됨
 */

#include "ConsoleHook.h"
#include "console/ConsoleHook.h"
#include "console/ConsoleUtils.h"
#include "console/ConsoleRuntime.h"
#include <atomic>

// Platform-specific log support / 플랫폼별 로그 지원
#ifdef __ANDROID__
#include <android/log.h>
#define LOG_TAG "ConsoleHook"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGD(...) __android_log_print(ANDROID_LOG_DEBUG, LOG_TAG, __VA_ARGS__)
#define LOGW(...) __android_log_print(ANDROID_LOG_WARN, LOG_TAG, __VA_ARGS__)
#else
#define LOGI(...)
#define LOGD(...)
#define LOGW(...)
#endif

namespace chrome_remote_devtools {

// Platform-specific callback for sending CDP messages / CDP 메시지 전송을 위한 플랫폼별 콜백
// Note: Made non-static so NetworkHook can access it / 참고: NetworkHook에서 접근할 수 있도록 static 제거
SendCDPMessageCallback g_sendCDPMessageCallback = nullptr;

// Track console hook state / console 훅 상태 추적
static std::atomic<bool> g_isConsoleHooked{false};

void setSendCDPMessageCallback(SendCDPMessageCallback callback) {
  g_sendCDPMessageCallback = callback;
}

RemoteObject jsiValueToRemoteObject(facebook::jsi::Runtime& runtime, const facebook::jsi::Value& value) {
  return console::jsiValueToRemoteObject(runtime, value);
}

bool hookConsoleMethods(facebook::jsi::Runtime& runtime) {
  // Check if already hooked by checking runtime state / 런타임 상태를 확인하여 이미 훅되었는지 확인
  try {
    facebook::jsi::Value consoleValue = runtime.global().getProperty(runtime, "console");
    if (consoleValue.isObject()) {
      facebook::jsi::Object consoleObj = consoleValue.asObject(runtime);
      facebook::jsi::Value originalLogValue = consoleObj.getProperty(runtime, "__original_log");
      if (originalLogValue.isObject() && originalLogValue.asObject(runtime).isFunction(runtime)) {
        // Already hooked, update flag and return / 이미 훅되었으므로 플래그 업데이트 후 반환
        g_isConsoleHooked.store(true);
        return true;
      }
    }
  } catch (...) {
    // Failed to check, continue with hooking / 확인 실패, 훅 계속 진행
  }

  // Check if flag is already set / 플래그가 이미 설정되어 있는지 확인
  if (g_isConsoleHooked.load()) {
    return true;
  }

  bool success = console::hookConsoleMethods(runtime);
  if (success) {
    g_isConsoleHooked.store(true);
  }
  return success;
}

bool enableConsoleHook(facebook::jsi::Runtime& runtime) {
  // Check if already hooked / 이미 훅되었는지 확인 (thread-safe / 스레드 안전)
  if (g_isConsoleHooked.load()) {
    return true;
  }

  bool success = console::hookConsoleMethods(runtime);
  if (success) {
    g_isConsoleHooked.store(true);
  }
  return success;
}

bool disableConsoleHook(facebook::jsi::Runtime& runtime) {
  // Check if not hooked / 훅되지 않았는지 확인
  if (!g_isConsoleHooked.load()) {
    return true;
  }

  // Restore original console methods / 원본 console 메서드 복원
  try {
    facebook::jsi::Value consoleValue = runtime.global().getProperty(runtime, "console");
    if (consoleValue.isObject()) {
      facebook::jsi::Object consoleObj = consoleValue.asObject(runtime);
      const char* methods[] = {"log", "warn", "error", "info", "debug"};

      bool allRestored = true;
      for (const char* methodName : methods) {
        try {
          std::string backupPropName = std::string("__original_") + methodName;
          facebook::jsi::Value originalMethodValue = consoleObj.getProperty(runtime, backupPropName.c_str());
          // Check if backup exists and is a function before restoring / 복원 전에 백업이 존재하고 함수인지 확인
          if (originalMethodValue.isObject() && originalMethodValue.asObject(runtime).isFunction(runtime)) {
            // Restore original method / 원본 메서드 복원
            consoleObj.setProperty(runtime, methodName, std::move(originalMethodValue));
            // Remove backup property / 백업 속성 제거
            consoleObj.setProperty(runtime, backupPropName.c_str(), facebook::jsi::Value::undefined());
          } else if (!originalMethodValue.isUndefined()) {
            // Backup property exists but is not a function, or already restored / 백업 속성이 존재하지만 함수가 아니거나 이미 복원됨
            // Skip restoration to avoid setting method to undefined / 메서드를 undefined로 설정하는 것을 방지하기 위해 복원 건너뜀
          }
        } catch (...) {
          // Failed to restore method / 메서드 복원 실패
          allRestored = false;
        }
      }

      // Only update flag if restoration succeeded / 복원이 성공했을 때만 플래그 업데이트
      if (allRestored) {
        g_isConsoleHooked.store(false);
        return true;
      }
    }
  } catch (...) {
    // Failed to disable console hook / console 훅 비활성화 실패
  }
  return false;
}

facebook::jsi::Value findObjectById(facebook::jsi::Runtime& runtime, const std::string& objectId) {
  return console::findObjectById(runtime, objectId);
}

std::string getObjectProperties(facebook::jsi::Runtime& runtime, const std::string& objectId, bool ownProperties) {
  return console::getObjectProperties(runtime, objectId, ownProperties);
}

bool isConsoleHookEnabled() {
  // Return flag value / 플래그 값 반환
  // Note: For Android, runtime state check is done in JNI layer / 참고: Android의 경우 런타임 상태 확인은 JNI 레이어에서 수행됨
  return g_isConsoleHooked.load();
}

bool isConsoleHookEnabled(facebook::jsi::Runtime& runtime) {
  // Check flag first / 먼저 플래그 확인
  if (g_isConsoleHooked.load()) {
    return true;
  }

  // If flag is false, check runtime state / 플래그가 false이면 런타임 상태 확인
  try {
    facebook::jsi::Value consoleValue = runtime.global().getProperty(runtime, "console");
    if (consoleValue.isObject()) {
      facebook::jsi::Object consoleObj = consoleValue.asObject(runtime);
      facebook::jsi::Value originalLogValue = consoleObj.getProperty(runtime, "__original_log");
      if (originalLogValue.isObject() && originalLogValue.asObject(runtime).isFunction(runtime)) {
        // Hook is installed, update flag / 훅이 설치되어 있으므로 플래그 업데이트
        g_isConsoleHooked.store(true);
        // Log flag update for debugging / 디버깅을 위한 플래그 업데이트 로그
        LOGI("isConsoleHookEnabled: Hook detected in runtime, flag updated to true / 런타임에서 훅 감지, 플래그를 true로 업데이트");
        return true;
      } else {
        // Log that backup property doesn't exist / 백업 속성이 존재하지 않음을 로그
        LOGD("isConsoleHookEnabled: __original_log not found in console object / console 객체에서 __original_log를 찾을 수 없음");
      }
    } else {
      // Log that console is not an object / console이 객체가 아님을 로그
      LOGD("isConsoleHookEnabled: console is not an object / console이 객체가 아님");
    }
  } catch (const std::exception& e) {
    // Failed to check runtime state / 런타임 상태 확인 실패
    LOGW("isConsoleHookEnabled: Exception checking runtime state: %s", e.what());
  } catch (...) {
    // Failed to check runtime state / 런타임 상태 확인 실패
    LOGW("isConsoleHookEnabled: Unknown exception checking runtime state / 런타임 상태 확인 중 알 수 없는 예외");
  }

  return false;
}

} // namespace chrome_remote_devtools
