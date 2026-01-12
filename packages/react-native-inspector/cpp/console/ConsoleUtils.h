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
#include "../ConsoleHook.h" // For RemoteObject / RemoteObject를 위해

namespace chrome_remote_devtools {
namespace console {

// Convert JSI value to RemoteObject / JSI 값을 RemoteObject로 변환
RemoteObject jsiValueToRemoteObject(facebook::jsi::Runtime& runtime, const facebook::jsi::Value& value);

// Store object in __cdpObjects Map / __cdpObjects Map에 객체 저장
// Returns true if successful, false otherwise / 성공하면 true, 실패하면 false 반환
bool storeObjectInCdpMap(facebook::jsi::Runtime& runtime, const std::string& objectIdStr, const facebook::jsi::Value& value);

} // namespace console
} // namespace chrome_remote_devtools

