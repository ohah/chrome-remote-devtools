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

// Track hook state / 훅 상태 추적
static std::atomic<bool> g_isNetworkHooked{false};

bool hookNetworkMethods(facebook::jsi::Runtime& runtime) {
  // Check if already hooked by checking runtime state / 런타임 상태를 확인하여 이미 훅되었는지 확인
  try {
    facebook::jsi::Value xhrValue = runtime.global().getProperty(runtime, "XMLHttpRequest");
    if (xhrValue.isObject()) {
      facebook::jsi::Object xhrConstructor = xhrValue.asObject(runtime);
      facebook::jsi::Value prototypeValue = xhrConstructor.getProperty(runtime, "prototype");
      if (prototypeValue.isObject()) {
        facebook::jsi::Object xhrPrototype = prototypeValue.asObject(runtime);
        facebook::jsi::Value originalOpenValue = xhrPrototype.getProperty(runtime, "__original_open");
        if (originalOpenValue.isObject() && originalOpenValue.asObject(runtime).isFunction(runtime)) {
          // Already hooked, update flag and return / 이미 훅되었으므로 플래그 업데이트 후 반환
          g_isNetworkHooked.store(true);
          LOGW("Network methods already hooked, updating flag / 네트워크 메서드가 이미 훅되었으므로 플래그 업데이트");
          return true;
        }
      }
    }
  } catch (...) {
    // Failed to check, continue with hooking / 확인 실패, 훅 계속 진행
  }

  // Check if flag is already set / 플래그가 이미 설정되어 있는지 확인 (thread-safe / 스레드 안전)
  if (g_isNetworkHooked.load()) {
    LOGW("Network methods already hooked, skipping / 네트워크 메서드가 이미 훅되었으므로 건너뜀");
    return true;
  }

  try {
    // Hook XMLHttpRequest / XMLHttpRequest 훅
    bool xhrSuccess = network::hookXHR(runtime);
    if (!xhrSuccess) {
      LOGE("Failed to hook XMLHttpRequest / XMLHttpRequest 훅 실패");
      return false;
    }

    // Hook Fetch / Fetch 훅
    // Note: Fetch hook handles blob data extraction for fetch requests / 참고: Fetch 훅은 fetch 요청에 대한 blob 데이터 추출을 처리함
    bool fetchSuccess = network::hookFetch(runtime);
    if (!fetchSuccess) {
      LOGW("Failed to hook Fetch (may not be available) / Fetch 훅 실패 (사용 불가능할 수 있음)");
      // Continue even if fetch hook fails, as XHR hook will still catch fetch requests / fetch 훅이 실패해도 계속 진행, XHR 훅이 여전히 fetch 요청을 잡을 수 있음
    } else {
      LOGI("Fetch hook installed successfully / Fetch 훅이 성공적으로 설치됨");
    }

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
  // Check if not hooked / 훅되지 않았는지 확인
  if (!g_isNetworkHooked.load()) {
    return true;
  }

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
        bool allRestored = true;
        for (const char* methodName : methods) {
          try {
            std::string backupPropName = std::string("__original_") + methodName;
            facebook::jsi::Value originalMethodValue = xhrPrototype.getProperty(runtime, backupPropName.c_str());
            // Check if backup exists and is a function before restoring / 복원 전에 백업이 존재하고 함수인지 확인
            if (originalMethodValue.isObject() && originalMethodValue.asObject(runtime).isFunction(runtime)) {
              // Restore original method / 원본 메서드 복원
              xhrPrototype.setProperty(runtime, methodName, std::move(originalMethodValue));
              // Remove backup property / 백업 속성 제거
              xhrPrototype.setProperty(runtime, backupPropName.c_str(), facebook::jsi::Value::undefined());
            } else if (!originalMethodValue.isUndefined()) {
              // Backup property exists but is not a function, or already restored / 백업 속성이 존재하지만 함수가 아니거나 이미 복원됨
              // Skip restoration to avoid setting method to undefined / 메서드를 undefined로 설정하는 것을 방지하기 위해 복원 건너뜀
            }
          } catch (...) {
            // Failed to restore method / 메서드 복원 실패
            allRestored = false;
          }
        }

        // Only update flag if restoration succeeded / 복원이 성공했을 때만 플래그 업데이트
        if (allRestored) {
          g_isNetworkHooked.store(false);
          LOGI("Network hook disabled successfully / 네트워크 훅이 성공적으로 비활성화됨");
          return true;
        }
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

bool isNetworkHookEnabled() {
  // Return flag value / 플래그 값 반환
  // Note: For Android, runtime state check is done in JNI layer / 참고: Android의 경우 런타임 상태 확인은 JNI 레이어에서 수행됨
  return g_isNetworkHooked.load();
}

bool isNetworkHookEnabled(facebook::jsi::Runtime& runtime) {
  // Check flag first / 먼저 플래그 확인
  if (g_isNetworkHooked.load()) {
    return true;
  }

  // If flag is false, check runtime state / 플래그가 false이면 런타임 상태 확인
  try {
    facebook::jsi::Value xhrValue = runtime.global().getProperty(runtime, "XMLHttpRequest");
    if (xhrValue.isObject()) {
      facebook::jsi::Object xhrConstructor = xhrValue.asObject(runtime);
      facebook::jsi::Value prototypeValue = xhrConstructor.getProperty(runtime, "prototype");
      if (prototypeValue.isObject()) {
        facebook::jsi::Object xhrPrototype = prototypeValue.asObject(runtime);
        facebook::jsi::Value originalOpenValue = xhrPrototype.getProperty(runtime, "__original_open");
        if (originalOpenValue.isObject() && originalOpenValue.asObject(runtime).isFunction(runtime)) {
          // Hook is installed, update flag / 훅이 설치되어 있으므로 플래그 업데이트
          g_isNetworkHooked.store(true);
          return true;
        }
      }
    }
  } catch (...) {
    // Failed to check runtime state / 런타임 상태 확인 실패
  }

  return false;
}

} // namespace chrome_remote_devtools
