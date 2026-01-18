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
#include <mutex>
#include <string>

namespace chrome_remote_devtools {
namespace network {

// Global request ID counter / 전역 요청 ID 카운터
extern std::atomic<size_t> g_requestIdCounter;

// Store response data by requestId / requestId별로 응답 데이터 저장
// Thread-safe access via g_responseDataMutex / g_responseDataMutex를 통한 스레드 안전 접근
extern std::map<std::string, std::string> g_responseData;
extern std::mutex g_responseDataMutex;

// Track active fetch requests for XHR hook detection / XHR 훅 감지를 위한 활성 fetch 요청 추적
extern std::atomic<bool> g_isFetchRequestActive;
// Must be accessed only while holding g_fetchRequestMutex / g_fetchRequestMutex를 보유한 상태에서만 접근해야 함
extern std::string g_activeFetchRequestId;
extern std::mutex g_fetchRequestMutex;

} // namespace network
} // namespace chrome_remote_devtools

