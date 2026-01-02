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
 * Callback interface for log messages / 로그 메시지용 콜백 인터페이스
 */
interface ChromeRemoteDevToolsLogHookJNICallback {
  /**
   * Called when a log message is intercepted / 로그 메시지가 인터셉트될 때 호출됨
   *
   * @param level Android log level (Log.ERROR, Log.WARN, Log.INFO, Log.DEBUG) / Android 로그 레벨
   * @param tag Log tag / 로그 태그
   * @param message Log message / 로그 메시지
   */
  fun onLog(level: Int, tag: String?, message: String?)
}

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
     * Hook React Native's logging system using native code / 네이티브 코드를 사용하여 React Native의 로깅 시스템 훅
     *
     * @param callback Callback interface for receiving log messages / 로그 메시지를 받기 위한 콜백 인터페이스
     * @return true if hooking was successful / 훅이 성공하면 true
     */
    @JvmStatic
    external fun nativeHookReactLog(callback: ChromeRemoteDevToolsLogHookJNICallback): Boolean

    /**
     * Unhook React Native's logging system / React Native의 로깅 시스템 언훅
     */
    @JvmStatic
    external fun nativeUnhookReactLog()
  }
}

