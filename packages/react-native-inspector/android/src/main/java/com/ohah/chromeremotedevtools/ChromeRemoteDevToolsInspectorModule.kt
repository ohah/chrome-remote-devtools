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
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments

/**
 * TurboModule for Chrome Remote DevTools Inspector / Chrome Remote DevTools Inspector용 TurboModule
 * This allows JavaScript to call native Inspector methods / JavaScript에서 네이티브 Inspector 메서드를 호출할 수 있게 합니다
 */
class ChromeRemoteDevToolsInspectorModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private var connection: ChromeRemoteDevToolsInspectorPackagerConnection? = null

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
    try {
      val context = reactApplicationContext
      if (context == null) {
        android.util.Log.e("ChromeRemoteDevToolsInspectorModule", "React application context is null / React 애플리케이션 컨텍스트가 null입니다")
        promise.reject("NO_CONTEXT", "React application context is null / React 애플리케이션 컨텍스트가 null입니다")
        return
      }

      android.util.Log.d("ChromeRemoteDevToolsInspectorModule", "connect() called / connect() 호출됨")
      android.util.Log.d("ChromeRemoteDevToolsInspectorModule", "serverHost: $serverHost, serverPort: $serverPort")

      // Set application context for native JNI access / 네이티브 JNI 접근을 위한 애플리케이션 컨텍스트 설정
      ChromeRemoteDevToolsLogHookJNI.setApplicationContext(context)

      // Connect to server / 서버에 연결
      // Use Kotlin implementation directly / Kotlin 구현을 직접 사용
      val connectionObj = ChromeRemoteDevToolsInspector.connect(
        context = context,
        serverHost = serverHost,
        serverPort = serverPort
      )
      connection = connectionObj

      if (connection != null) {
        android.util.Log.d("ChromeRemoteDevToolsInspectorModule", "Connection object created / 연결 객체 생성됨")

        // Note: WebSocket connection is asynchronous / 참고: WebSocket 연결은 비동기입니다
        // The connection may not be established immediately / 연결이 즉시 설정되지 않을 수 있습니다
        // Check connection status after a short delay / 짧은 지연 후 연결 상태 확인
        // Capture variables for lambda / 람다를 위한 변수 캡처
        val capturedHost = serverHost
        val capturedPort = serverPort
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
          val isConnected = connection?.isConnected() ?: false
          android.util.Log.d("ChromeRemoteDevToolsInspectorModule", "Connection status after delay / 지연 후 연결 상태: $isConnected")

          // 연결 실패 시 경고 로그 추가 / 연결 실패 시 경고 로그 추가
          if (!isConnected) {
            android.util.Log.w("ChromeRemoteDevToolsInspectorModule", "⚠️ WebSocket not connected after 500ms delay / 500ms 지연 후에도 WebSocket이 연결되지 않음")
            android.util.Log.w("ChromeRemoteDevToolsInspectorModule", "Check Android logcat for WebSocket errors / WebSocket 에러를 확인하려면 Android logcat을 확인하세요")
            android.util.Log.w("ChromeRemoteDevToolsInspectorModule", "Command: adb logcat | grep ChromeRemoteDevTools")
            val serverAddress = "$capturedHost:$capturedPort"
            android.util.Log.w("ChromeRemoteDevToolsInspectorModule", "Server should be running on $serverAddress")
          } else {
            android.util.Log.d("ChromeRemoteDevToolsInspectorModule", "✅ WebSocket connected successfully / WebSocket 연결 성공")

            // Note: Network interception is now handled by C++ network hook (JSI level) / 참고: 네트워크 인터셉션은 이제 C++ network 훅(JSI 레벨)에서 처리됩니다
            // Native OkHttp interceptor is disabled when JSI hook is available / JSI 훅을 사용할 수 있을 때 네이티브 OkHttp 인터셉터는 비활성화됩니다

            // Install JSI-level console and network hooks / JSI 레벨 console 및 network 훅 설치
            // JSI hook is installed directly via JNI, and JSI code will send messages via TurboModule / JSI 훅은 JNI를 통해 직접 설치되며, JSI 코드가 TurboModule을 통해 메시지를 전송합니다
            try {
              val catalystInstance = context.catalystInstance
              if (catalystInstance != null) {
                val runtimeExecutor = catalystInstance.runtimeExecutor
                if (runtimeExecutor != null) {
                  // Call JNI directly to install JSI hook / JSI 훅을 설치하기 위해 JNI를 직접 호출
                  val jsiHooked = ChromeRemoteDevToolsLogHookJNI.nativeHookJSILog(runtimeExecutor)
                  if (jsiHooked) {
                    android.util.Log.d("ChromeRemoteDevToolsInspectorModule", "JSI-level logging hook installed successfully / JSI 레벨 로깅 훅이 성공적으로 설치됨")
                  } else {
                    android.util.Log.w("ChromeRemoteDevToolsInspectorModule", "Failed to install JSI-level logging hook / JSI 레벨 로깅 훅 설치 실패")
                  }
                } else {
                  android.util.Log.w("ChromeRemoteDevToolsInspectorModule", "RuntimeExecutor is null, cannot hook JSI log / RuntimeExecutor가 null입니다, JSI 로그를 훅할 수 없습니다")
                }
              } else {
                android.util.Log.w("ChromeRemoteDevToolsInspectorModule", "CatalystInstance is null, cannot hook JSI log / CatalystInstance가 null입니다, JSI 로그를 훅할 수 없습니다")
              }
            } catch (e: Exception) {
              android.util.Log.e("ChromeRemoteDevToolsInspectorModule", "Exception while hooking JSI log / JSI 로그 훅 중 예외 발생: ${e.message}", e)
            }
          }

          val result: WritableMap = Arguments.createMap()
          result.putBoolean("connected", isConnected)
          result.putString("host", capturedHost)
          result.putInt("port", capturedPort)
          promise.resolve(result)
        }, 500) // Wait 500ms for connection to establish / 연결이 설정될 때까지 500ms 대기
      } else {
        android.util.Log.e("ChromeRemoteDevToolsInspectorModule", "Failed to create connection object / 연결 객체 생성 실패")
        promise.reject("CONNECTION_FAILED", "Failed to connect to Chrome Remote DevTools server / Chrome Remote DevTools 서버에 연결하지 못했습니다")
      }
    } catch (e: Exception) {
      android.util.Log.e("ChromeRemoteDevToolsInspectorModule", "Exception in connect() / connect()에서 예외 발생", e)
      promise.reject("CONNECTION_ERROR", "Error connecting to server / 서버 연결 중 오류: ${e.message}", e)
    }
  }

  /**
   * Disable debugger / 디버거 비활성화
   */
  @ReactMethod
  fun disableDebugger(promise: Promise) {
    // Note: Network interception is handled by C++ network hook (JSI level) / 참고: 네트워크 인터셉션은 C++ network 훅(JSI 레벨)에서 처리됩니다
    // Native OkHttp interceptor is no longer used / 네이티브 OkHttp 인터셉터는 더 이상 사용되지 않습니다
    // TODO: Implement Android debugger disable / Android 디버거 비활성화 구현 필요
    promise.resolve(null)
  }

  /**
   * Check if packager is disconnected / Packager 연결이 끊어졌는지 확인
   * @return true if disconnected / 연결이 끊어졌으면 true
   */
  @ReactMethod
  fun isPackagerDisconnected(promise: Promise) {
    val disconnected = ChromeRemoteDevToolsInspector.isPackagerDisconnected()
    promise.resolve(disconnected)
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

  /**
   * Send CDP message to Inspector WebSocket / Inspector WebSocket으로 CDP 메시지 전송
   */
  @ReactMethod
  fun sendCDPMessage(serverHost: String, serverPort: Int, message: String, promise: Promise) {
    try {
      val context = reactApplicationContext
      if (context == null) {
        promise.reject("NO_CONTEXT", "React application context is null")
        return
      }

      ChromeRemoteDevToolsInspector.sendCDPMessage(
        context = context,
        serverHost = serverHost,
        serverPort = serverPort,
        message = message
      )
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("SEND_ERROR", "Error sending CDP message: ${e.message}", e)
    }
  }
}

