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
#include <vector>
#include <future>
#include <chrono>
#include <memory>

// Include JSI headers for JSI-level logging interception / JSI 레벨 로깅 인터셉션을 위한 JSI 헤더 포함
#if __has_include(<jsi/jsi.h>) && __has_include(<ReactCommon/RuntimeExecutor.h>) && __has_include(<fbjni/fbjni.h>) && __has_include(<react/jni/JRuntimeExecutor.h>)
#define REACT_NATIVE_JSI_AVAILABLE
#include <jsi/jsi.h>
#include <ReactCommon/RuntimeExecutor.h>
#include <fbjni/fbjni.h>
#include <react/jni/JRuntimeExecutor.h>
#endif

// -----------------------------------------------------------------------------
// Android: C++ console/network hooks are EXCLUDED from build / Android: C++ 콘솔·네트워크 훅은 빌드에서 제외됨
// -----------------------------------------------------------------------------
// Console/network hooks are JavaScript-only (src/console/, src/network/). C++ JSI
// (cpp/ConsoleHook.*, cpp/NetworkHook.*, cpp/console/, cpp/network/) is deprecated
// and not linked here; only this JNI file is built. JNI for console/network are stubs (return false/nullptr).
// 콘솔·네트워크 훅은 JavaScript 전용. C++ JSI는 디프리케이트되어 여기서 링크하지 않음. 콘솔·네트워크 JNI는 스텁.
// -----------------------------------------------------------------------------

#define TAG "ChromeRemoteDevToolsLogHookJNI"

// Global JNI environment / 전역 JNI 환경
static JavaVM* g_jvm = nullptr;
static bool g_is_jsi_hooked = false;

// Global RuntimeExecutor for Runtime.getProperties / Runtime.getProperties를 위한 전역 RuntimeExecutor
#ifdef REACT_NATIVE_JSI_AVAILABLE
static facebook::react::RuntimeExecutor g_runtimeExecutor = nullptr;
static std::mutex g_runtimeExecutorMutex;
#endif

// JNI callback implementation for Android / Android용 JNI 콜백 구현
void sendCDPMessageAndroid(const char* serverHost, int serverPort, const char* message) {
  if (g_jvm == nullptr) {
    __android_log_print(ANDROID_LOG_ERROR, TAG,
                        "JVM not available for sending CDP message / CDP 메시지 전송을 위한 JVM을 사용할 수 없습니다");
    return;
  }

  JNIEnv* env = nullptr;
  bool attached = false;

  // Attach current thread to JVM if needed / 필요시 현재 스레드를 JVM에 연결
  int status = g_jvm->GetEnv(reinterpret_cast<void**>(&env), JNI_VERSION_1_6);
  if (status == JNI_EDETACHED) {
    if (g_jvm->AttachCurrentThread(&env, nullptr) != JNI_OK) {
      __android_log_print(ANDROID_LOG_ERROR, TAG,
                          "Failed to attach thread to JVM / 스레드를 JVM에 연결하지 못했습니다");
      return;
    }
    attached = true;
  } else if (status != JNI_OK) {
    __android_log_print(ANDROID_LOG_ERROR, TAG,
                        "Failed to get JNI environment / JNI 환경을 가져오지 못했습니다");
    return;
  }

  try {
    // Get class reference / 클래스 참조 가져오기
    jclass clazz = env->FindClass("com/ohah/chromeremotedevtools/ChromeRemoteDevToolsLogHookJNI");
    if (clazz == nullptr) {
      __android_log_print(ANDROID_LOG_ERROR, TAG,
                          "Failed to find ChromeRemoteDevToolsLogHookJNI class / ChromeRemoteDevToolsLogHookJNI 클래스를 찾지 못했습니다");
      if (attached) {
        g_jvm->DetachCurrentThread();
      }
      return;
    }

    // Get method ID / 메서드 ID 가져오기
    jmethodID methodId = env->GetStaticMethodID(
        clazz,
        "sendCDPMessageFromNative",
        "(Ljava/lang/String;ILjava/lang/String;)V");

    if (methodId == nullptr) {
      __android_log_print(ANDROID_LOG_ERROR, TAG,
                          "Failed to find sendCDPMessageFromNative method / sendCDPMessageFromNative 메서드를 찾지 못했습니다");
      env->DeleteLocalRef(clazz);
      if (attached) {
        g_jvm->DetachCurrentThread();
      }
      return;
    }

    // Convert C++ strings to Java strings / C++ 문자열을 Java 문자열로 변환
    jstring jServerHost = env->NewStringUTF(serverHost);
    jstring jMessage = env->NewStringUTF(message);

    if (jServerHost == nullptr || jMessage == nullptr) {
      __android_log_print(ANDROID_LOG_ERROR, TAG,
                          "Failed to create Java strings / Java 문자열을 생성하지 못했습니다");
      if (jServerHost != nullptr) env->DeleteLocalRef(jServerHost);
      if (jMessage != nullptr) env->DeleteLocalRef(jMessage);
      env->DeleteLocalRef(clazz);
      if (attached) {
        g_jvm->DetachCurrentThread();
      }
      return;
    }

    // Call the Kotlin function / Kotlin 함수 호출
    env->CallStaticVoidMethod(clazz, methodId, jServerHost, serverPort, jMessage);

    // Check for exceptions / 예외 확인
    if (env->ExceptionCheck()) {
      env->ExceptionDescribe();
      env->ExceptionClear();
    }

    // Clean up local references / 로컬 참조 정리
    env->DeleteLocalRef(jServerHost);
    env->DeleteLocalRef(jMessage);
    env->DeleteLocalRef(clazz);

    __android_log_print(ANDROID_LOG_DEBUG, TAG,
                        "CDP message sent via JNI / JNI를 통해 CDP 메시지 전송됨");
  } catch (const std::exception& e) {
    __android_log_print(ANDROID_LOG_ERROR, TAG,
                        "Exception in sendCDPMessageAndroid: %s", e.what());
  } catch (...) {
    __android_log_print(ANDROID_LOG_ERROR, TAG,
                        "Unknown exception in sendCDPMessageAndroid / sendCDPMessageAndroid에서 알 수 없는 예외 발생");
  }

  // Detach thread if we attached it / 연결한 경우 스레드 분리
  if (attached) {
    g_jvm->DetachCurrentThread();
  }
}

// Console/network hooks are JS-only; no C++ hooking / 콘솔·네트워크 훅은 JS 전용, C++ 훅 없음
#ifdef REACT_NATIVE_JSI_AVAILABLE
static void hookJSILogging(facebook::jsi::Runtime& /* runtime */) {
  __android_log_print(ANDROID_LOG_INFO, TAG,
                      "Console/network hooks use JavaScript layer (src/console, src/network); native JSI hooks skipped / 콘솔·네트워크 훅은 JavaScript 레이어 사용, 네이티브 JSI 훅 건너뜀");
}
#else
static void hookJSILogging(void* /* runtime */) {
  __android_log_print(ANDROID_LOG_WARN, TAG,
                      "JSI headers not available / JSI 헤더를 사용할 수 없음");
}
#endif

// JNI function to install JSI-level logging hook using RuntimeExecutor /
// RuntimeExecutor를 사용하여 JSI 레벨 로깅 훅을 설치하는 JNI 함수
extern "C" JNIEXPORT jboolean JNICALL
Java_com_ohah_chromeremotedevtools_ChromeRemoteDevToolsLogHookJNI_nativeHookJSILog(
    JNIEnv *env,
    jobject /* thiz */,
    jobject runtimeExecutor) {
  __android_log_print(ANDROID_LOG_INFO, TAG,
                      "nativeHookJSILog called / nativeHookJSILog 호출됨");
  try {
    // Store JVM reference / JVM 참조 저장
    if (env->GetJavaVM(&g_jvm) != JNI_OK) {
      __android_log_print(ANDROID_LOG_ERROR, TAG,
                              "Failed to get JavaVM in nativeHookJSILog");
      return JNI_FALSE;
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
      __android_log_print(ANDROID_LOG_ERROR, TAG,
                              "Failed to wrap RuntimeExecutor");
      return JNI_FALSE;
    }

    // Get RuntimeExecutor from JRuntimeExecutor / JRuntimeExecutor에서 RuntimeExecutor 가져오기
    RuntimeExecutor executor = jRuntimeExecutor->cthis()->get();

    if (!executor) {
      __android_log_print(ANDROID_LOG_ERROR, TAG,
                              "RuntimeExecutor is null");
      return JNI_FALSE;
    }

    // Store RuntimeExecutor for later use / 나중에 사용하기 위해 RuntimeExecutor 저장
    {
      std::lock_guard<std::mutex> lock(g_runtimeExecutorMutex);
      g_runtimeExecutor = executor;
    }

    // Call RuntimeExecutor to access JSI runtime and install hook /
    // RuntimeExecutor를 호출하여 JSI 런타임에 접근하고 훅 설치
    __android_log_print(ANDROID_LOG_INFO, TAG,
                        "Calling RuntimeExecutor to install JSI hooks / JSI 훅을 설치하기 위해 RuntimeExecutor 호출 중");
    executor([](facebook::jsi::Runtime& runtime) {
      __android_log_print(ANDROID_LOG_INFO, TAG,
                          "RuntimeExecutor callback called, installing hooks / RuntimeExecutor 콜백 호출됨, 훅 설치 중");
      hookJSILogging(runtime);
      __android_log_print(ANDROID_LOG_INFO, TAG,
                          "RuntimeExecutor callback completed / RuntimeExecutor 콜백 완료");
    });

    __android_log_print(ANDROID_LOG_INFO, TAG,
                            "JSI-level logging hook installation initiated / JSI 레벨 로깅 훅 설치 시작됨");
    return JNI_TRUE;
#else
    // JSI not available / JSI를 사용할 수 없음
    __android_log_print(ANDROID_LOG_WARN, TAG,
                            "JSI headers not available, cannot install JSI hook");
    return JNI_FALSE;
#endif
  } catch (const std::exception& e) {
    __android_log_print(ANDROID_LOG_ERROR, TAG,
             "Exception in nativeHookJSILog: %s", e.what());
    return JNI_FALSE;
  } catch (...) {
    __android_log_print(ANDROID_LOG_ERROR, TAG,
                            "Unknown exception in nativeHookJSILog");
    return JNI_FALSE;
  }
}

// JNI function to enable console hook (stub: JS-only layer) / console 훅 활성화 (스텁: JS 전용 레이어)
extern "C" JNIEXPORT jboolean JNICALL
Java_com_ohah_chromeremotedevtools_ChromeRemoteDevToolsLogHookJNI_nativeEnableConsoleHook(
    JNIEnv * /* env */,
    jobject /* thiz */,
    jobject /* runtimeExecutor */) {
  return JNI_FALSE;
}

// JNI function to disable console hook (stub: JS-only layer) / console 훅 비활성화 (스텁: JS 전용 레이어)
extern "C" JNIEXPORT jboolean JNICALL
Java_com_ohah_chromeremotedevtools_ChromeRemoteDevToolsLogHookJNI_nativeDisableConsoleHook(
    JNIEnv * /* env */,
    jobject /* thiz */,
    jobject /* runtimeExecutor */) {
  return JNI_FALSE;
}

// JNI function to enable network hook (stub: JS-only layer) / 네트워크 훅 활성화 (스텁: JS 전용 레이어)
extern "C" JNIEXPORT jboolean JNICALL
Java_com_ohah_chromeremotedevtools_ChromeRemoteDevToolsLogHookJNI_nativeEnableNetworkHook(
    JNIEnv * /* env */,
    jobject /* thiz */,
    jobject /* runtimeExecutor */) {
  return JNI_FALSE;
}

// JNI function to disable network hook (stub: JS-only layer) / 네트워크 훅 비활성화 (스텁: JS 전용 레이어)
extern "C" JNIEXPORT jboolean JNICALL
Java_com_ohah_chromeremotedevtools_ChromeRemoteDevToolsLogHookJNI_nativeDisableNetworkHook(
    JNIEnv * /* env */,
    jobject /* thiz */,
    jobject /* runtimeExecutor */) {
  return JNI_FALSE;
}

// JNI function to check if console hook is enabled (stub: JS-only layer) / console 훅 활성화 여부 (스텁: JS 전용 레이어)
extern "C" JNIEXPORT jboolean JNICALL
Java_com_ohah_chromeremotedevtools_ChromeRemoteDevToolsLogHookJNI_nativeIsConsoleHookEnabled(
    JNIEnv * /* env */,
    jobject /* thiz */,
    jobject /* runtimeExecutor */) {
  return JNI_FALSE;
}

// JNI function to check if network hook is enabled (stub: JS-only layer) / 네트워크 훅 활성화 여부 (스텁: JS 전용 레이어)
extern "C" JNIEXPORT jboolean JNICALL
Java_com_ohah_chromeremotedevtools_ChromeRemoteDevToolsLogHookJNI_nativeIsNetworkHookEnabled(
    JNIEnv * /* env */,
    jobject /* thiz */,
    jobject /* runtimeExecutor */) {
  return JNI_FALSE;
}

// JNI function to get network response body (stub: JS-only layer) / 네트워크 응답 본문 (스텁: JS 전용 레이어)
extern "C" JNIEXPORT jstring JNICALL
Java_com_ohah_chromeremotedevtools_ChromeRemoteDevToolsLogHookJNI_nativeGetNetworkResponseBody(
    JNIEnv * /* env */,
    jobject /* thiz */,
    jstring /* requestId */) {
  return nullptr;
}

// JNI function to get object properties (stub: JS-only layer) / 객체 속성 (스텁: JS 전용 레이어)
extern "C" JNIEXPORT jstring JNICALL
Java_com_ohah_chromeremotedevtools_ChromeRemoteDevToolsLogHookJNI_nativeGetObjectProperties(
    JNIEnv * /* env */,
    jobject /* thiz */,
    jstring /* objectId */) {
  return nullptr;
}

// Note: nativeSetReduxDevToolsServerInfo was removed / nativeSetReduxDevToolsServerInfo 제거됨
// Redux DevTools Extension server info is now set via JavaScript polyfill / Redux DevTools Extension 서버 정보는 이제 JavaScript polyfill을 통해 설정됩니다

// JNI function to handle CDP message from WebSocket using JSI / JSI를 사용하여 WebSocket에서 CDP 메시지를 처리하는 JNI 함수
// This is the Android equivalent of iOS handleCDPMessage: method / 이것은 iOS handleCDPMessage: 메서드와 동등한 Android 버전입니다
extern "C" JNIEXPORT void JNICALL
Java_com_ohah_chromeremotedevtools_ChromeRemoteDevToolsLogHookJNI_nativeHandleCDPMessage(
    JNIEnv *env,
    jobject /* thiz */,
    jstring messageJson) {
#ifdef REACT_NATIVE_JSI_AVAILABLE
  try {
    if (!messageJson) {
      __android_log_print(ANDROID_LOG_WARN, TAG,
                          "nativeHandleCDPMessage: messageJson is null / messageJson이 null입니다");
      return;
    }

    // Get RuntimeExecutor from stored reference / 저장된 참조에서 RuntimeExecutor 가져오기
    facebook::react::RuntimeExecutor executor = nullptr;
    {
      std::lock_guard<std::mutex> lock(g_runtimeExecutorMutex);
      executor = g_runtimeExecutor;
    }

    if (!executor) {
      __android_log_print(ANDROID_LOG_WARN, TAG,
                          "nativeHandleCDPMessage: RuntimeExecutor not available / RuntimeExecutor를 사용할 수 없음");
      return;
    }

    // Convert Java string to C++ string / Java 문자열을 C++ 문자열로 변환
    const char* messageStr = env->GetStringUTFChars(messageJson, nullptr);
    if (!messageStr) {
      __android_log_print(ANDROID_LOG_ERROR, TAG,
                          "nativeHandleCDPMessage: Failed to get string UTF chars / 문자열 UTF 문자를 가져오지 못함");
      return;
    }

    std::string messageCpp(messageStr);
    env->ReleaseStringUTFChars(messageJson, messageStr);

    __android_log_print(ANDROID_LOG_DEBUG, TAG,
                        "nativeHandleCDPMessage: Calling JavaScript handler via JSI / JSI를 통해 JavaScript 핸들러 호출 중");

    // Call JavaScript handler via RuntimeExecutor / RuntimeExecutor를 통해 JavaScript 핸들러 호출
    executor([messageCpp](facebook::jsi::Runtime& runtime) {
      try {
        // Get global object / 전역 객체 가져오기
        facebook::jsi::Object global = runtime.global();

        // Try to get handler from window or global / window 또는 global에서 핸들러 가져오기 시도
        facebook::jsi::Value handlerValue = facebook::jsi::Value::undefined();

        // Try window first / 먼저 window 시도
        try {
          facebook::jsi::Value windowValue = global.getProperty(runtime, "window");
          if (windowValue.isObject()) {
            facebook::jsi::Object windowObj = windowValue.asObject(runtime);
            facebook::jsi::Value handlerProp = windowObj.getProperty(runtime, "__CDP_MESSAGE_HANDLER__");
            if (handlerProp.isObject() && handlerProp.asObject(runtime).isFunction(runtime)) {
              handlerValue = std::move(handlerProp);
            }
          }
        } catch (...) {
          // window not available, try global / window를 사용할 수 없음, global 시도
        }

        // Try global if window handler not found / window 핸들러를 찾지 못한 경우 global 시도
        if (handlerValue.isUndefined()) {
          try {
            facebook::jsi::Value globalValue = global.getProperty(runtime, "global");
            if (globalValue.isObject()) {
              facebook::jsi::Object globalObj = globalValue.asObject(runtime);
              facebook::jsi::Value handlerProp = globalObj.getProperty(runtime, "__CDP_MESSAGE_HANDLER__");
              if (handlerProp.isObject() && handlerProp.asObject(runtime).isFunction(runtime)) {
                handlerValue = std::move(handlerProp);
              }
            }
          } catch (...) {
            // global not available / global을 사용할 수 없음
          }
        }

        // Call handler if found / 핸들러를 찾은 경우 호출
        if (!handlerValue.isUndefined() && handlerValue.isObject() && handlerValue.asObject(runtime).isFunction(runtime)) {
          facebook::jsi::Function handlerFunc = handlerValue.asObject(runtime).asFunction(runtime);

          // Convert C++ string to JSI String / C++ 문자열을 JSI String으로 변환
          facebook::jsi::String messageJSI = facebook::jsi::String::createFromUtf8(runtime, messageCpp);

          // Call handler with message / 메시지와 함께 핸들러 호출
          handlerFunc.call(runtime, messageJSI);

          __android_log_print(ANDROID_LOG_DEBUG, TAG,
                              "nativeHandleCDPMessage: Called JavaScript CDP message handler / JavaScript CDP 메시지 핸들러 호출됨");
        } else {
          __android_log_print(ANDROID_LOG_WARN, TAG,
                              "nativeHandleCDPMessage: CDP message handler not found / CDP 메시지 핸들러를 찾을 수 없음");
        }
      } catch (const facebook::jsi::JSError& e) {
        __android_log_print(ANDROID_LOG_ERROR, TAG,
                            "nativeHandleCDPMessage: JSI Error: %s", e.what());
      } catch (const std::exception& e) {
        __android_log_print(ANDROID_LOG_ERROR, TAG,
                            "nativeHandleCDPMessage: Exception: %s", e.what());
      } catch (...) {
        __android_log_print(ANDROID_LOG_ERROR, TAG,
                            "nativeHandleCDPMessage: Unknown exception / 알 수 없는 예외");
      }
    });

  } catch (const std::exception& e) {
    __android_log_print(ANDROID_LOG_ERROR, TAG,
                        "nativeHandleCDPMessage: Exception: %s", e.what());
  } catch (...) {
    __android_log_print(ANDROID_LOG_ERROR, TAG,
                        "nativeHandleCDPMessage: Unknown exception / 알 수 없는 예외");
  }
#else
  __android_log_print(ANDROID_LOG_WARN, TAG,
                      "nativeHandleCDPMessage: JSI not available / JSI를 사용할 수 없음");
#endif
}

// JNI_OnLoad - called when library is loaded / 라이브러리가 로드될 때 호출됨
JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void* /* reserved */) {
  // Store JVM reference / JVM 참조 저장
  g_jvm = vm;

  JNIEnv* env = nullptr;
  if (vm->GetEnv((void**)&env, JNI_VERSION_1_6) != JNI_OK) {
    return JNI_ERR;
  }


  __android_log_print(ANDROID_LOG_INFO, TAG,
                      "JNI_OnLoad: Library loaded / JNI_OnLoad: 라이브러리 로드됨");
  return JNI_VERSION_1_6;
}
