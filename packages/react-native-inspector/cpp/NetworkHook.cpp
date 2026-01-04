/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Modified for Chrome Remote DevTools / Chrome Remote DevTools용으로 수정됨
 */

#include "NetworkHook.h"
#include "network/XHRHook.h"
#include "network/FetchHook.h"
#include "network/NetworkGlobals.h"
#include <atomic>

// Platform-specific log support / 플랫폼별 로그 지원
#ifdef __ANDROID__
#include <android/log.h>
#define LOG_TAG "NetworkHook"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)
#define LOGW(...) __android_log_print(ANDROID_LOG_WARN, LOG_TAG, __VA_ARGS__)
#elif defined(__APPLE__)
#define LOG_TAG "NetworkHook"
#define LOGI(...) ((void)0)
#define LOGE(...) ((void)0)
#define LOGW(...) ((void)0)
#else
#define LOGI(...)
#define LOGE(...)
#define LOGW(...)
#endif

namespace chrome_remote_devtools {

bool hookNetworkMethods(facebook::jsi::Runtime& runtime) {
  // Check if already hooked / 이미 훅되었는지 확인 (thread-safe / 스레드 안전)
  static std::atomic<bool> isHooked{false};
  if (isHooked.load()) {
    LOGW("Network methods already hooked, skipping / 네트워크 메서드가 이미 훅되었으므로 건너뜀");
    return true;
  }

  try {
    // Hook XMLHttpRequest / XMLHttpRequest 훅
    bool xhrSuccess = network::hookXHR(runtime);
    if (!xhrSuccess) {
      LOGE("Failed to hook XMLHttpRequest / XMLHttpRequest 훅 실패");
    }

    // Hook fetch / fetch 훅
    bool fetchSuccess = network::hookFetch(runtime);
    if (!fetchSuccess) {
      LOGE("Failed to hook fetch / fetch 훅 실패");
    }

    // Only mark as hooked if both XHR and Fetch succeeded / XHR과 Fetch 둘 다 성공한 경우에만 훅 완료로 표시
    if (xhrSuccess && fetchSuccess) {
      isHooked.store(true);
      LOGI("Network hook installed successfully / 네트워크 훅이 성공적으로 설치됨");
      return true;
    } else if (xhrSuccess || fetchSuccess) {
      // At least one hook succeeded, but not both / 최소한 하나는 성공했지만 둘 다는 아님
      LOGW("Partial network hook installation: XHR=%s, Fetch=%s",
           xhrSuccess ? "success" : "failed", fetchSuccess ? "success" : "failed");
      return true; // Return true to indicate partial success / 부분적 성공을 나타내기 위해 true 반환
    }

    return false;
  } catch (const std::exception& e) {
    LOGE("Failed to hook network methods / 네트워크 메서드 훅 실패: %s", e.what());
    return false;
  }
}

std::string getNetworkResponseBody(const std::string& requestId) {
  std::lock_guard<std::mutex> lock(network::g_responseDataMutex);
  auto it = network::g_responseData.find(requestId);
  if (it != network::g_responseData.end()) {
    // Move and erase to prevent memory leak / 메모리 누수 방지를 위해 이동 후 삭제
    std::string body = std::move(it->second);
    network::g_responseData.erase(it);
    return body;
  }
  return "";
}

} // namespace chrome_remote_devtools
