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
  // Check if already hooked / 이미 훅되었는지 확인
  static bool isHooked = false;
  if (isHooked) {
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

    if (xhrSuccess || fetchSuccess) {
      isHooked = true;
      LOGI("Network hook installed successfully / 네트워크 훅이 성공적으로 설치됨");
      return true;
    }

    return false;
  } catch (const std::exception& e) {
    LOGE("Failed to hook network methods / 네트워크 메서드 훅 실패: %s", e.what());
    return false;
  }
}

} // namespace chrome_remote_devtools
