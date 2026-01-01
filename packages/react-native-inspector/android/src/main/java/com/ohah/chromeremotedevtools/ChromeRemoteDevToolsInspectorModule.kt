/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Modified for Chrome Remote DevTools / Chrome Remote DevTools용으로 수정됨
 */

package com.ohah.chromeremotedevtools

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * TurboModule for Chrome Remote DevTools Inspector / Chrome Remote DevTools Inspector용 TurboModule
 * This allows JavaScript to call native Inspector methods / JavaScript에서 네이티브 Inspector 메서드를 호출할 수 있게 합니다
 *
 * Note: Android implementation is a placeholder for now / 참고: Android 구현은 현재 플레이스홀더입니다
 * The actual Inspector connection logic needs to be implemented / 실제 Inspector 연결 로직은 구현이 필요합니다
 */
class ChromeRemoteDevToolsInspectorModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String {
    return NAME
  }

  companion object {
    const val NAME = "ChromeRemoteDevToolsInspector"
  }

  /**
   * Connect to Chrome Remote DevTools server / Chrome Remote DevTools 서버에 연결
   * @param serverHost Server host (e.g., "localhost" or "192.168.1.100") / 서버 호스트 (예: "localhost" 또는 "192.168.1.100")
   * @param serverPort Server port (e.g., 8080) / 서버 포트 (예: 8080)
   */
  @ReactMethod
  fun connect(serverHost: String, serverPort: Int, promise: Promise) {
    // TODO: Implement Android Inspector connection / Android Inspector 연결 구현 필요
    // For now, this is a placeholder / 현재는 플레이스홀더입니다
    promise.resolve(
      mapOf(
        "connected" to true,
        "host" to serverHost,
        "port" to serverPort,
        "platform" to "android",
      ),
    )
  }

  /**
   * Disable debugger / 디버거 비활성화
   */
  @ReactMethod
  fun disableDebugger(promise: Promise) {
    // TODO: Implement Android debugger disable / Android 디버거 비활성화 구현 필요
    promise.resolve(null)
  }

  /**
   * Check if packager is disconnected / Packager 연결이 끊어졌는지 확인
   * @return true if disconnected / 연결이 끊어졌으면 true
   */
  @ReactMethod
  fun isPackagerDisconnected(promise: Promise) {
    // TODO: Implement Android packager disconnection check / Android packager 연결 끊김 확인 구현 필요
    promise.resolve(false)
  }

  /**
   * Open debugger / 디버거 열기
   * @param serverHost Server host / 서버 호스트
   * @param serverPort Server port / 서버 포트
   * @param errorMessage Error message to show if failed / 실패 시 표시할 에러 메시지
   */
  @ReactMethod
  fun openDebugger(serverHost: String, serverPort: Int, errorMessage: String, promise: Promise) {
    // TODO: Implement Android debugger opening / Android 디버거 열기 구현 필요
    promise.resolve(null)
  }
}

