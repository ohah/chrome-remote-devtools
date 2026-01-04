/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Modified for Chrome Remote DevTools / Chrome Remote DevTools용으로 수정됨
 */

#include "NetworkGlobals.h"

namespace chrome_remote_devtools {
namespace network {

// Global request ID counter / 전역 요청 ID 카운터
std::atomic<size_t> g_requestIdCounter{1};

// Store response data by requestId / requestId별로 응답 데이터 저장
std::map<std::string, std::string> g_responseData;

// Mutex for thread-safe access to g_responseData / g_responseData에 대한 스레드 안전 접근을 위한 mutex
std::mutex g_responseDataMutex;

} // namespace network
} // namespace chrome_remote_devtools

