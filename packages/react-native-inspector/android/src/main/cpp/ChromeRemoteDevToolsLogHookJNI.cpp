/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Modified for Chrome Remote DevTools / Chrome Remote DevTools용으로 수정됨
 */

#include <jni.h>
#include <android/log.h>
#include <string>
#include <mutex>
#include <cstdarg>
#include <cstdio>

// Include xhook header with C linkage / C 링크로 xhook 헤더 포함
extern "C" {
#include <xhook.h>
}

#define TAG "ChromeRemoteDevToolsLogHookJNI"
#define LOG_TAG "ChromeRemoteDevToolsLogHookJNI"

// Global JNI environment and callback / 전역 JNI 환경 및 콜백
static JavaVM* g_jvm = nullptr;
static jobject g_logCallback = nullptr;
static jmethodID g_onLogMethodID = nullptr;
static std::mutex g_callbackMutex;

// Android Log function types / Android Log 함수 타입들
typedef int (*AndroidLogPrintFunc)(int priority, const char* tag, const char* fmt, ...);
typedef int (*AndroidLogWriteFunc)(int bufID, int priority, const char* tag, const char* text);
typedef int (*AndroidLogBufWriteFunc)(int bufID, int priority, const char* tag, const char* text);
typedef int (*AndroidLogVPrintFunc)(int priority, const char* tag, const char* fmt, va_list ap);

// Original Android Log functions / 원본 Android Log 함수들
static AndroidLogPrintFunc original__android_log_print = nullptr;
static AndroidLogWriteFunc original__android_log_write = nullptr;
static AndroidLogBufWriteFunc original__android_log_buf_write = nullptr;
static AndroidLogVPrintFunc original__android_log_vprint = nullptr;

// Flag to track if hook is active / 훅이 활성화되었는지 추적하는 플래그
static bool g_is_hooked = false;

// Forward declaration / 전방 선언
static bool hookAndroidLog();

// Custom log function / 커스텀 로그 함수
// This function replaces __android_log_print via PLT hooking / 이 함수는 PLT 훅을 통해 __android_log_print를 대체합니다
static int custom__android_log_print(int priority, const char* tag, const char* fmt, ...) {
  // Reconstruct message from va_list / va_list에서 메시지 재구성
  va_list args;
  va_start(args, fmt);
  char buffer[4096];
  vsnprintf(buffer, sizeof(buffer), fmt, args);
  va_end(args);

  // Debug: Log ALL tags to see what we're intercepting / 디버그: 인터셉트하는 모든 태그 로깅
  // Use direct syscall to avoid recursion / 재귀 방지를 위해 직접 syscall 사용
  static int call_count = 0;
  static int reactnativejs_count = 0;

  // Check for ReactNativeJS or unknown:ReactNative tags / ReactNativeJS 또는 unknown:ReactNative 태그 확인
  bool is_reactnativejs = (tag && (strcmp(tag, "ReactNativeJS") == 0 ||
                                   strstr(tag, "ReactNative") != nullptr));

  // Log ALL calls with ReactNativeJS tag / ReactNativeJS 태그가 있는 모든 호출 로깅
  if (is_reactnativejs) {
    reactnativejs_count++;
    char debug_msg[512];
    snprintf(debug_msg, sizeof(debug_msg), "✅✅✅ FOUND ReactNativeJS #%d (print): priority=%d, msg=%.200s",
             reactnativejs_count, priority, buffer);
    // Use original to avoid recursion / 재귀 방지를 위해 원본 사용
    if (original__android_log_buf_write) {
      original__android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_INFO, "ChromeRemoteDevToolsHook", debug_msg);
    } else {
      __android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_INFO, "ChromeRemoteDevToolsHook", debug_msg);
    }
  }

  // Log first 1000 calls to see all tags / 모든 태그를 보기 위해 처음 1000개 호출 로깅
  // Increase limit to catch ReactNativeJS logs / ReactNativeJS 로그를 잡기 위해 제한 증가
  if (call_count++ < 1000) {
    char debug_msg[512];
    snprintf(debug_msg, sizeof(debug_msg), "Intercepted log (print) #%d: tag=%s, priority=%d, msg=%.100s",
             call_count, tag ? tag : "(null)", priority, buffer);
    // Use original to avoid recursion / 재귀 방지를 위해 원본 사용
    if (original__android_log_buf_write) {
      original__android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_DEBUG, "ChromeRemoteDevToolsHook", debug_msg);
    } else {
      __android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_DEBUG, "ChromeRemoteDevToolsHook", debug_msg);
    }
  }

  // Filter ReactNativeJS logs / ReactNativeJS 로그 필터링
  if (is_reactnativejs) {
    // Send to Java callback / Java 콜백으로 전송
    std::lock_guard<std::mutex> lock(g_callbackMutex);
    if (g_jvm && g_logCallback && g_onLogMethodID) {
      JNIEnv* env = nullptr;
      int getEnvStat = g_jvm->GetEnv((void**)&env, JNI_VERSION_1_6);

      if (getEnvStat == JNI_EDETACHED) {
        // Thread not attached, attach it / 스레드가 연결되지 않음, 연결
        if (g_jvm->AttachCurrentThread(&env, nullptr) != 0) {
          goto original_call;
        }
      } else if (getEnvStat != JNI_OK) {
        goto original_call;
      }

      // Map Android log priority to level / Android 로그 우선순위를 레벨로 매핑
      int level = 4; // Default to INFO / 기본값은 INFO
      switch (priority) {
        case ANDROID_LOG_ERROR:
          level = 6; // Log.ERROR
          break;
        case ANDROID_LOG_WARN:
          level = 5; // Log.WARN
          break;
        case ANDROID_LOG_INFO:
          level = 4; // Log.INFO
          break;
        case ANDROID_LOG_DEBUG:
          level = 3; // Log.DEBUG
          break;
        default:
          level = 4; // Log.INFO
          break;
      }

      // Call Java callback / Java 콜백 호출
      jstring jtag = env->NewStringUTF(tag);
      jstring jmessage = env->NewStringUTF(buffer);
      env->CallVoidMethod(g_logCallback, g_onLogMethodID, level, jtag, jmessage);

      if (env->ExceptionCheck()) {
        env->ExceptionClear();
      }

      env->DeleteLocalRef(jtag);
      env->DeleteLocalRef(jmessage);

      if (getEnvStat == JNI_EDETACHED) {
        g_jvm->DetachCurrentThread();
      }
    }
  }

original_call:
  // Call original function / 원본 함수 호출
  if (original__android_log_print) {
    va_list args2;
    va_start(args2, fmt);
    int result = original__android_log_print(priority, tag, fmt, args2);
    va_end(args2);
    return result;
  }

  // Fallback: reconstruct message and call standard log / 폴백: 메시지 재구성 후 표준 로그 호출
  va_list args2;
  va_start(args2, fmt);
  char buffer2[4096];
  vsnprintf(buffer2, sizeof(buffer2), fmt, args2);
  va_end(args2);

  // Use direct syscall to avoid recursion / 재귀 방지를 위해 직접 syscall 사용
  return __android_log_buf_write(LOG_ID_MAIN, priority, tag, buffer2);
}

// Custom log write function / 커스텀 로그 write 함수
// React Native uses __android_log_write for ReactNativeJS logs / React Native는 ReactNativeJS 로그에 __android_log_write를 사용합니다
static int custom__android_log_write(int bufID, int priority, const char* tag, const char* text) {
  // IMPORTANT: This function should be called for ReactNativeJS logs / 중요: 이 함수는 ReactNativeJS 로그에 대해 호출되어야 합니다
  // If this function is never called, it means React Native is using a different logging mechanism / 이 함수가 호출되지 않으면 React Native가 다른 로깅 메커니즘을 사용하고 있다는 의미입니다

  // Debug: Log ALL tags to see what we're intercepting / 디버그: 인터셉트하는 모든 태그 로깅
  static int call_count = 0;
  static int reactnativejs_write_count = 0;
  // Check for ReactNativeJS or unknown:ReactNative tags / ReactNativeJS 또는 unknown:ReactNative 태그 확인
  bool is_reactnativejs = (tag && (strcmp(tag, "ReactNativeJS") == 0 ||
                                   strstr(tag, "ReactNative") != nullptr));

  // Log ALL calls with ReactNativeJS tag / ReactNativeJS 태그가 있는 모든 호출 로깅
  if (is_reactnativejs) {
    reactnativejs_write_count++;
    char debug_msg[512];
    snprintf(debug_msg, sizeof(debug_msg), "✅✅✅ FOUND ReactNativeJS #%d (write): priority=%d, msg=%.200s",
             reactnativejs_write_count, priority, text ? text : "(null)");
    // Use original to avoid recursion / 재귀 방지를 위해 원본 사용
    if (original__android_log_buf_write) {
      original__android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_INFO, "ChromeRemoteDevToolsHook", debug_msg);
    } else {
      __android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_INFO, "ChromeRemoteDevToolsHook", debug_msg);
    }
  }

  // Log ALL calls to see what we're intercepting / 인터셉트하는 모든 호출 로깅
  // This is critical to debug why ReactNativeJS logs are not intercepted / ReactNativeJS 로그가 인터셉트되지 않는 이유를 디버깅하기 위해 중요
  call_count++;
  if (call_count <= 1000) {
    char debug_msg[512];
    snprintf(debug_msg, sizeof(debug_msg), "Intercepted log (write) #%d: tag=%s, priority=%d, msg=%.100s",
             call_count, tag ? tag : "(null)", priority, text ? text : "(null)");
    // Use original to avoid recursion / 재귀 방지를 위해 원본 사용
    if (original__android_log_buf_write) {
      original__android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_DEBUG, "ChromeRemoteDevToolsHook", debug_msg);
    } else {
      __android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_DEBUG, "ChromeRemoteDevToolsHook", debug_msg);
    }
  }

  // Filter ReactNativeJS logs / ReactNativeJS 로그 필터링
  if (is_reactnativejs && text) {
    // Send to Java callback / Java 콜백으로 전송
    std::lock_guard<std::mutex> lock(g_callbackMutex);
    if (g_jvm && g_logCallback && g_onLogMethodID) {
      JNIEnv* env = nullptr;
      int getEnvStat = g_jvm->GetEnv((void**)&env, JNI_VERSION_1_6);

      if (getEnvStat == JNI_EDETACHED) {
        if (g_jvm->AttachCurrentThread(&env, nullptr) != 0) {
          goto original_call;
        }
      } else if (getEnvStat != JNI_OK) {
        goto original_call;
      }

      // Map Android log priority to level / Android 로그 우선순위를 레벨로 매핑
      int level = 4; // Default to INFO / 기본값은 INFO
      switch (priority) {
        case ANDROID_LOG_ERROR:
          level = 6; // Log.ERROR
          break;
        case ANDROID_LOG_WARN:
          level = 5; // Log.WARN
          break;
        case ANDROID_LOG_INFO:
          level = 4; // Log.INFO
          break;
        case ANDROID_LOG_DEBUG:
          level = 3; // Log.DEBUG
          break;
        default:
          level = 4; // Log.INFO
          break;
      }

      // Call Java callback / Java 콜백 호출
      jstring jtag = env->NewStringUTF(tag);
      jstring jmessage = env->NewStringUTF(text);
      env->CallVoidMethod(g_logCallback, g_onLogMethodID, level, jtag, jmessage);

      if (env->ExceptionCheck()) {
        env->ExceptionClear();
      }

      env->DeleteLocalRef(jtag);
      env->DeleteLocalRef(jmessage);

      if (getEnvStat == JNI_EDETACHED) {
        g_jvm->DetachCurrentThread();
      }
    }
  }

original_call:
  // Call original function / 원본 함수 호출
  if (original__android_log_write) {
    return original__android_log_write(bufID, priority, tag, text);
  }

  // Fallback: call original if available / 폴백: 사용 가능하면 원본 호출
  if (original__android_log_buf_write) {
    return original__android_log_buf_write(bufID, priority, tag, text);
  }

  // Last resort: direct call (should not happen) / 최후의 수단: 직접 호출 (발생하지 않아야 함)
  return __android_log_buf_write(bufID, priority, tag, text);
}

// Custom log buf_write function / 커스텀 로그 buf_write 함수
// React Native may use __android_log_buf_write directly / React Native가 __android_log_buf_write를 직접 사용할 수 있습니다
static int custom__android_log_buf_write(int bufID, int priority, const char* tag, const char* text) {
  // Debug: Log ALL tags to see what we're intercepting / 디버그: 인터셉트하는 모든 태그 로깅
  static int call_count = 0;
  static int reactnativejs_buf_count = 0;
  // Check for ReactNativeJS or unknown:ReactNative tags / ReactNativeJS 또는 unknown:ReactNative 태그 확인
  bool is_reactnativejs = (tag && (strcmp(tag, "ReactNativeJS") == 0 ||
                                   strstr(tag, "ReactNative") != nullptr));

  // Log ALL calls with ReactNativeJS tag / ReactNativeJS 태그가 있는 모든 호출 로깅
  if (is_reactnativejs) {
    reactnativejs_buf_count++;
    char debug_msg[512];
    snprintf(debug_msg, sizeof(debug_msg), "✅✅✅ FOUND ReactNativeJS #%d (buf_write): priority=%d, msg=%.200s",
             reactnativejs_buf_count, priority, text ? text : "(null)");
    // Use original to avoid recursion / 재귀 방지를 위해 원본 사용
    if (original__android_log_buf_write) {
      original__android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_INFO, "ChromeRemoteDevToolsHook", debug_msg);
    } else {
      __android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_INFO, "ChromeRemoteDevToolsHook", debug_msg);
    }
  }

  // Log first 1000 calls to see all tags / 모든 태그를 보기 위해 처음 1000개 호출 로깅
  // Increase limit to catch ReactNativeJS logs / ReactNativeJS 로그를 잡기 위해 제한 증가
  if (call_count++ < 1000) {
    char debug_msg[512];
    snprintf(debug_msg, sizeof(debug_msg), "Intercepted log (buf_write) #%d: tag=%s, priority=%d, msg=%.100s",
             call_count, tag ? tag : "(null)", priority, text ? text : "(null)");
    // Use original to avoid recursion / 재귀 방지를 위해 원본 사용
    if (original__android_log_buf_write) {
      original__android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_DEBUG, "ChromeRemoteDevToolsHook", debug_msg);
    } else {
      __android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_DEBUG, "ChromeRemoteDevToolsHook", debug_msg);
    }
  }

  // Filter ReactNativeJS logs / ReactNativeJS 로그 필터링
  if (is_reactnativejs && text) {
    // Send to Java callback / Java 콜백으로 전송
    std::lock_guard<std::mutex> lock(g_callbackMutex);
    if (g_jvm && g_logCallback && g_onLogMethodID) {
      JNIEnv* env = nullptr;
      int getEnvStat = g_jvm->GetEnv((void**)&env, JNI_VERSION_1_6);

      if (getEnvStat == JNI_EDETACHED) {
        if (g_jvm->AttachCurrentThread(&env, nullptr) != 0) {
          goto original_buf_write_call;
        }
      } else if (getEnvStat != JNI_OK) {
        goto original_buf_write_call;
      }

      int level = 4;
      switch (priority) {
        case ANDROID_LOG_ERROR:
          level = 6;
          break;
        case ANDROID_LOG_WARN:
          level = 5;
          break;
        case ANDROID_LOG_INFO:
          level = 4;
          break;
        case ANDROID_LOG_DEBUG:
          level = 3;
          break;
        default:
          level = 4;
          break;
      }

      jstring jtag = env->NewStringUTF(tag);
      jstring jmessage = env->NewStringUTF(text);
      env->CallVoidMethod(g_logCallback, g_onLogMethodID, level, jtag, jmessage);

      if (env->ExceptionCheck()) {
        env->ExceptionClear();
      }

      env->DeleteLocalRef(jtag);
      env->DeleteLocalRef(jmessage);

      if (getEnvStat == JNI_EDETACHED) {
        g_jvm->DetachCurrentThread();
      }
    }
  }

original_buf_write_call:
  // Call original function / 원본 함수 호출
  if (original__android_log_buf_write) {
    return original__android_log_buf_write(bufID, priority, tag, text);
  }

  // Fallback: should not happen / 폴백: 발생하지 않아야 함
  return __android_log_buf_write(bufID, priority, tag, text);
}

// JNI_OnLoad - called when library is loaded / 라이브러리가 로드될 때 호출됨
JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void* reserved) {
  // Store JVM reference / JVM 참조 저장
  g_jvm = vm;

  // Try to hook immediately when library loads / 라이브러리가 로드될 때 즉시 훅 시도
  // This ensures hooks are registered before React Native starts logging / 이를 통해 React Native가 로깅을 시작하기 전에 훅이 등록되도록 보장
  hookAndroidLog();

  char info_msg[256];
  snprintf(info_msg, sizeof(info_msg), "JNI_OnLoad: Hook registered early / JNI_OnLoad: 훅이 일찍 등록됨");
  __android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_INFO, TAG, info_msg);

  return JNI_VERSION_1_6;
}

// Hook Android Log using xhook / xhook을 사용하여 Android Log 훅
static bool hookAndroidLog() {
  if (g_is_hooked) {
    return true; // Already hooked / 이미 훅됨
  }

  // Register hooks for multiple Android log functions / 여러 Android 로그 함수 훅 등록
  // React Native may use different log functions / React Native는 다른 로그 함수를 사용할 수 있습니다
  int ret = 0;

  // Hook ALL libraries first (more aggressive approach) / 먼저 모든 라이브러리 훅 (더 공격적 접근)
  // This ensures we catch React Native even if it loads later / 이를 통해 React Native가 나중에 로드되어도 잡을 수 있습니다
  ret = xhook_register(".*\\.so$", "__android_log_print",
                       (void*)custom__android_log_print,
                       (void**)&original__android_log_print);

  if (ret != 0) {
    char error_msg[256];
    snprintf(error_msg, sizeof(error_msg),
             "Failed to register xhook for __android_log_print (ret=%d) / __android_log_print용 xhook 등록 실패 (ret=%d)", ret, ret);
    __android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_WARN, TAG, error_msg);
  }

  // Also try React Native specific libraries / React Native 특정 라이브러리도 시도
  // React Native uses libreactnativejni.so for logging / React Native는 로깅을 위해 libreactnativejni.so를 사용합니다
  // Also try Hermes libraries / Hermes 라이브러리도 시도
  const char* react_native_libs[] = {
    ".*libreactnativejni\\.so$",
    ".*libhermes\\.so$",
    ".*libhermesvm\\.so$",
    ".*libhermesexecutor\\.so$",
  };

  for (int i = 0; i < sizeof(react_native_libs) / sizeof(react_native_libs[0]); i++) {
    ret = xhook_register(react_native_libs[i], "__android_log_print",
                         (void*)custom__android_log_print,
                         (void**)&original__android_log_print);

    if (ret != 0) {
      char error_msg[256];
      snprintf(error_msg, sizeof(error_msg),
               "Failed to register xhook for __android_log_print in %s (ret=%d) / %s에서 __android_log_print용 xhook 등록 실패 (ret=%d)",
               react_native_libs[i], ret, react_native_libs[i], ret);
      __android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_DEBUG, TAG, error_msg);
    }
  }

  // Hook __android_log_write in ALL libraries first / 먼저 모든 라이브러리에서 __android_log_write 훅
  ret = xhook_register(".*\\.so$", "__android_log_write",
                       (void*)custom__android_log_write,
                       (void**)&original__android_log_write);

  if (ret != 0) {
    char error_msg[256];
    snprintf(error_msg, sizeof(error_msg),
             "Failed to register xhook for __android_log_write (ret=%d) / __android_log_write용 xhook 등록 실패 (ret=%d)", ret, ret);
    __android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_WARN, TAG, error_msg);
  } else {
    char success_msg[256];
    snprintf(success_msg, sizeof(success_msg),
             "Successfully registered xhook for __android_log_write / __android_log_write용 xhook 등록 성공");
    __android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_DEBUG, TAG, success_msg);
  }

  // Also try React Native specific libraries / React Native 특정 라이브러리도 시도
  for (int i = 0; i < sizeof(react_native_libs) / sizeof(react_native_libs[0]); i++) {
    ret = xhook_register(react_native_libs[i], "__android_log_write",
                         (void*)custom__android_log_write,
                         (void**)&original__android_log_write);

    if (ret != 0) {
      char error_msg[256];
      snprintf(error_msg, sizeof(error_msg),
               "Failed to register xhook for __android_log_write in %s (ret=%d) / %s에서 __android_log_write용 xhook 등록 실패 (ret=%d)",
               react_native_libs[i], ret, react_native_libs[i], ret);
      __android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_DEBUG, TAG, error_msg);
    }
  }

  // Hook __android_log_buf_write in ALL libraries first / 먼저 모든 라이브러리에서 __android_log_buf_write 훅
  // React Native may use this function directly / React Native가 이 함수를 직접 사용할 수 있습니다
  ret = xhook_register(".*\\.so$", "__android_log_buf_write",
                       (void*)custom__android_log_buf_write,
                       (void**)&original__android_log_buf_write);

  if (ret != 0) {
    char error_msg[256];
    snprintf(error_msg, sizeof(error_msg),
             "Failed to register xhook for __android_log_buf_write (ret=%d) / __android_log_buf_write용 xhook 등록 실패 (ret=%d)", ret, ret);
    __android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_WARN, TAG, error_msg);
  }

  // Also try React Native specific libraries / React Native 특정 라이브러리도 시도
  for (int i = 0; i < sizeof(react_native_libs) / sizeof(react_native_libs[0]); i++) {
    ret = xhook_register(react_native_libs[i], "__android_log_buf_write",
                         (void*)custom__android_log_buf_write,
                         (void**)&original__android_log_buf_write);

    if (ret != 0) {
      char error_msg[256];
      snprintf(error_msg, sizeof(error_msg),
               "Failed to register xhook for __android_log_buf_write in %s (ret=%d) / %s에서 __android_log_buf_write용 xhook 등록 실패 (ret=%d)",
               react_native_libs[i], ret, react_native_libs[i], ret);
      __android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_DEBUG, TAG, error_msg);
    }
  }

  // Apply hooks synchronously first / 먼저 동기적으로 훅 적용
  ret = xhook_refresh(0);

  if (ret != 0) {
    char error_msg[256];
    snprintf(error_msg, sizeof(error_msg), "Failed to refresh xhook (ret=%d) / xhook 새로고침 실패 (ret=%d)", ret, ret);
    __android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_ERROR, TAG, error_msg);
    return false;
  }

  // Also refresh asynchronously to catch any libraries loaded later / 나중에 로드된 라이브러리를 잡기 위해 비동기로도 새로고침
  ret = xhook_refresh(1);

  if (ret != 0) {
    char error_msg[256];
    snprintf(error_msg, sizeof(error_msg), "Failed to refresh xhook async (ret=%d) / xhook 비동기 새로고침 실패 (ret=%d)", ret, ret);
    __android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_WARN, TAG, error_msg);
  }

  g_is_hooked = true;

  // Use direct syscall to avoid recursion / 재귀 방지를 위해 직접 syscall 사용
  char success_msg[512];
  snprintf(success_msg, sizeof(success_msg),
           "xhook registered successfully for Android Log functions / Android Log 함수용 xhook 등록 성공\n"
           "Hooked functions: __android_log_print, __android_log_write, __android_log_buf_write\n"
           "Target libraries: all .so files + React Native specific libraries");
  __android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_INFO, TAG, success_msg);

  return true;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_com_ohah_chromeremotedevtools_ChromeRemoteDevToolsLogHookJNI_nativeHookReactLog(
    JNIEnv *env,
    jobject thiz,
    jobject callback) {
  try {
    // Store JVM reference / JVM 참조 저장
    if (env->GetJavaVM(&g_jvm) != JNI_OK) {
      // Use direct syscall to avoid recursion / 재귀 방지를 위해 직접 syscall 사용
      __android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_ERROR, TAG,
                              "Failed to get JavaVM / JavaVM 가져오기 실패");
      return JNI_FALSE;
    }

    // Store callback reference / 콜백 참조 저장
    {
      std::lock_guard<std::mutex> lock(g_callbackMutex);
      if (g_logCallback) {
        env->DeleteGlobalRef(g_logCallback);
      }
      g_logCallback = env->NewGlobalRef(callback);

      if (!g_logCallback) {
        // Use direct syscall to avoid recursion / 재귀 방지를 위해 직접 syscall 사용
        __android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_ERROR, TAG,
                                "Failed to create global ref for callback / 콜백용 글로벌 참조 생성 실패");
        return JNI_FALSE;
      }

      // Get method ID for onLog callback / onLog 콜백용 메서드 ID 가져오기
      jclass callbackClass = env->GetObjectClass(callback);
      g_onLogMethodID = env->GetMethodID(callbackClass, "onLog", "(ILjava/lang/String;Ljava/lang/String;)V");
      env->DeleteLocalRef(callbackClass);

      if (!g_onLogMethodID) {
        // Use direct syscall to avoid recursion / 재귀 방지를 위해 직접 syscall 사용
        __android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_ERROR, TAG,
                                "Failed to find onLog method / onLog 메서드를 찾을 수 없음");
        env->DeleteGlobalRef(g_logCallback);
        g_logCallback = nullptr;
        return JNI_FALSE;
      }
    }

    // Try to hook Android Log / Android Log 훅 시도
    // Call hookAndroidLog outside of mutex lock to avoid deadlock / 데드락 방지를 위해 뮤텍스 잠금 밖에서 hookAndroidLog 호출
    // Try hooking again in case React Native loaded after JNI_OnLoad / JNI_OnLoad 이후에 React Native가 로드된 경우를 대비해 다시 훅 시도

    // Clear previous hooks and re-register / 이전 훅을 지우고 다시 등록
    if (g_is_hooked) {
      xhook_clear();
      g_is_hooked = false;
      original__android_log_print = nullptr;
      original__android_log_write = nullptr;
      original__android_log_buf_write = nullptr;
    }

    bool hooked = hookAndroidLog();

    if (hooked) {
      char success_msg[256];
      snprintf(success_msg, sizeof(success_msg), "ReactLog hook successful (retry) / ReactLog 훅 성공 (재시도)");
      __android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_INFO, TAG, success_msg);

      // Force refresh hooks again after a short delay / 짧은 지연 후 훅을 다시 강제로 새로고침
      // This ensures hooks are applied to already-loaded libraries / 이를 통해 이미 로드된 라이브러리에 훅이 적용되도록 보장
      xhook_refresh(0);
      xhook_refresh(1);
    } else {
      char error_msg[256];
      snprintf(error_msg, sizeof(error_msg), "ReactLog hook failed (retry) / ReactLog 훅 실패 (재시도)");
      __android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_ERROR, TAG, error_msg);
    }

    return hooked ? JNI_TRUE : JNI_FALSE;
  } catch (...) {
    // Use direct syscall to avoid recursion / 재귀 방지를 위해 직접 syscall 사용
    __android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_ERROR, TAG,
                            "Exception in nativeHookReactLog / nativeHookReactLog에서 예외 발생");
    return JNI_FALSE;
  }
}

extern "C" JNIEXPORT void JNICALL
Java_com_ohah_chromeremotedevtools_ChromeRemoteDevToolsLogHookJNI_nativeUnhookReactLog(
    JNIEnv *env,
    jobject thiz) {
  try {
    std::lock_guard<std::mutex> lock(g_callbackMutex);

    if (g_logCallback) {
      env->DeleteGlobalRef(g_logCallback);
      g_logCallback = nullptr;
    }

    g_onLogMethodID = nullptr;

    // Clear xhook cache / xhook 캐시 지우기
    if (g_is_hooked) {
      xhook_clear();
      g_is_hooked = false;
    }

    original__android_log_print = nullptr;
    original__android_log_write = nullptr;
    original__android_log_buf_write = nullptr;

    // Use direct syscall to avoid recursion / 재귀 방지를 위해 직접 syscall 사용
    __android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_INFO, TAG,
                            "ReactLog unhooked / ReactLog 언훅됨");
  } catch (...) {
    // Use direct syscall to avoid recursion / 재귀 방지를 위해 직접 syscall 사용
    __android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_ERROR, TAG,
                            "Exception in nativeUnhookReactLog / nativeUnhookReactLog에서 예외 발생");
  }
}
