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

// Track hook state / 훅 상태 추적
static std::atomic<bool> g_isNetworkHooked{false};

bool hookNetworkMethods(facebook::jsi::Runtime& runtime) {
  // Check if already hooked / 이미 훅되었는지 확인 (thread-safe / 스레드 안전)
  if (g_isNetworkHooked.load()) {
    LOGW("Network methods already hooked, skipping / 네트워크 메서드가 이미 훅되었으므로 건너뜀");
    return true;
  }

  try {
    // Hook XMLHttpRequest / XMLHttpRequest 훅
    // Note: React Native internally wraps fetch with XMLHttpRequest, so XHR hook will catch both fetch and XHR requests / 참고: React Native는 내부적으로 fetch를 XMLHttpRequest로 래핑하므로 XHR 훅이 fetch와 XHR 요청을 모두 잡음
    bool xhrSuccess = network::hookXHR(runtime);
    if (!xhrSuccess) {
      LOGE("Failed to hook XMLHttpRequest / XMLHttpRequest 훅 실패");
      return false;
    }

    // Fetch hook removed: React Native wraps fetch with XHR, so XHR hook handles all requests / Fetch 훅 제거: React Native가 fetch를 XHR로 래핑하므로 XHR 훅이 모든 요청을 처리함

    g_isNetworkHooked.store(true);
    LOGI("Network hook installed successfully / 네트워크 훅이 성공적으로 설치됨");
    return true;
  } catch (const std::exception& e) {
    LOGE("Failed to hook network methods / 네트워크 메서드 훅 실패: %s", e.what());
    return false;
  }
}

bool enableNetworkHook(facebook::jsi::Runtime& runtime) {
  return hookNetworkMethods(runtime);
}

bool disableNetworkHook(facebook::jsi::Runtime& runtime) {
  // Restore original XMLHttpRequest methods / 원본 XMLHttpRequest 메서드 복원
  try {
    facebook::jsi::Value xhrValue = runtime.global().getProperty(runtime, "XMLHttpRequest");
    if (xhrValue.isObject()) {
      facebook::jsi::Object xhrConstructor = xhrValue.asObject(runtime);
      facebook::jsi::Value prototypeValue = xhrConstructor.getProperty(runtime, "prototype");
      if (prototypeValue.isObject()) {
        facebook::jsi::Object xhrPrototype = prototypeValue.asObject(runtime);

        // Restore original methods / 원본 메서드 복원
        const char* methods[] = {"open", "send", "setRequestHeader"};
        for (const char* methodName : methods) {
          try {
            std::string backupPropName = std::string("__original_") + methodName;
            facebook::jsi::Value originalMethodValue = xhrPrototype.getProperty(runtime, backupPropName.c_str());
            if (originalMethodValue.isObject() && originalMethodValue.asObject(runtime).isFunction(runtime)) {
              // Restore original method / 원본 메서드 복원
              xhrPrototype.setProperty(runtime, methodName, std::move(originalMethodValue));
              // Remove backup property / 백업 속성 제거
              xhrPrototype.setProperty(runtime, backupPropName.c_str(), facebook::jsi::Value::undefined());
            }
          } catch (...) {
            // Failed to restore method / 메서드 복원 실패
          }
        }

        g_isNetworkHooked.store(false);
        LOGI("Network hook disabled successfully / 네트워크 훅이 성공적으로 비활성화됨");
        return true;
      }
    }
  } catch (...) {
    // Failed to disable network hook / 네트워크 훅 비활성화 실패
  }
  return false;
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
