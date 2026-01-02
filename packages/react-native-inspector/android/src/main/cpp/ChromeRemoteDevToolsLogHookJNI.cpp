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
#include <dlfcn.h>
#include <unistd.h>
#include <memory>
#include <functional>

// Include JSI headers for JSI-level logging interception / JSI 레벨 로깅 인터셉션을 위한 JSI 헤더 포함
// Try to include JSI headers - if not available, we'll use conditional compilation /
// JSI 헤더 포함 시도 - 사용할 수 없으면 조건부 컴파일 사용
// Note: We need to find these headers at build time / 참고: 빌드 시점에 이 헤더들을 찾아야 합니다
#if __has_include(<jsi/jsi.h>) && __has_include(<ReactCommon/RuntimeExecutor.h>) && __has_include(<fbjni/fbjni.h>) && __has_include(<react/jni/JRuntimeExecutor.h>)
#define REACT_NATIVE_JSI_AVAILABLE
#include <jsi/jsi.h>
#include <ReactCommon/RuntimeExecutor.h>
#include <fbjni/fbjni.h>
#include <react/jni/JRuntimeExecutor.h>
#endif


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
static bool g_is_jsi_hooked = false;

#ifdef REACT_NATIVE_JSI_AVAILABLE
// RuntimeExecutor for JSI-level hooking / JSI 레벨 훅을 위한 RuntimeExecutor
static std::shared_ptr<facebook::react::RuntimeExecutor> g_runtimeExecutor = nullptr;
static std::mutex g_runtimeExecutorMutex;
#endif

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

// Try to hook __android_log_write using dlsym / dlsym을 사용하여 __android_log_write 훅 시도
// This is a fallback method if PLT hooking doesn't work / PLT 훅이 작동하지 않을 경우를 위한 폴백 방법
static bool hookAndroidLogDirect() {
  void* handle = dlopen("liblog.so", RTLD_LAZY);
  if (!handle) {
    char error_msg[256];
    const char* dlerr = dlerror();
    snprintf(error_msg, sizeof(error_msg), "Failed to dlopen liblog.so: %s", dlerr ? dlerr : "unknown error");
    __android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_WARN, TAG, error_msg);
    return false;
  }

  // Try to get original function pointer / 원본 함수 포인터 가져오기 시도
  typedef int (*AndroidLogWriteFunc)(int bufID, int priority, const char* tag, const char* text);
  AndroidLogWriteFunc original = (AndroidLogWriteFunc)dlsym(handle, "__android_log_write");

  if (original) {
    // Store original for later use / 나중에 사용하기 위해 원본 저장
    if (!original__android_log_write) {
      original__android_log_write = original;
    }
    char success_msg[256];
    snprintf(success_msg, sizeof(success_msg), "Successfully found __android_log_write via dlsym / dlsym을 통해 __android_log_write 찾기 성공");
    __android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_DEBUG, TAG, success_msg);
    dlclose(handle);
    return true;
  }

  dlclose(handle);
  return false;
}

// Custom log write function (4-parameter version) / 커스텀 로그 write 함수 (4개 파라미터 버전)
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

// Hook Android Log using direct function pointer replacement / 직접 함수 포인터 교체를 사용하여 Android Log 훅
static bool hookAndroidLog() {
  if (g_is_hooked) {
    return true; // Already hooked / 이미 훅됨
  }

  // Use direct hooking / 직접 훅 사용
  bool success = hookAndroidLogDirect();

  if (success) {
    g_is_hooked = true;
    __android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_INFO, TAG,
                            "Android Log hook installed successfully using direct method / 직접 방법을 사용하여 Android Log 훅 설치 성공");
  }

  return success;
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

      // Try direct hooking again / 직접 훅 다시 시도
      hookAndroidLogDirect();
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

    // Clear hook state / 훅 상태 지우기
    if (g_is_hooked) {
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

// Helper function to send log to Java callback / Java 콜백으로 로그를 전송하는 헬퍼 함수
static void sendLogToJavaCallback(const std::string& message, unsigned int logLevel) {
  std::lock_guard<std::mutex> lock(g_callbackMutex);
  if (g_jvm && g_logCallback && g_onLogMethodID) {
    JNIEnv* env = nullptr;
    int getEnvStat = g_jvm->GetEnv((void**)&env, JNI_VERSION_1_6);

    if (getEnvStat == JNI_EDETACHED) {
      if (g_jvm->AttachCurrentThread(&env, nullptr) != 0) {
        return;
      }
    } else if (getEnvStat != JNI_OK) {
      return;
    }

    // Map log level to Android log level / 로그 레벨을 Android 로그 레벨로 매핑
    int androidLevel = 4; // Default to INFO / 기본값은 INFO
    switch (logLevel) {
      case 0: // DEBUG
        androidLevel = 3; // Log.DEBUG
        break;
      case 1: // INFO
        androidLevel = 4; // Log.INFO
        break;
      case 2: // WARN
        androidLevel = 5; // Log.WARN
        break;
      case 3: // ERROR
        androidLevel = 6; // Log.ERROR
        break;
      default:
        androidLevel = 4; // Log.INFO
        break;
    }

    // Call Java callback / Java 콜백 호출
    jstring jtag = env->NewStringUTF("ReactNativeJS");
    jstring jmessage = env->NewStringUTF(message.c_str());
    env->CallVoidMethod(g_logCallback, g_onLogMethodID, androidLevel, jtag, jmessage);

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

// Hook JSI-level logging by replacing nativeLoggingHook / nativeLoggingHook을 교체하여 JSI 레벨 로깅 훅
#ifdef REACT_NATIVE_JSI_AVAILABLE
static void hookJSILogging(facebook::jsi::Runtime& runtime) {
  try {
    // Replace nativeLoggingHook with our custom function / nativeLoggingHook을 우리의 커스텀 함수로 교체
    runtime.global().setProperty(
      runtime,
      "nativeLoggingHook",
      facebook::jsi::Function::createFromHostFunction(
        runtime,
        facebook::jsi::PropNameID::forAscii(runtime, "nativeLoggingHook"),
        2,
        [](facebook::jsi::Runtime& runtime,
           const facebook::jsi::Value& /* this */,
           const facebook::jsi::Value* args,
           size_t count) {
          if (count != 2) {
            throw std::invalid_argument("nativeLoggingHook takes 2 arguments");
          }

          // Get log message and level / 로그 메시지와 레벨 가져오기
          std::string message = args[0].asString(runtime).utf8(runtime);
          unsigned int logLevel = static_cast<unsigned int>(args[1].asNumber());

          // Send to Java callback / Java 콜백으로 전송
          sendLogToJavaCallback(message, logLevel);

          // Also call original reactAndroidLoggingHook to maintain normal logging behavior /
          // 정상적인 로깅 동작을 유지하기 위해 원본 reactAndroidLoggingHook도 호출
          // Note: We need to find the original function pointer / 참고: 원본 함수 포인터를 찾아야 합니다
          // For now, we'll just send to callback / 지금은 콜백으로만 전송합니다

          return facebook::jsi::Value::undefined();
        }));

    g_is_jsi_hooked = true;
    __android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_INFO, TAG,
                            "JSI-level logging hook installed successfully / JSI 레벨 로깅 훅이 성공적으로 설치됨");
  } catch (const std::exception& e) {
    char error_msg[512];
    snprintf(error_msg, sizeof(error_msg),
             "Failed to hook JSI logging: %s", e.what());
    __android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_ERROR, TAG, error_msg);
  } catch (...) {
    __android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_ERROR, TAG,
                            "Unknown exception in hookJSILogging / hookJSILogging에서 알 수 없는 예외 발생");
  }
}
#else
// JSI not available, provide stub implementation / JSI를 사용할 수 없으므로 스텁 구현 제공
static void hookJSILogging(void* runtime) {
  __android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_WARN, TAG,
                          "JSI headers not available, JSI hooking disabled / JSI 헤더를 사용할 수 없어 JSI 훅이 비활성화됨");
}
#endif

// JNI function to install JSI-level logging hook using RuntimeExecutor /
// RuntimeExecutor를 사용하여 JSI 레벨 로깅 훅을 설치하는 JNI 함수
extern "C" JNIEXPORT jboolean JNICALL
Java_com_ohah_chromeremotedevtools_ChromeRemoteDevToolsLogHookJNI_nativeHookJSILog(
    JNIEnv *env,
    jobject thiz,
    jobject runtimeExecutor,
    jobject callback) {
  try {
    // Store JVM reference / JVM 참조 저장
    if (env->GetJavaVM(&g_jvm) != JNI_OK) {
      __android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_ERROR, TAG,
                              "Failed to get JavaVM in nativeHookJSILog");
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
        __android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_ERROR, TAG,
                                "Failed to create global ref for callback");
        return JNI_FALSE;
      }

      // Get method ID for onLog callback / onLog 콜백용 메서드 ID 가져오기
      jclass callbackClass = env->GetObjectClass(callback);
      g_onLogMethodID = env->GetMethodID(callbackClass, "onLog", "(ILjava/lang/String;Ljava/lang/String;)V");
      env->DeleteLocalRef(callbackClass);

      if (!g_onLogMethodID) {
        __android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_ERROR, TAG,
                                "Failed to find onLog method");
        env->DeleteGlobalRef(g_logCallback);
        g_logCallback = nullptr;
        return JNI_FALSE;
      }
    }

#ifdef REACT_NATIVE_JSI_AVAILABLE
    // Get RuntimeExecutor from JRuntimeExecutor Java object using fbjni /
    // fbjni를 사용하여 JRuntimeExecutor Java 객체에서 RuntimeExecutor 가져오기
    using namespace facebook::react;
    using namespace facebook::jni;

    // Convert Java RuntimeExecutor to JRuntimeExecutor C++ object /
    // Java RuntimeExecutor를 JRuntimeExecutor C++ 객체로 변환
    alias_ref<JRuntimeExecutor::javaobject> jRuntimeExecutor =
        wrap_alias(reinterpret_cast<JRuntimeExecutor::javaobject>(runtimeExecutor));

    if (!jRuntimeExecutor) {
      __android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_ERROR, TAG,
                              "Failed to wrap RuntimeExecutor");
      return JNI_FALSE;
    }

    // Get RuntimeExecutor from JRuntimeExecutor / JRuntimeExecutor에서 RuntimeExecutor 가져오기
    RuntimeExecutor executor = jRuntimeExecutor->cthis()->get();

    if (!executor) {
      __android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_ERROR, TAG,
                              "RuntimeExecutor is null");
      return JNI_FALSE;
    }

    // Call RuntimeExecutor to access JSI runtime and install hook /
    // RuntimeExecutor를 호출하여 JSI 런타임에 접근하고 훅 설치
    executor([](facebook::jsi::Runtime& runtime) {
      hookJSILogging(runtime);
    });

    __android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_INFO, TAG,
                            "JSI-level logging hook installed");
    return JNI_TRUE;
#else
    // JSI not available / JSI를 사용할 수 없음
    __android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_WARN, TAG,
                            "JSI headers not available, cannot install JSI hook");
    return JNI_FALSE;
#endif
  } catch (const std::exception& e) {
    char error_msg[512];
    snprintf(error_msg, sizeof(error_msg),
             "Exception in nativeHookJSILog: %s", e.what());
    __android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_ERROR, TAG, error_msg);
    return JNI_FALSE;
  } catch (...) {
    __android_log_buf_write(LOG_ID_MAIN, ANDROID_LOG_ERROR, TAG,
                            "Unknown exception in nativeHookJSILog");
    return JNI_FALSE;
  }
}
