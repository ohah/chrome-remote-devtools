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
import org.json.JSONObject
import com.facebook.react.bridge.CatalystInstance
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.RuntimeExecutor

/**
 * Log hook for intercepting console messages / 콘솔 메시지를 가로채기 위한 로그 훅
 *
 * Note: Android doesn't have direct ReactLog hook like iOS / 참고: Android는 iOS처럼 직접적인 ReactLog 훅이 없습니다
 * This implementation uses JNI to hook React Native's logging system at native level / 이 구현은 JNI를 사용하여 네이티브 레벨에서 React Native의 로깅 시스템을 훅합니다
 *
 * Alternative approach: We can also intercept at JavaScript level by overriding console methods / 대안: JavaScript 레벨에서 console 메서드를 오버라이드하여 인터셉트할 수도 있습니다
 * However, native-level interception is preferred for consistency with iOS / 그러나 iOS와의 일관성을 위해 네이티브 레벨 인터셉션이 선호됩니다
 */
object ChromeRemoteDevToolsLogHook : ChromeRemoteDevToolsLogHookJNICallback {
  private const val TAG = "ChromeRemoteDevToolsLogHook"
  private var connection: ChromeRemoteDevToolsInspectorPackagerConnection? = null
  private var isProcessingLog = false
  private var timestampCounter = 0L
  private var isHooked = false

  /**
   * Set connection for log interception / 로그 가로채기를 위한 연결 설정
   */
  fun setConnection(conn: ChromeRemoteDevToolsInspectorPackagerConnection?) {
    connection = conn
  }

  /**
   * Hook React Native's logging system / React Native의 로깅 시스템 훅
   *
   * Note: Android doesn't have direct ReactLog hook like iOS / 참고: Android는 iOS처럼 직접적인 ReactLog 훅이 없습니다
   * We use JNI to hook React Native's logging at native level / JNI를 사용하여 네이티브 레벨에서 React Native의 로깅을 훅합니다
   */
  fun hookReactLog() {
    if (isHooked) {
      Log.d(TAG, "ReactLog hook already started / ReactLog 훅이 이미 시작됨")
      return
    }

    // Check if connection is set / 연결이 설정되었는지 확인
    if (connection == null) {
      Log.w(TAG, "Connection not set, cannot hook ReactLog / 연결이 설정되지 않음")
      return
    }

    try {
      // Hook using JNI / JNI를 사용하여 훅
      val jniHooked = ChromeRemoteDevToolsLogHookJNI.nativeHookReactLog(this)

      if (jniHooked) {
        isHooked = true
        Log.d(TAG, "ReactLog hook started using JNI / JNI를 사용하여 ReactLog 훅 시작됨")
      } else {
        Log.e(TAG, "Failed to hook ReactLog using JNI / JNI를 사용한 ReactLog 훅 실패")
        isHooked = false
      }
    } catch (e: Exception) {
      Log.e(TAG, "Exception while hooking ReactLog / ReactLog 훅 중 예외 발생: ${e.message}", e)
      isHooked = false
    }
  }

  /**
   * Hook React Native's logging system at JSI level / JSI 레벨에서 React Native의 로깅 시스템 훅
   * This intercepts console.log calls directly in JavaScript / 이것은 JavaScript에서 console.log 호출을 직접 인터셉트합니다
   *
   * @param reactContext ReactContext to get RuntimeExecutor / RuntimeExecutor를 얻기 위한 ReactContext
   */
  fun hookJSILog(reactContext: ReactContext?) {
    if (reactContext == null) {
      Log.w(TAG, "ReactContext is null, cannot hook JSI log / ReactContext가 null입니다, JSI 로그를 훅할 수 없습니다")
      return
    }

    // Check if connection is set / 연결이 설정되었는지 확인
    if (connection == null) {
      Log.w(TAG, "Connection not set, cannot hook JSI log / 연결이 설정되지 않음, JSI 로그를 훅할 수 없습니다")
      return
    }

    try {
      // Get CatalystInstance from ReactContext / ReactContext에서 CatalystInstance 가져오기
      val catalystInstance = reactContext.catalystInstance
      if (catalystInstance == null) {
        Log.w(TAG, "CatalystInstance is null, cannot hook JSI log / CatalystInstance가 null입니다, JSI 로그를 훅할 수 없습니다")
        return
      }

      // Get RuntimeExecutor from CatalystInstance / CatalystInstance에서 RuntimeExecutor 가져오기
      val runtimeExecutor = catalystInstance.runtimeExecutor
      if (runtimeExecutor == null) {
        Log.w(TAG, "RuntimeExecutor is null, cannot hook JSI log / RuntimeExecutor가 null입니다, JSI 로그를 훅할 수 없습니다")
        return
      }

      // Use JNI to install JSI-level hook / JNI를 사용하여 JSI 레벨 훅 설치
      // The JNI function will extract RuntimeExecutor and call it to access JSI runtime /
      // JNI 함수가 RuntimeExecutor를 추출하고 호출하여 JSI 런타임에 접근합니다
      val jsiHooked = ChromeRemoteDevToolsLogHookJNI.nativeHookJSILog(runtimeExecutor, this)

      if (jsiHooked) {
        Log.d(TAG, "JSI-level logging hook installed successfully / JSI 레벨 로깅 훅이 성공적으로 설치됨")
      } else {
        Log.w(TAG, "Failed to install JSI-level logging hook, falling back to native-level hooking / " +
              "JSI 레벨 로깅 훅 설치 실패, 네이티브 레벨 훅으로 폴백합니다")
      }
    } catch (e: Exception) {
      Log.e(TAG, "Exception while hooking JSI log / JSI 로그 훅 중 예외 발생: ${e.message}", e)
    }
  }

  /**
   * Callback from native JNI hook / 네이티브 JNI 훅에서의 콜백
   * This method is called when a log message is intercepted by native code / 이 메서드는 네이티브 코드에서 로그 메시지가 인터셉트될 때 호출됩니다
   */
  override fun onLog(level: Int, tag: String?, message: String?) {
    interceptLog(level, tag, message)
  }

  /**
   * Intercept log message and send as CDP event / 로그 메시지를 가로채서 CDP 이벤트로 전송
   * This method is called from Android Log interceptor / 이 메서드는 Android Log 인터셉터에서 호출됩니다
   *
   * @param level Android log level (Log.ERROR, Log.WARN, Log.INFO, Log.DEBUG) / Android 로그 레벨
   * @param tag Log tag / 로그 태그
   * @param message Log message / 로그 메시지
   */
  fun interceptLog(level: Int, tag: String?, message: String?) {
    // Prevent infinite recursion / 무한 재귀 방지
    if (isProcessingLog) {
      return
    }

    if (message == null || message.isEmpty()) {
      return
    }

    // Skip our own debug messages / 우리 자신의 디버그 메시지 건너뛰기
    if (message.contains("[ChromeRemoteDevTools]")) {
      return
    }

    // Skip logs from our own tag to prevent infinite loop / 무한 루프 방지를 위해 우리 자신의 태그 로그 건너뛰기
    if (tag == TAG || tag == "ChromeRemoteDevToolsLogHookJNI") {
      return
    }

    // Filter out native Android logs / 네이티브 Android 로그 필터링
    // Only intercept React Native JavaScript logs / React Native JavaScript 로그만 인터셉트
    // React Native uses "ReactNativeJS" for console.log/info/warn/debug and "unknown:ReactNative" for console.error
    // React Native는 console.log/info/warn/debug에 "ReactNativeJS"를, console.error에 "unknown:ReactNative"를 사용합니다
    val isReactNativeLog = tag != null && (
      tag.startsWith("ReactNative") ||
      tag.startsWith("ReactNativeJS") ||
      tag.contains("ReactNative")
    )

    if (!isReactNativeLog) {
      if (tag != null && (tag.contains(".java") || tag.contains(".kt"))) {
        // Skip native code logs / 네이티브 코드 로그 건너뛰기
        return
      } else {
        // Skip other non-React Native logs / 다른 React Native가 아닌 로그 건너뛰기
        return
      }
    }

    val conn = connection
    if (conn == null) {
      // Don't use Log.d here to avoid infinite loop / 무한 루프 방지를 위해 여기서 Log.d 사용하지 않음
      return
    }

    if (!conn.isConnected()) {
      // Don't use Log.d here to avoid infinite loop / 무한 루프 방지를 위해 여기서 Log.d 사용하지 않음
      return
    }

    isProcessingLog = true

    try {
      // Map Android log level to CDP console type / Android 로그 레벨을 CDP console type으로 매핑
      val type = when (level) {
        Log.ERROR -> "error"
        Log.WARN -> "warning"
        Log.INFO, Log.DEBUG -> "log"
        else -> "log"
      }

      // Generate unique timestamp / 고유한 타임스탬프 생성
      val timestamp = System.currentTimeMillis() + (++timestampCounter % 1000)

      // Create CDP Runtime.consoleAPICalled event / CDP Runtime.consoleAPICalled 이벤트 생성
      val cdpMessage = JSONObject().apply {
        put("method", "Runtime.consoleAPICalled")
        put("params", JSONObject().apply {
          put("type", type)
          put("args", org.json.JSONArray().apply {
            put(JSONObject().apply {
              put("type", "string")
              put("value", message)
            })
          })
          put("executionContextId", 1)
          put("timestamp", timestamp)
          put("stackTrace", JSONObject().apply {
            put("callFrames", org.json.JSONArray())
          })
        })
      }

      val messageStr = cdpMessage.toString()
      // Don't use Log.d here to avoid infinite loop / 무한 루프 방지를 위해 여기서 Log.d 사용하지 않음
      try {
        conn.sendCDPMessage(messageStr)
        // Don't use Log.d here to avoid infinite loop / 무한 루프 방지를 위해 여기서 Log.d 사용하지 않음
      } catch (e: Exception) {
        // Only log errors, and use a different tag to avoid recursion / 에러만 로깅하고, 재귀 방지를 위해 다른 태그 사용
        android.util.Log.e("ChromeRemoteDevToolsError", "Failed to send CDP message / CDP 메시지 전송 실패: ${e.message}")
      }
    } catch (e: Exception) {
      // Only log errors, and use a different tag to avoid recursion / 에러만 로깅하고, 재귀 방지를 위해 다른 태그 사용
      android.util.Log.e("ChromeRemoteDevToolsError", "Failed to send log message / 로그 메시지 전송 실패: ${e.message}")
    } finally {
      isProcessingLog = false
    }
  }

  /**
   * Unhook React Native's logging system / React Native의 로깅 시스템 언훅
   */
  fun unhookReactLog() {
    if (!isHooked) {
      return
    }

    try {
      ChromeRemoteDevToolsLogHookJNI.nativeUnhookReactLog()
      isHooked = false
      Log.d(TAG, "ReactLog unhooked / ReactLog 언훅됨")
    } catch (e: Exception) {
      Log.e(TAG, "Failed to unhook ReactLog / ReactLog 언훅 실패: ${e.message}", e)
    }
  }
}

