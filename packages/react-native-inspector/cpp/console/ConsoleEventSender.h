/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Modified for Chrome Remote DevTools / Chrome Remote DevTools용으로 수정됨
 */

#pragma once

#include <jsi/jsi.h>
#include <vector>
#include <string>
#include "../ConsoleHook.h" // For RemoteObject / RemoteObject를 위해
#include <folly/dynamic.h>

namespace chrome_remote_devtools {
namespace console {

// Send console API called event / console API 호출 이벤트 전송
void sendConsoleAPICalled(facebook::jsi::Runtime& runtime,
                          const std::string& type,
                          const std::vector<RemoteObject>& args);

} // namespace console
} // namespace chrome_remote_devtools

