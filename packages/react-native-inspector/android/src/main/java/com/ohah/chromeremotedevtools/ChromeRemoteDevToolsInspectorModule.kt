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
class ChromeRemoteDevToolsInspectorModule(reactApplicationContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactApplicationContext) {

  private var connection: ChromeRemoteDevToolsInspectorPackagerConnection? = null

  override fun getName(): String {
    return NAME
  }

  companion object {
    const val NAME = "ChromeRemoteDevToolsInspector"

    // Store module instance for CDP message handling / CDP 메시지 처리를 위한 모듈 인스턴스 저장
    @Volatile
    private var instance: ChromeRemoteDevToolsInspectorModule? = null

    /**
     * Handle CDP message from WebSocket / WebSocket으로부터 CDP 메시지 처리
     * Routes to JavaScript handler based on method name / 메서드 이름을 기준으로 JavaScript 핸들러로 라우팅
     * Uses JSI for direct JavaScript handler invocation (same as iOS) / iOS와 동일하게 JSI를 사용하여 JavaScript 핸들러 직접 호출
     */
    fun handleCDPMessage(messageJson: String) {
      try {
        // Use JSI-based handler via native C++ code / 네이티브 C++ 코드를 통해 JSI 기반 핸들러 사용
        // This is more reliable than evaluateScript and matches iOS behavior / 이것은 evaluateScript보다 안정적이며 iOS 동작과 일치함
        ChromeRemoteDevToolsLogHookJNI.nativeHandleCDPMessage(messageJson)
        android.util.Log.d(NAME, "Called JavaScript CDP message handler via JSI / JSI를 통해 JavaScript CDP 메시지 핸들러 호출됨")
      } catch (e: Exception) {
        android.util.Log.e(NAME, "Failed to call JavaScript CDP message handler via JSI / JSI를 통해 JavaScript CDP 메시지 핸들러 호출 실패: ${e.message}", e)
        // Fallback to old method if JSI fails / JSI가 실패하면 이전 방법으로 폴백
        handleCDPMessageFallback(messageJson)
      }
    }

    /**
     * Fallback method for CDP message handling using evaluateScript / evaluateScript를 사용한 CDP 메시지 처리 폴백 메서드
     * Used when JSI-based handler fails / JSI 기반 핸들러가 실패할 때 사용됨
     */
    private fun handleCDPMessageFallback(messageJson: String) {
      val module = instance
      if (module == null) {
        android.util.Log.w(NAME, "Module instance not available for CDP message handling / CDP 메시지 처리를 위한 모듈 인스턴스를 사용할 수 없음")
        return
      }

      val context = module.reactApplicationContext
      if (context == null) {
        android.util.Log.w(NAME, "React application context is null / React 애플리케이션 컨텍스트가 null입니다")
        return
      }

      // Call JavaScript handler via Runtime.evaluate / Runtime.evaluate를 통해 JavaScript 핸들러 호출
      context.runOnJSQueueThread {
        try {
          val catalystInstance = context.catalystInstance
          if (catalystInstance != null) {
            // Use Base64 encoding to safely pass JSON string / JSON 문자열을 안전하게 전달하기 위해 Base64 인코딩 사용
            // This avoids all escaping issues / 모든 이스케이프 문제를 피함
            try {
              // Encode JSON string to Base64 / JSON 문자열을 Base64로 인코딩
              val base64Json = android.util.Base64.encodeToString(
                messageJson.toByteArray(Charsets.UTF_8),
                android.util.Base64.NO_WRAP
              )

              // Use evaluateScript to call global function / 전역 함수를 호출하기 위해 evaluateScript 사용
              // Decode Base64 in JavaScript and pass to handler / JavaScript에서 Base64를 디코딩하여 핸들러에 전달
              val script = """
                (function() {
                  const handler = typeof window !== 'undefined' ? window.__CDP_MESSAGE_HANDLER__ : typeof global !== 'undefined' ? global.__CDP_MESSAGE_HANDLER__ : null;
                  if (handler && typeof handler === 'function') {
                    try {
                      // Decode Base64 to get original JSON string / Base64를 디코딩하여 원본 JSON 문자열 가져오기
                      const base64Json = "$base64Json";
                      const jsonString = atob(base64Json);
                      handler(jsonString);
                    } catch (e) {
                      console.error('[CDPMessageHandler] Error calling handler:', e);
                    }
                  }
                })();
              """.trimIndent()

              // Note: evaluateScript might not be available in all React Native versions
              // 참고: evaluateScript는 모든 React Native 버전에서 사용 가능하지 않을 수 있음
              // Fallback: Use RCTDeviceEventEmitter if evaluateScript fails
              // 폴백: evaluateScript가 실패하면 RCTDeviceEventEmitter 사용
              try {
                val evaluateMethod = catalystInstance.javaClass.getMethod("evaluateScript", String::class.java, String::class.java, String::class.java, Boolean::class.java)
                evaluateMethod.invoke(catalystInstance, script, null, "", false)
                android.util.Log.d(NAME, "Called JavaScript CDP message handler via evaluateScript (fallback) / evaluateScript를 통해 JavaScript CDP 메시지 핸들러 호출됨 (폴백)")
              } catch (e: NoSuchMethodException) {
                android.util.Log.w(NAME, "evaluateScript not available / evaluateScript를 사용할 수 없음")
                android.util.Log.w(NAME, "CDP message handler call skipped (evaluateScript not available) / CDP 메시지 핸들러 호출 건너뜀 (evaluateScript를 사용할 수 없음)")
              }
            } catch (e: Exception) {
              android.util.Log.e(NAME, "Failed to encode JSON message to Base64 / JSON 메시지를 Base64로 인코딩 실패: ${e.message}", e)
              android.util.Log.e(NAME, "Message content / 메시지 내용: $messageJson")
            }
          } else {
            android.util.Log.w(NAME, "CatalystInstance is null / CatalystInstance가 null입니다")
          }
        } catch (e: Exception) {
          android.util.Log.e(NAME, "Failed to call JavaScript CDP message handler / JavaScript CDP 메시지 핸들러 호출 실패", e)
        }
      }
    }

    /**
     * Set module instance / 모듈 인스턴스 설정
     */
    fun setInstance(module: ChromeRemoteDevToolsInspectorModule?) {
      instance = module
    }
  }

  init {
    // Register instance / 인스턴스 등록
    setInstance(this)
  }

  /**
   * Connect to Chrome Remote DevTools server / Chrome Remote DevTools 서버에 연결
   * @param serverHost Server host (e.g., "localhost" or "192.168.1.100") / 서버 호스트 (예: "localhost" 또는 "192.168.1.100")
   * @param serverPort Server port (e.g., 8080) / 서버 포트 (예: 8080)
   */
  @ReactMethod
  fun connect(serverHost: String, serverPort: Int, promise: Promise) {
    try {
      val context: ReactApplicationContext = reactApplicationContext
        ?: run {
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

        // Install JSI-level console and network hooks / JSI 레벨 console 및 network 훅 설치
        android.util.Log.d("ChromeRemoteDevToolsInspectorModule", "Attempting to install JSI hooks / JSI 훅 설치 시도 중")
        try {
          // Try to get RuntimeExecutor from CatalystInstance (Old Architecture) / CatalystInstance에서 RuntimeExecutor 가져오기 시도 (Old Architecture)
          var runtimeExecutor: Any? = null

          try {
            val catalystInstance = context.catalystInstance
            android.util.Log.d("ChromeRemoteDevToolsInspectorModule", "CatalystInstance: ${if (catalystInstance != null) "not null" else "null"}")
            if (catalystInstance != null) {
              runtimeExecutor = catalystInstance.runtimeExecutor
              android.util.Log.d("ChromeRemoteDevToolsInspectorModule", "RuntimeExecutor from CatalystInstance: ${if (runtimeExecutor != null) "not null" else "null"}")
            }
          } catch (e: Exception) {
            android.util.Log.d("ChromeRemoteDevToolsInspectorModule", "CatalystInstance not available (Bridgeless mode?) / CatalystInstance를 사용할 수 없음 (Bridgeless 모드?): ${e.message}")
          }

          // If CatalystInstance failed, try ReactHost (Bridgeless/New Architecture) / CatalystInstance가 실패하면 ReactHost 시도 (Bridgeless/New Architecture)
          if (runtimeExecutor == null) {
            try {
              // Try to get ReactHost using reflection / 리플렉션을 사용하여 ReactHost 가져오기 시도
              var reactHost: Any? = null

              // Try getReactHost() method first / 먼저 getReactHost() 메서드 시도
              try {
                val getReactHostMethod = context.javaClass.getMethod("getReactHost")
                reactHost = getReactHostMethod.invoke(context)
                android.util.Log.d("ChromeRemoteDevToolsInspectorModule", "ReactHost from getReactHost(): ${if (reactHost != null) "not null" else "null"}")
              } catch (e: NoSuchMethodException) {
                // Try reactHost field / reactHost 필드 시도
                try {
                  val reactHostField = context.javaClass.getDeclaredField("reactHost")
                  reactHostField.isAccessible = true
                  reactHost = reactHostField.get(context)
                  android.util.Log.d("ChromeRemoteDevToolsInspectorModule", "ReactHost from field: ${if (reactHost != null) "not null" else "null"}")
                } catch (e2: Exception) {
                  android.util.Log.d("ChromeRemoteDevToolsInspectorModule", "ReactHost field not found / ReactHost 필드를 찾을 수 없음: ${e2.message}")
                }
              }

              if (reactHost != null) {
                // Get RuntimeExecutor from ReactHost / ReactHost에서 RuntimeExecutor 가져오기
                try {
                  val runtimeExecutorMethod = reactHost.javaClass.getMethod("getRuntimeExecutor")
                  runtimeExecutor = runtimeExecutorMethod.invoke(reactHost)
                  android.util.Log.d("ChromeRemoteDevToolsInspectorModule", "RuntimeExecutor from ReactHost: ${if (runtimeExecutor != null) "not null" else "null"}")
                } catch (e: Exception) {
                  android.util.Log.w("ChromeRemoteDevToolsInspectorModule", "Failed to get RuntimeExecutor from ReactHost / ReactHost에서 RuntimeExecutor를 가져오지 못함: ${e.message}")
                }
              } else {
                android.util.Log.w("ChromeRemoteDevToolsInspectorModule", "ReactHost is null / ReactHost가 null입니다")
              }
            } catch (e: Exception) {
              android.util.Log.w("ChromeRemoteDevToolsInspectorModule", "Failed to get ReactHost / ReactHost를 가져오지 못함: ${e.message}")
            }
          }

          if (runtimeExecutor != null) {
            // Call JNI directly to install JSI hook / JSI 훅을 설치하기 위해 JNI를 직접 호출
            android.util.Log.d("ChromeRemoteDevToolsInspectorModule", "Calling nativeHookJSILog / nativeHookJSILog 호출 중")
            try {
              val jsiHooked = ChromeRemoteDevToolsLogHookJNI.nativeHookJSILog(runtimeExecutor)
              android.util.Log.d("ChromeRemoteDevToolsInspectorModule", "nativeHookJSILog returned: $jsiHooked")
              if (jsiHooked) {
                android.util.Log.d("ChromeRemoteDevToolsInspectorModule", "JSI-level logging hook installed successfully / JSI 레벨 로깅 훅이 성공적으로 설치됨")
              } else {
                android.util.Log.w("ChromeRemoteDevToolsInspectorModule", "Failed to install JSI-level logging hook / JSI 레벨 로깅 훅 설치 실패")
              }
            } catch (e: Exception) {
              android.util.Log.e("ChromeRemoteDevToolsInspectorModule", "Exception while calling nativeHookJSILog / nativeHookJSILog 호출 중 예외 발생: ${e.message}", e)
            }

            // Note: Redux DevTools server info is now set via JavaScript polyfill
            // C++ nativeSetReduxDevToolsServerInfo removed to avoid race condition crash
            // 참고: Redux DevTools 서버 정보는 이제 JavaScript polyfill을 통해 설정됩니다
            // race condition 크래시를 피하기 위해 C++ nativeSetReduxDevToolsServerInfo 제거됨
            android.util.Log.d("ChromeRemoteDevToolsInspectorModule", "Redux DevTools will use JS polyfill for server info")
          } else {
            android.util.Log.w("ChromeRemoteDevToolsInspectorModule", "RuntimeExecutor is null, cannot hook JSI log / RuntimeExecutor가 null입니다, JSI 로그를 훅할 수 없습니다")
          }
        } catch (e: Exception) {
          android.util.Log.e("ChromeRemoteDevToolsInspectorModule", "Exception while hooking JSI log / JSI 로그 훅 중 예외 발생: ${e.message}", e)
        }

        // Check WebSocket connection status after delay with longer timeout / 더 긴 타임아웃으로 지연 후 WebSocket 연결 상태 확인
        // Increase delay to 2 seconds to allow more time for connection / 연결에 더 많은 시간을 주기 위해 지연을 2초로 증가
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(Runnable {
          val isConnected = connection?.isConnected() ?: false
          android.util.Log.d("ChromeRemoteDevToolsInspectorModule", "Connection status after delay / 지연 후 연결 상태: $isConnected")

          // 연결 실패 시 Promise reject / 연결 실패 시 Promise reject
          if (!isConnected) {
            android.util.Log.w("ChromeRemoteDevToolsInspectorModule", "⚠️ WebSocket not connected after 2000ms delay / 2000ms 지연 후에도 WebSocket이 연결되지 않음")
            android.util.Log.w("ChromeRemoteDevToolsInspectorModule", "Check Android logcat for WebSocket errors / WebSocket 에러를 확인하려면 Android logcat을 확인하세요")
            android.util.Log.w("ChromeRemoteDevToolsInspectorModule", "Command: adb logcat | grep ChromeRemoteDevTools")
            val serverAddress = "${capturedHost}:${capturedPort}"
            android.util.Log.w("ChromeRemoteDevToolsInspectorModule", "Server should be running on $serverAddress")
            promise.reject(
              "WEBSOCKET_NOT_CONNECTED",
              "WebSocket connection failed. Please ensure the server is running on ${serverAddress} / WebSocket 연결 실패. 서버가 ${serverAddress}에서 실행 중인지 확인하세요"
            )
            return@Runnable
          }

          android.util.Log.d("ChromeRemoteDevToolsInspectorModule", "✅ WebSocket connected successfully / WebSocket 연결 성공")
          promise.resolve(null)
        }, 2000) // Wait 2 seconds for connection to establish / 연결이 설정될 때까지 2초 대기
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
      val context: ReactApplicationContext = reactApplicationContext
        ?: run {
          promise.reject("NO_CONTEXT", "React application context is null")
          return
        }

      // Check connection status before sending / 전송 전 연결 상태 확인
      val normalizedHost = ChromeRemoteDevToolsInspector.normalizeServerHost(serverHost)
      val deviceName = android.os.Build.MODEL
      val appName = context.packageName
      val deviceId = ChromeRemoteDevToolsInspector.getDeviceId(context)
      val url = ChromeRemoteDevToolsInspector.getInspectorDeviceUrl(normalizedHost, serverPort, deviceName, appName, deviceId)

      // Check connection status / 연결 상태 확인
      val connection = ChromeRemoteDevToolsInspector.getConnection(url)
      if (connection == null || !connection.isConnected()) {
        promise.reject(
          "NOT_CONNECTED",
          "WebSocket is not connected. Please ensure the server is running on ${serverHost}:${serverPort} / WebSocket이 연결되지 않았습니다. 서버가 ${serverHost}:${serverPort}에서 실행 중인지 확인하세요"
        )
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

  /**
   * Enable console hook / console 훅 활성화
   */
  @ReactMethod
  fun enableConsoleHook(promise: Promise) {
    try {
      val context: ReactApplicationContext = reactApplicationContext
        ?: run {
          promise.reject("NO_CONTEXT", "React application context is null")
          return
        }

      val catalystInstance = context.catalystInstance
      if (catalystInstance == null) {
        promise.reject("NO_CATALYST", "CatalystInstance is null")
        return
      }

      val runtimeExecutor = catalystInstance.runtimeExecutor
      if (runtimeExecutor == null) {
        promise.reject("NO_RUNTIME", "RuntimeExecutor is null")
        return
      }

      val success = ChromeRemoteDevToolsLogHookJNI.nativeEnableConsoleHook(runtimeExecutor)
      promise.resolve(success)
    } catch (e: Exception) {
      promise.reject("ENABLE_CONSOLE_HOOK_ERROR", "Error enabling console hook: ${e.message}", e)
    }
  }

  /**
   * Disable console hook / console 훅 비활성화
   */
  @ReactMethod
  fun disableConsoleHook(promise: Promise) {
    try {
      val context: ReactApplicationContext = reactApplicationContext
        ?: run {
          promise.reject("NO_CONTEXT", "React application context is null")
          return
        }

      val catalystInstance = context.catalystInstance
      if (catalystInstance == null) {
        promise.reject("NO_CATALYST", "CatalystInstance is null")
        return
      }

      val runtimeExecutor = catalystInstance.runtimeExecutor
      if (runtimeExecutor == null) {
        promise.reject("NO_RUNTIME", "RuntimeExecutor is null")
        return
      }

      val success = ChromeRemoteDevToolsLogHookJNI.nativeDisableConsoleHook(runtimeExecutor)
      promise.resolve(success)
    } catch (e: Exception) {
      promise.reject("DISABLE_CONSOLE_HOOK_ERROR", "Error disabling console hook: ${e.message}", e)
    }
  }

  /**
   * Enable network hook / 네트워크 훅 활성화
   */
  @ReactMethod
  fun enableNetworkHook(promise: Promise) {
    try {
      val context: ReactApplicationContext = reactApplicationContext
        ?: run {
          promise.reject("NO_CONTEXT", "React application context is null")
          return
        }

      val catalystInstance = context.catalystInstance
      if (catalystInstance == null) {
        promise.reject("NO_CATALYST", "CatalystInstance is null")
        return
      }

      val runtimeExecutor = catalystInstance.runtimeExecutor
      if (runtimeExecutor == null) {
        promise.reject("NO_RUNTIME", "RuntimeExecutor is null")
        return
      }

      val success = ChromeRemoteDevToolsLogHookJNI.nativeEnableNetworkHook(runtimeExecutor)
      promise.resolve(success)
    } catch (e: Exception) {
      promise.reject("ENABLE_NETWORK_HOOK_ERROR", "Error enabling network hook: ${e.message}", e)
    }
  }

  /**
   * Disable network hook / 네트워크 훅 비활성화
   */
  @ReactMethod
  fun disableNetworkHook(promise: Promise) {
    try {
      val context: ReactApplicationContext = reactApplicationContext
        ?: run {
          promise.reject("NO_CONTEXT", "React application context is null")
          return
        }

      val catalystInstance = context.catalystInstance
      if (catalystInstance == null) {
        promise.reject("NO_CATALYST", "CatalystInstance is null")
        return
      }

      val runtimeExecutor = catalystInstance.runtimeExecutor
      if (runtimeExecutor == null) {
        promise.reject("NO_RUNTIME", "RuntimeExecutor is null")
        return
      }

      val success = ChromeRemoteDevToolsLogHookJNI.nativeDisableNetworkHook(runtimeExecutor)
      promise.resolve(success)
    } catch (e: Exception) {
      promise.reject("DISABLE_NETWORK_HOOK_ERROR", "Error disabling network hook: ${e.message}", e)
    }
  }

  /**
   * Check if console hook is enabled / console 훅이 활성화되어 있는지 확인
   */
  @ReactMethod
  fun isConsoleHookEnabled(promise: Promise) {
    try {
      val context: ReactApplicationContext = reactApplicationContext
        ?: run {
          promise.reject("NO_CONTEXT", "React application context is null")
          return
        }

      val catalystInstance = context.catalystInstance
      if (catalystInstance == null) {
        promise.reject("NO_CATALYST", "CatalystInstance is null")
        return
      }

      val runtimeExecutor = catalystInstance.runtimeExecutor
      if (runtimeExecutor == null) {
        promise.reject("NO_RUNTIME", "RuntimeExecutor is null")
        return
      }

      val enabled = ChromeRemoteDevToolsLogHookJNI.nativeIsConsoleHookEnabled(runtimeExecutor)
      promise.resolve(enabled)
    } catch (e: Exception) {
      promise.reject("IS_CONSOLE_HOOK_ENABLED_ERROR", "Error checking console hook status: ${e.message}", e)
    }
  }

  /**
   * Check if network hook is enabled / 네트워크 훅이 활성화되어 있는지 확인
   */
  @ReactMethod
  fun isNetworkHookEnabled(promise: Promise) {
    try {
      val context: ReactApplicationContext = reactApplicationContext
        ?: run {
          promise.reject("NO_CONTEXT", "React application context is null")
          return
        }

      val catalystInstance = context.catalystInstance
      if (catalystInstance == null) {
        promise.reject("NO_CATALYST", "CatalystInstance is null")
        return
      }

      val runtimeExecutor = catalystInstance.runtimeExecutor
      if (runtimeExecutor == null) {
        promise.reject("NO_RUNTIME", "RuntimeExecutor is null")
        return
      }

      val enabled = ChromeRemoteDevToolsLogHookJNI.nativeIsNetworkHookEnabled(runtimeExecutor)
      promise.resolve(enabled)
    } catch (e: Exception) {
      promise.reject("IS_NETWORK_HOOK_ENABLED_ERROR", "Error checking network hook status: ${e.message}", e)
    }
  }
}

