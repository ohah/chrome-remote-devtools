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
#include <string>

namespace chrome_remote_devtools {
namespace console {

// Find object by __cdpObjectId in runtime / 런타임에서 __cdpObjectId로 객체 찾기
facebook::jsi::Value findObjectById(facebook::jsi::Runtime& runtime, const std::string& objectId);

// Get object properties for Runtime.getProperties / Runtime.getProperties를 위한 객체 속성 가져오기
std::string getObjectProperties(facebook::jsi::Runtime& runtime, const std::string& objectId, bool ownProperties);

} // namespace console
} // namespace chrome_remote_devtools

