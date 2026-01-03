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

facebook::jsi::Value findObjectById(facebook::jsi::Runtime& runtime, const std::string& objectId) {
  return console::findObjectById(runtime, objectId);
}

std::string getObjectProperties(facebook::jsi::Runtime& runtime, const std::string& objectId, bool ownProperties) {
  return console::getObjectProperties(runtime, objectId, ownProperties);
}

} // namespace chrome_remote_devtools
