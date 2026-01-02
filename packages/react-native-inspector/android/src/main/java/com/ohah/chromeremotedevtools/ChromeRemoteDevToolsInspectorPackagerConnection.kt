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
        Log.d(TAG, "WebSocket instance / WebSocket 인스턴스: $webSocket")
        Log.d(TAG, "WebSocket stored / WebSocket 저장됨: ${this@ChromeRemoteDevToolsInspectorPackagerConnection.webSocket != null}")
        Log.d(TAG, "Is connected flag / 연결 플래그: $isConnected")
        Log.d(TAG, "Response headers / 응답 헤더: ${response.headers}")
      }

      override fun onMessage(webSocket: WebSocket, text: String) {
        // Handle incoming CDP messages / 들어오는 CDP 메시지 처리
        Log.d(TAG, "Received message / 메시지 수신: $text")
        Log.d(TAG, "Message length / 메시지 길이: ${text.length}")
        Log.d(TAG, "Is connected / 연결 상태: $isConnected")

        try {
          val message = org.json.JSONObject(text)
          Log.d(TAG, "Parsed JSON successfully / JSON 파싱 성공")
          Log.d(TAG, "Has method field / method 필드 존재: ${message.has("method")}")

          // Handle CDP requests (messages with id field) / CDP 요청 처리 (id 필드가 있는 메시지)
          if (message.has("id")) {
            val requestId = message.getInt("id")
            Log.d(TAG, "CDP request received / CDP 요청 수신: id=$requestId")

            if (message.has("method")) {
              val method = message.getString("method")
              Log.d(TAG, "Method: $method")

              // Handle Page.getResourceTree request / Page.getResourceTree 요청 처리
              if (method == "Page.getResourceTree") {
                Log.d(TAG, "Page.getResourceTree detected! / Page.getResourceTree 감지됨!")
                sendPageGetResourceTreeResponse(requestId)
                return
              }

              // Check if this is Runtime.enable command / Runtime.enable 명령인지 확인
              if (method == "Runtime.enable") {
                Log.d(TAG, "Runtime.enable detected! / Runtime.enable 감지됨!")
                // Runtime.enable이 전송되면 executionContextCreated 전송 / Runtime.enable이 전송되면 executionContextCreated 전송
                // Use a small delay to ensure Runtime.enable is processed first / Runtime.enable이 먼저 처리되도록 짧은 지연 사용
                android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                  if (isConnected) {
                    Log.d(TAG, "Runtime.enable detected, sending Runtime.executionContextCreated / Runtime.enable 감지됨, Runtime.executionContextCreated 전송")
                    sendExecutionContextCreated()
                  } else {
                    Log.w(TAG, "Not connected when trying to send executionContextCreated / executionContextCreated 전송 시도 시 연결되지 않음")
                  }
                }, 50)
              }
            }
          } else if (message.has("method")) {
            // Handle CDP events (messages without id field) / CDP 이벤트 처리 (id 필드가 없는 메시지)
            val method = message.getString("method")
            Log.d(TAG, "CDP event received / CDP 이벤트 수신: $method")
          } else {
            Log.d(TAG, "Message has no method field / 메시지에 method 필드 없음")
          }
        } catch (e: Exception) {
          // Log parse errors for debugging / 디버깅을 위해 파싱 에러 로깅
          Log.e(TAG, "Failed to parse message / 메시지 파싱 실패: ${e.message}", e)
          Log.e(TAG, "Message content / 메시지 내용: $text")
        }
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
        Log.e(TAG, "WebSocket instance / WebSocket 인스턴스: $webSocket")
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
        Log.d(TAG, "WebSocket instance / WebSocket 인스턴스: $webSocket")
      }

      override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
        isConnected = false
        Log.d(TAG, "WebSocket closed / WebSocket 종료됨: code=$code, reason=$reason")
        Log.d(TAG, "WebSocket instance / WebSocket 인스턴스: $webSocket")
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
    Log.d(TAG, "sendCDPMessage called / sendCDPMessage 호출됨")
    Log.d(TAG, "Is connected / 연결 상태: $isConnected")
    Log.d(TAG, "WebSocket is null / WebSocket null 여부: ${webSocket == null}")
    if (isConnected && webSocket != null) {
      try {
        Log.d(TAG, "Attempting to send message / 메시지 전송 시도")
        val sent = webSocket?.send(message) ?: false
        if (sent) {
          Log.d(TAG, "CDP message sent successfully / CDP 메시지 전송 성공: ${message.take(100)}...")
        } else {
          Log.w(TAG, "Failed to send CDP message (send returned false) / CDP 메시지 전송 실패 (send가 false 반환): ${message.take(100)}...")
        }
      } catch (e: Exception) {
        Log.e(TAG, "Exception while sending CDP message / CDP 메시지 전송 중 예외 발생", e)
      }
    } else {
      Log.w(TAG, "Cannot send message, WebSocket not connected / 메시지를 전송할 수 없습니다. WebSocket이 연결되지 않았습니다 (isConnected=$isConnected, webSocket=${webSocket != null})")
    }
  }

  /**
   * Send Runtime.executionContextCreated event / Runtime.executionContextCreated 이벤트 전송
   */
  private fun sendExecutionContextCreated() {
    Log.d(TAG, "sendExecutionContextCreated called / sendExecutionContextCreated 호출됨")
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

    val messageStr = cdpMessage.toString()
    Log.d(TAG, "Sending Runtime.executionContextCreated / Runtime.executionContextCreated 전송: $messageStr")
    sendCDPMessage(messageStr)
  }

  /**
   * Send Page.getResourceTree response / Page.getResourceTree 응답 전송
   * This provides a minimal resource tree for React Native / React Native를 위한 최소한의 리소스 트리 제공
   */
  private fun sendPageGetResourceTreeResponse(requestId: Int) {
    Log.d(TAG, "sendPageGetResourceTreeResponse called / sendPageGetResourceTreeResponse 호출됨: requestId=$requestId")

    // Create minimal frame tree for React Native / React Native를 위한 최소한의 프레임 트리 생성
    val frame = org.json.JSONObject().apply {
      put("id", "1")
      put("mimeType", "application/javascript")
      put("securityOrigin", "react-native://")
      put("url", "react-native://")
    }

    val frameTree = org.json.JSONObject().apply {
      put("frame", frame)
      put("resources", org.json.JSONArray()) // Empty resources array / 빈 리소스 배열
    }

    val response = org.json.JSONObject().apply {
      put("id", requestId)
      put("result", org.json.JSONObject().apply {
        put("frameTree", frameTree)
      })
    }

    val messageStr = response.toString()
    Log.d(TAG, "Sending Page.getResourceTree response / Page.getResourceTree 응답 전송: $messageStr")
    sendCDPMessage(messageStr)
  }

  companion object {
    private const val TAG = "ChromeRemoteDevToolsInspectorPackagerConnection"
  }
}

