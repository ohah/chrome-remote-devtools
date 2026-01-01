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

/**
 * Log hook for intercepting console messages / 콘솔 메시지를 가로채기 위한 로그 훅
 *
 * Note: Android doesn't have direct ReactLog hook like iOS / 참고: Android는 iOS처럼 직접적인 ReactLog 훅이 없습니다
 * This implementation uses reflection to hook React Native's logging system / 이 구현은 Reflection을 사용하여 React Native의 로깅 시스템을 훅합니다
 *
 * Alternative approach: We can also intercept at JavaScript level by overriding console methods / 대안: JavaScript 레벨에서 console 메서드를 오버라이드하여 인터셉트할 수도 있습니다
 * However, native-level interception is preferred for consistency with iOS / 그러나 iOS와의 일관성을 위해 네이티브 레벨 인터셉션이 선호됩니다
 */
object ChromeRemoteDevToolsLogHook {
  private const val TAG = "ChromeRemoteDevToolsLogHook"
  private var connection: ChromeRemoteDevToolsInspectorPackagerConnection? = null
  private var isProcessingLog = false
  private var timestampCounter = 0L
  private var originalLogHandler: Any? = null
  private var isHooked = false
  private var logcatReader: ChromeRemoteDevToolsLogcatReader? = null

  /**
   * Set connection for log interception / 로그 가로채기를 위한 연결 설정
   */
  fun setConnection(conn: ChromeRemoteDevToolsInspectorPackagerConnection?) {
    connection = conn
    // Update logcat reader connection if it exists / Logcat 리더 연결이 있으면 업데이트
    logcatReader?.let {
      // Connection is set in interceptLog method / 연결은 interceptLog 메서드에서 설정됨
    }
  }

  /**
   * Hook React Native's logging system / React Native의 로깅 시스템 훅
   *
   * Note: Android doesn't have direct ReactLog hook like iOS / 참고: Android는 iOS처럼 직접적인 ReactLog 훅이 없습니다
   * We use Logcat Reader to intercept React Native console logs / Logcat Reader를 사용하여 React Native console 로그를 인터셉트합니다
   * React Native console.log calls are output to Android Logcat with "ReactNativeJS" tag / React Native console.log 호출은 "ReactNativeJS" 태그와 함께 Android Logcat으로 출력됩니다
   */
  fun hookReactLog() {
    if (isHooked) {
      return
    }

    try {
      // Use Logcat Reader to intercept React Native console logs / Logcat Reader를 사용하여 React Native console 로그 인터셉트
      // This is the Android equivalent of iOS's RCTSetLogFunction / 이것은 iOS의 RCTSetLogFunction과 동등한 Android 버전입니다
      logcatReader = ChromeRemoteDevToolsLogcatReader(this)
      logcatReader?.start()

      isHooked = true
      Log.d(TAG, "ReactLog hook started using Logcat Reader / Logcat Reader를 사용하여 ReactLog 훅 시작됨")
    } catch (e: Exception) {
      // If Logcat Reader fails, we'll fall back to other methods / Logcat Reader가 실패하면 다른 방법으로 폴백
      Log.w(TAG, "Failed to start Logcat Reader / Logcat Reader 시작 실패: ${e.message}")
      isHooked = false
    }
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

    // Filter out native Android logs / 네이티브 Android 로그 필터링
    // Only intercept React Native JavaScript logs / React Native JavaScript 로그만 인터셉트
    if (tag != null && (tag.startsWith("ReactNative") || tag.startsWith("ReactNativeJS"))) {
      // This is a React Native log, proceed / 이것은 React Native 로그입니다, 진행
    } else if (tag != null && (tag.contains(".java") || tag.contains(".kt"))) {
      // Skip native code logs / 네이티브 코드 로그 건너뛰기
      return
    } else {
      // For other logs, check if they look like React Native console messages / 다른 로그의 경우 React Native console 메시지처럼 보이는지 확인
      // React Native console messages typically don't have specific tags / React Native console 메시지는 일반적으로 특정 태그가 없습니다
      // We'll intercept all logs that don't look like native code / 네이티브 코드처럼 보이지 않는 모든 로그를 인터셉트합니다
    }

    val conn = connection
    if (conn == null || !conn.isConnected()) {
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

      conn.sendCDPMessage(cdpMessage.toString())
    } catch (e: Exception) {
      Log.e(TAG, "Failed to send log message / 로그 메시지 전송 실패", e)
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
      // Stop Logcat Reader / Logcat Reader 중지
      logcatReader?.stop()
      logcatReader = null

      // Restore original log handler if we saved it / 저장한 경우 원본 로그 핸들러 복원
      originalLogHandler = null
      isHooked = false
      Log.d(TAG, "ReactLog unhooked / ReactLog 언훅됨")
    } catch (e: Exception) {
      Log.e(TAG, "Failed to unhook ReactLog / ReactLog 언훅 실패", e)
    }
  }
}

