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

namespace chrome_remote_devtools {

// Platform-specific callback for sending CDP messages / CDP 메시지 전송을 위한 플랫폼별 콜백
// Note: Made non-static so NetworkHook can access it / 참고: NetworkHook에서 접근할 수 있도록 static 제거
SendCDPMessageCallback g_sendCDPMessageCallback = nullptr;

void setSendCDPMessageCallback(SendCDPMessageCallback callback) {
  g_sendCDPMessageCallback = callback;
}

RemoteObject jsiValueToRemoteObject(facebook::jsi::Runtime& runtime, const facebook::jsi::Value& value) {
  return console::jsiValueToRemoteObject(runtime, value);
}

bool hookConsoleMethods(facebook::jsi::Runtime& runtime) {
  return console::hookConsoleMethods(runtime);
}

bool enableConsoleHook(facebook::jsi::Runtime& runtime) {
  return console::hookConsoleMethods(runtime);
}

bool disableConsoleHook(facebook::jsi::Runtime& runtime) {
  // Restore original console methods / 원본 console 메서드 복원
  try {
    facebook::jsi::Value consoleValue = runtime.global().getProperty(runtime, "console");
    if (consoleValue.isObject()) {
      facebook::jsi::Object consoleObj = consoleValue.asObject(runtime);
      const char* methods[] = {"log", "warn", "error", "info", "debug"};

      for (const char* methodName : methods) {
        try {
          std::string backupPropName = std::string("__original_") + methodName;
          facebook::jsi::Value originalMethodValue = consoleObj.getProperty(runtime, backupPropName.c_str());
          if (originalMethodValue.isObject() && originalMethodValue.asObject(runtime).isFunction(runtime)) {
            // Restore original method / 원본 메서드 복원
            consoleObj.setProperty(runtime, methodName, std::move(originalMethodValue));
            // Remove backup property / 백업 속성 제거
            consoleObj.setProperty(runtime, backupPropName.c_str(), facebook::jsi::Value::undefined());
          }
        } catch (...) {
          // Failed to restore method / 메서드 복원 실패
        }
      }
      return true;
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

} // namespace chrome_remote_devtools
