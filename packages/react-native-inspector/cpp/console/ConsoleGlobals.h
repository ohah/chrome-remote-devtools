/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Modified for Chrome Remote DevTools / Chrome Remote DevTools용으로 수정됨
 */

#pragma once

#include <atomic>

namespace chrome_remote_devtools {
namespace console {

// Global counter for objectId generation / objectId 생성을 위한 전역 카운터
extern std::atomic<size_t> g_objectIdCounter;

// Platform-specific callback for sending CDP messages / CDP 메시지 전송을 위한 플랫폼별 콜백
// Note: This is defined in chrome_remote_devtools namespace (not console) / 참고: chrome_remote_devtools 네임스페이스에 정의됨 (console 아님)
// Access via chrome_remote_devtools::g_sendCDPMessageCallback / chrome_remote_devtools::g_sendCDPMessageCallback을 통해 접근

} // namespace console
} // namespace chrome_remote_devtools

