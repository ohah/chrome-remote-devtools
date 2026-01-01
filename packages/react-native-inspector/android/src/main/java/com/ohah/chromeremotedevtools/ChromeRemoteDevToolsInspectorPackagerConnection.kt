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
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import java.util.concurrent.TimeUnit

/**
 * Chrome Remote DevTools Inspector Packager Connection / Chrome Remote DevTools Inspector Packager 연결
 * Manages WebSocket connection to Chrome Remote DevTools server / Chrome Remote DevTools 서버로의 WebSocket 연결 관리
 */
class ChromeRemoteDevToolsInspectorPackagerConnection(
  private val url: String,
  private val deviceName: String,
  private val appName: String,
  private val deviceId: String
) {
  private var webSocket: WebSocket? = null
  private var isConnected: Boolean = false
  private val client = OkHttpClient.Builder()
    .connectTimeout(10, TimeUnit.SECONDS)
    .readTimeout(10, TimeUnit.SECONDS)
    .writeTimeout(10, TimeUnit.SECONDS)
    .build()

  /**
   * Connect to WebSocket server / WebSocket 서버에 연결
   */
  fun connect() {
    if (isConnected) {
      Log.d(TAG, "WebSocket already connected / WebSocket이 이미 연결되어 있습니다")
      return
    }

    Log.d(TAG, "Attempting to connect to WebSocket / WebSocket 연결 시도: $url")

    // Note: java.net.URL doesn't support ws:// protocol, but OkHttp does / 참고: java.net.URL은 ws:// 프로토콜을 지원하지 않지만 OkHttp는 지원합니다
    // So we skip URL validation and let OkHttp handle it / 따라서 URL 검증을 건너뛰고 OkHttp가 처리하도록 합니다
    if (!url.startsWith("ws://") && !url.startsWith("wss://")) {
      Log.e(TAG, "Invalid WebSocket URL / 잘못된 WebSocket URL: $url (must start with ws:// or wss://)")
      return
    }

    val request = Request.Builder()
      .url(url)
      .build()

    Log.d(TAG, "Creating WebSocket with OkHttp / OkHttp로 WebSocket 생성")

    webSocket = client.newWebSocket(request, object : WebSocketListener() {
      override fun onOpen(webSocket: WebSocket, response: Response) {
        isConnected = true
        Log.d(TAG, "WebSocket connected successfully / WebSocket 연결 성공")
        Log.d(TAG, "Response code: ${response.code}, message: ${response.message}")

        // Send Runtime.executionContextCreated after connection / 연결 후 Runtime.executionContextCreated 전송
        // Use a small delay to ensure WebSocket is fully ready / WebSocket이 완전히 준비되었는지 확인하기 위해 짧은 지연 사용
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
          if (isConnected) {
            sendExecutionContextCreated()
          }
        }, 100)
      }

      override fun onMessage(webSocket: WebSocket, text: String) {
        // Handle incoming CDP messages / 들어오는 CDP 메시지 처리
        Log.d(TAG, "Received message / 메시지 수신: $text")
      }

      override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
        isConnected = false
        val errorMessage = "WebSocket connection failed / WebSocket 연결 실패"
        Log.e(TAG, errorMessage, t)
        Log.e(TAG, "═══════════════════════════════════════════════════════════")
        Log.e(TAG, "WebSocket Connection Failure Details / WebSocket 연결 실패 상세")
        Log.e(TAG, "═══════════════════════════════════════════════════════════")
        Log.e(TAG, "URL: $url")
        Log.e(TAG, "Error type: ${t.javaClass.simpleName}")
        Log.e(TAG, "Error message: ${t.message}")
        if (response != null) {
          Log.e(TAG, "HTTP Response code: ${response.code}")
          Log.e(TAG, "HTTP Response message: ${response.message}")
          Log.e(TAG, "HTTP Response headers: ${response.headers}")
        } else {
          Log.e(TAG, "No HTTP response (connection failed before HTTP handshake) / HTTP 핸드셰이크 전에 연결 실패")
        }
        if (t.cause != null) {
          Log.e(TAG, "Cause type: ${t.cause?.javaClass?.simpleName}")
          Log.e(TAG, "Cause message: ${t.cause?.message}")
        }
        Log.e(TAG, "Stack trace:")
        t.printStackTrace()
        Log.e(TAG, "═══════════════════════════════════════════════════════════")
      }

      override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
        isConnected = false
        Log.d(TAG, "WebSocket closing / WebSocket 종료 중: code=$code, reason=$reason")
      }

      override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
        isConnected = false
        Log.d(TAG, "WebSocket closed / WebSocket 종료됨: code=$code, reason=$reason")
      }
    })

    Log.d(TAG, "WebSocket creation initiated / WebSocket 생성 시작됨")
  }

  /**
   * Check if connected / 연결 상태 확인
   */
  fun isConnected(): Boolean = isConnected

  /**
   * Close connection quietly / 조용히 연결 종료
   */
  fun closeQuietly() {
    webSocket?.close(1000, "Normal closure / 정상 종료")
    isConnected = false
  }

  /**
   * Send CDP message / CDP 메시지 전송
   */
  fun sendCDPMessage(message: String) {
    if (isConnected && webSocket != null) {
      webSocket?.send(message)
    } else {
      Log.w(TAG, "Cannot send message, WebSocket not connected / 메시지를 전송할 수 없습니다. WebSocket이 연결되지 않았습니다")
    }
  }

  /**
   * Send Runtime.executionContextCreated event / Runtime.executionContextCreated 이벤트 전송
   */
  private fun sendExecutionContextCreated() {
    val executionContext = org.json.JSONObject().apply {
      put("id", 1)
      put("origin", "react-native://")
      put("name", "React Native")
      put("auxData", org.json.JSONObject().apply {
        put("isDefault", true)
      })
    }

    val cdpMessage = org.json.JSONObject().apply {
      put("method", "Runtime.executionContextCreated")
      put("params", org.json.JSONObject().apply {
        put("context", executionContext)
      })
    }

    sendCDPMessage(cdpMessage.toString())
  }

  companion object {
    private const val TAG = "ChromeRemoteDevToolsInspectorPackagerConnection"
  }
}

