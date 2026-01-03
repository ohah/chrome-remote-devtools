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

namespace chrome_remote_devtools {
namespace network {

// Hook fetch / fetch 훅
bool hookFetch(facebook::jsi::Runtime& runtime);

} // namespace network
} // namespace chrome_remote_devtools

