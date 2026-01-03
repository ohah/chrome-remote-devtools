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
#include <map>
#include <string>

namespace chrome_remote_devtools {
namespace network {

// Global request ID counter / 전역 요청 ID 카운터
extern std::atomic<size_t> g_requestIdCounter;

// Store response data by requestId / requestId별로 응답 데이터 저장
extern std::map<std::string, std::string> g_responseData;

} // namespace network
} // namespace chrome_remote_devtools

