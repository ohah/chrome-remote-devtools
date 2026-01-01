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
import java.io.BufferedReader
import java.io.InputStreamReader
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Logcat Reader for intercepting React Native console logs / React Native console 로그를 인터셉트하기 위한 Logcat Reader
 *
 * Note: This reads Android Logcat to intercept console messages / 참고: 이것은 Android Logcat을 읽어서 콘솔 메시지를 인터셉트합니다
 * React Native console.log calls are output to Android Logcat / React Native console.log 호출은 Android Logcat으로 출력됩니다
 *
 * Alternative: We can also intercept at JavaScript level / 대안: JavaScript 레벨에서도 인터셉트할 수 있습니다
 * However, native-level interception is preferred for consistency with iOS / 그러나 iOS와의 일관성을 위해 네이티브 레벨 인터셉션이 선호됩니다
 */
class ChromeRemoteDevToolsLogcatReader(
  private val logHook: ChromeRemoteDevToolsLogHook
) {
  private var logcatProcess: Process? = null
  private var logcatThread: Thread? = null
  private val isRunning = AtomicBoolean(false)

  /**
   * Start reading Logcat / Logcat 읽기 시작
   */
  fun start() {
    if (isRunning.get()) {
      return
    }

    isRunning.set(true)

    logcatThread = Thread {
      try {
        // Start logcat process with filters for React Native logs / React Native 로그에 대한 필터로 logcat 프로세스 시작
        // Filter for ReactNativeJS tag which is used by React Native console / React Native console에서 사용하는 ReactNativeJS 태그 필터
        val processBuilder = ProcessBuilder(
          "logcat",
          "-v", "time",
          "ReactNativeJS:*", "*:S" // Only show ReactNativeJS logs, suppress others / ReactNativeJS 로그만 표시, 나머지는 억제
        )

        logcatProcess = processBuilder.start()
        val reader = BufferedReader(InputStreamReader(logcatProcess!!.inputStream))

        while (isRunning.get()) {
          val line = reader.readLine()
          if (line == null) {
            break
          }
          parseLogcatLine(line)
        }
      } catch (e: Exception) {
        if (isRunning.get()) {
          Log.e(TAG, "Error reading logcat / Logcat 읽기 오류", e)
        }
      }
    }

    logcatThread?.start()
    Log.d(TAG, "Logcat reader started / Logcat 리더 시작됨")
  }

  /**
   * Stop reading Logcat / Logcat 읽기 중지
   */
  fun stop() {
    if (!isRunning.get()) {
      return
    }

    isRunning.set(false)
    logcatProcess?.destroy()
    logcatThread?.interrupt()
    logcatProcess = null
    logcatThread = null
    Log.d(TAG, "Logcat reader stopped / Logcat 리더 중지됨")
  }

  /**
   * Parse logcat line and intercept if it's a React Native console message / Logcat 라인을 파싱하고 React Native console 메시지인 경우 인터셉트
   *
   * Logcat format: MM-DD HH:MM:SS.mmm PID TID LEVEL TAG: MESSAGE
   * Example: 01-01 12:00:00.000 12345 12345 I ReactNativeJS: console.log message
   */
  private fun parseLogcatLine(line: String) {
    try {
      // Parse logcat line / Logcat 라인 파싱
      // Format: MM-DD HH:MM:SS.mmm PID TID LEVEL TAG: MESSAGE
      val parts = line.split(" ", limit = 6)
      if (parts.size < 6) {
        return
      }

      val level = parts[4] // Log level (I, D, W, E) / 로그 레벨
      val tagAndMessage = parts[5] // TAG: MESSAGE / 태그와 메시지

      // Check if it's ReactNativeJS tag / ReactNativeJS 태그인지 확인
      if (!tagAndMessage.startsWith("ReactNativeJS:")) {
        return
      }

      // Extract message / 메시지 추출
      val message = tagAndMessage.substring("ReactNativeJS:".length).trim()

      // Map logcat level to Android Log level / Logcat 레벨을 Android Log 레벨로 매핑
      val androidLogLevel = when (level) {
        "E" -> Log.ERROR
        "W" -> Log.WARN
        "I" -> Log.INFO
        "D" -> Log.DEBUG
        else -> Log.INFO
      }

      // Intercept log / 로그 인터셉트
      logHook.interceptLog(androidLogLevel, "ReactNativeJS", message)
    } catch (e: Exception) {
      // Ignore parsing errors / 파싱 오류 무시
      Log.d(TAG, "Failed to parse logcat line / Logcat 라인 파싱 실패: ${e.message}")
    }
  }

  companion object {
    private const val TAG = "ChromeRemoteDevToolsLogcatReader"
  }
}

