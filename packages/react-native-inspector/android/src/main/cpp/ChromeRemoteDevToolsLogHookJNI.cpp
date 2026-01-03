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

// Include JSI headers for JSI-level logging interception / JSI 레벨 로깅 인터셉션을 위한 JSI 헤더 포함
#if __has_include(<jsi/jsi.h>) && __has_include(<ReactCommon/RuntimeExecutor.h>) && __has_include(<fbjni/fbjni.h>) && __has_include(<react/jni/JRuntimeExecutor.h>)
#define REACT_NATIVE_JSI_AVAILABLE
#include <jsi/jsi.h>
#include <ReactCommon/RuntimeExecutor.h>
#include <fbjni/fbjni.h>
#include <react/jni/JRuntimeExecutor.h>
#endif

// Include common C++ console hook / 공통 C++ console 훅 포함
#include "ConsoleHook.h"
// Include network hook / 네트워크 훅 포함
#include "NetworkHook.h"

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

// Hook console methods using common C++ code / 공통 C++ 코드를 사용하여 console 메서드 훅
#ifdef REACT_NATIVE_JSI_AVAILABLE
static void hookJSILogging(facebook::jsi::Runtime& runtime) {
  try {
    // Set platform callback before hooking / 훅하기 전에 플랫폼 콜백 설정
    chrome_remote_devtools::setSendCDPMessageCallback(sendCDPMessageAndroid);

    // Use common C++ hook function / 공통 C++ 훅 함수 사용
    bool consoleSuccess = chrome_remote_devtools::hookConsoleMethods(runtime);
    bool networkSuccess = chrome_remote_devtools::hookNetworkMethods(runtime);

    if (consoleSuccess) {
      g_is_jsi_hooked = true;
      __android_log_print(ANDROID_LOG_INFO, TAG,
                          "JSI-level console hook installed successfully using common C++ code / 공통 C++ 코드를 사용하여 JSI 레벨 console 훅이 성공적으로 설치됨");
    } else {
      __android_log_print(ANDROID_LOG_ERROR, TAG,
                          "Failed to hook JSI console using common C++ code / 공통 C++ 코드를 사용하여 JSI console 훅 실패");
    }

    if (networkSuccess) {
      __android_log_print(ANDROID_LOG_INFO, TAG,
                          "JSI-level network hook installed successfully / JSI 레벨 네트워크 훅이 성공적으로 설치됨");
    } else {
      __android_log_print(ANDROID_LOG_WARN, TAG,
                          "Failed to hook JSI network methods / JSI 네트워크 메서드 훅 실패");
    }
  } catch (const std::exception& e) {
    __android_log_print(ANDROID_LOG_ERROR, TAG,
                        "Failed to hook JSI console: %s", e.what());
  } catch (...) {
    __android_log_print(ANDROID_LOG_ERROR, TAG,
                            "Unknown exception in hookJSILogging / hookJSILogging에서 알 수 없는 예외 발생");
  }
}
#else
// JSI not available, provide stub implementation / JSI를 사용할 수 없으므로 스텁 구현 제공
static void hookJSILogging(void* runtime) {
  __android_log_print(ANDROID_LOG_WARN, TAG,
                          "JSI headers not available, JSI hooking disabled / JSI 헤더를 사용할 수 없어 JSI 훅이 비활성화됨");
}
#endif

// JNI function to install JSI-level logging hook using RuntimeExecutor /
// RuntimeExecutor를 사용하여 JSI 레벨 로깅 훅을 설치하는 JNI 함수
extern "C" JNIEXPORT jboolean JNICALL
Java_com_ohah_chromeremotedevtools_ChromeRemoteDevToolsLogHookJNI_nativeHookJSILog(
    JNIEnv *env,
    jobject /* thiz */,
    jobject runtimeExecutor) {
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
    executor([](facebook::jsi::Runtime& runtime) {
      hookJSILogging(runtime);
    });

    __android_log_print(ANDROID_LOG_INFO, TAG,
                            "JSI-level logging hook installed");
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

// JNI function to get object properties / 객체 속성을 가져오는 JNI 함수
extern "C" JNIEXPORT jstring JNICALL
Java_com_ohah_chromeremotedevtools_ChromeRemoteDevToolsLogHookJNI_nativeGetObjectProperties(
    JNIEnv *env,
    jobject /* thiz */,
    jstring objectId) {
  try {
    if (!objectId) {
      return nullptr;
    }

    const char* objectIdStr = env->GetStringUTFChars(objectId, nullptr);
    if (!objectIdStr) {
      return nullptr;
    }

    std::string objectIdCpp(objectIdStr);
    env->ReleaseStringUTFChars(objectId, objectIdStr);

#ifdef REACT_NATIVE_JSI_AVAILABLE
    // Get RuntimeExecutor from stored reference / 저장된 참조에서 RuntimeExecutor 가져오기
    facebook::react::RuntimeExecutor executor = nullptr;
    {
      std::lock_guard<std::mutex> lock(g_runtimeExecutorMutex);
      executor = g_runtimeExecutor;
    }

    if (!executor) {
      __android_log_print(ANDROID_LOG_WARN, TAG,
                          "RuntimeExecutor not available / RuntimeExecutor를 사용할 수 없음");
      return nullptr;
    }

    // Access runtime and get object properties / 런타임에 접근하고 객체 속성 가져오기
    std::string resultJson;
    bool success = false;

    executor([&](facebook::jsi::Runtime& runtime) {
      try {
        resultJson = chrome_remote_devtools::getObjectProperties(runtime, objectIdCpp, false);
        success = true;
      } catch (const std::exception& e) {
        __android_log_print(ANDROID_LOG_ERROR, TAG,
                            "Exception in getObjectProperties: %s", e.what());
      } catch (...) {
        __android_log_print(ANDROID_LOG_ERROR, TAG,
                            "Unknown exception in getObjectProperties");
      }
    });

    if (success && !resultJson.empty()) {
      jstring result = env->NewStringUTF(resultJson.c_str());
      return result;
    }

    return nullptr;
#else
    __android_log_print(ANDROID_LOG_WARN, TAG,
                        "JSI not available, cannot get object properties / JSI를 사용할 수 없어 객체 속성을 가져올 수 없음");
    return nullptr;
#endif
  } catch (const std::exception& e) {
    __android_log_print(ANDROID_LOG_ERROR, TAG,
                        "Exception in nativeGetObjectProperties: %s", e.what());
    return nullptr;
  } catch (...) {
    __android_log_print(ANDROID_LOG_ERROR, TAG,
                        "Unknown exception in nativeGetObjectProperties");
    return nullptr;
  }
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
