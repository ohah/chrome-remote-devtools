/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Modified for Chrome Remote DevTools / Chrome Remote DevTools용으로 수정됨
 */

#include "ConsoleGlobals.h"

namespace chrome_remote_devtools {
namespace console {

// Global counter for objectId generation / objectId 생성을 위한 전역 카운터
std::atomic<size_t> g_objectIdCounter{1};

} // namespace console
} // namespace chrome_remote_devtools

