/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Modified for Chrome Remote DevTools / Chrome Remote DevTools용으로 수정됨
 */

package com.ohah.chromeremotedevtools

import android.util.Log

/**
 * JNI wrapper for native log hooking / 네이티브 로그 훅을 위한 JNI 래퍼
 */
class ChromeRemoteDevToolsLogHookJNI {
  companion object {
    private const val TAG = "ChromeRemoteDevToolsLogHookJNI"

    init {
      try {
        System.loadLibrary("chromeremotedevtoolsinspector")
        Log.d(TAG, "Native library loaded / 네이티브 라이브러리 로드됨")
      } catch (e: UnsatisfiedLinkError) {
        Log.e(TAG, "Failed to load native library / 네이티브 라이브러리 로드 실패", e)
      } catch (e: Exception) {
        Log.e(TAG, "Exception loading native library / 네이티브 라이브러리 로드 중 예외", e)
      }
    }

    /**
     * Install JSI-level logging hook using RuntimeExecutor / RuntimeExecutor를 사용하여 JSI 레벨 로깅 훅 설치
     * This intercepts console.log calls directly in JavaScript / 이것은 JavaScript에서 console.log 호출을 직접 인터셉트합니다
     *
     * @param runtimeExecutor RuntimeExecutor from React Native / React Native의 RuntimeExecutor
     * @return true if hooking was successful / 훅이 성공하면 true
     */
    @JvmStatic
    external fun nativeHookJSILog(runtimeExecutor: Any): Boolean

    /**
     * Enable console hook / console 훅 활성화
     * @param runtimeExecutor RuntimeExecutor from React Native / React Native의 RuntimeExecutor
     * @return true if enabling succeeded / 활성화가 성공하면 true
     */
    @JvmStatic
    external fun nativeEnableConsoleHook(runtimeExecutor: Any): Boolean

    /**
     * Disable console hook / console 훅 비활성화
     * @param runtimeExecutor RuntimeExecutor from React Native / React Native의 RuntimeExecutor
     * @return true if disabling succeeded / 비활성화가 성공하면 true
     */
    @JvmStatic
    external fun nativeDisableConsoleHook(runtimeExecutor: Any): Boolean

    /**
     * Enable network hook / 네트워크 훅 활성화
     * @param runtimeExecutor RuntimeExecutor from React Native / React Native의 RuntimeExecutor
     * @return true if enabling succeeded / 활성화가 성공하면 true
     */
    @JvmStatic
    external fun nativeEnableNetworkHook(runtimeExecutor: Any): Boolean

    /**
     * Disable network hook / 네트워크 훅 비활성화
     * @param runtimeExecutor RuntimeExecutor from React Native / React Native의 RuntimeExecutor
     * @return true if disabling succeeded / 비활성화가 성공하면 true
     */
    @JvmStatic
    external fun nativeDisableNetworkHook(runtimeExecutor: Any): Boolean

    /**
     * Get network response body by request ID / 요청 ID로 네트워크 응답 본문 가져오기
     * @param requestId Network request ID / 네트워크 요청 ID
     * @return Response body as string, or null if not found / 응답 본문 문자열, 찾지 못하면 null
     */
    @JvmStatic
    external fun nativeGetNetworkResponseBody(requestId: String): String?

    /**
     * Get object properties for Runtime.getProperties / Runtime.getProperties를 위한 객체 속성 가져오기
     * @param objectId Object ID / 객체 ID
     * @return JSON string of properties response, or null if not found / 속성 응답의 JSON 문자열, 찾지 못하면 null
     */
    @JvmStatic
    external fun nativeGetObjectProperties(objectId: String): String?

    /**
     * Send CDP message directly from C++ / C++에서 직접 CDP 메시지 전송
     * This bypasses JavaScript/TurboModule layer / JavaScript/TurboModule 레이어를 우회합니다
     * Called from native C++ code via JNI / JNI를 통해 네이티브 C++ 코드에서 호출됨
     * @param serverHost Server host / 서버 호스트
     * @param serverPort Server port / 서버 포트
     * @param message CDP message JSON string / CDP 메시지 JSON 문자열
     */
    @JvmStatic
    fun sendCDPMessageFromNative(serverHost: String, serverPort: Int, message: String) {
      try {
        val context = g_applicationContext
        if (context != null) {
          // Call ChromeRemoteDevToolsInspector directly / ChromeRemoteDevToolsInspector를 직접 호출
          // This is the same function that TurboModule calls / 이것은 TurboModule이 호출하는 것과 동일한 함수입니다
          ChromeRemoteDevToolsInspector.sendCDPMessage(
            context = context,
            serverHost = serverHost,
            serverPort = serverPort,
            message = message
          )
        } else {
          Log.w(TAG, "Application context not available, cannot send CDP message / 애플리케이션 컨텍스트를 사용할 수 없어 CDP 메시지를 전송할 수 없습니다")
        }
      } catch (e: Exception) {
        Log.e(TAG, "Failed to send CDP message from native / 네이티브에서 CDP 메시지 전송 실패: ${e.message}", e)
      }
    }

    // Store application context for native access / 네이티브 접근을 위한 애플리케이션 컨텍스트 저장
    private var g_applicationContext: android.content.Context? = null

    /**
     * Set application context for native CDP message sending / 네이티브 CDP 메시지 전송을 위한 애플리케이션 컨텍스트 설정
     * @param context Application context / 애플리케이션 컨텍스트
     */
    @JvmStatic
    fun setApplicationContext(context: android.content.Context) {
      g_applicationContext = context.applicationContext
    }

  }
}

