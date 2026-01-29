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
 * WebSocket adapter for C++ InspectorPackagerConnection / C++ InspectorPackagerConnection용 WebSocket 어댑터
 * This adapts OkHttp WebSocket to C++ IWebSocket interface / 이것은 OkHttp WebSocket을 C++ IWebSocket 인터페이스에 맞춥니다
 */
class ChromeRemoteDevToolsInspectorWebSocketAdapter(
  private val url: String,
  private val onOpen: () -> Unit,
  private val onMessage: (String) -> Unit,
  private val onError: (String) -> Unit,
  private val onClose: () -> Unit
) {
  private var webSocket: WebSocket? = null
  private var isConnected: Boolean = false
  private val client = OkHttpClient.Builder()
    .connectTimeout(10, TimeUnit.SECONDS)
    .readTimeout(10, TimeUnit.SECONDS)
    .writeTimeout(10, TimeUnit.SECONDS)
    .build()

  fun connect() {
    if (isConnected) {
      Log.d(TAG, "WebSocket already connected / WebSocket이 이미 연결되어 있습니다")
      return
    }

    Log.d(TAG, "Attempting to connect to WebSocket / WebSocket 연결 시도: $url")

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
        onOpen()
      }

      override fun onMessage(webSocket: WebSocket, text: String) {
        Log.d(TAG, "Received message / 메시지 수신: $text")
        onMessage(text)
      }

      override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
        isConnected = false
        val errorMessage = "WebSocket connection failed / WebSocket 연결 실패: ${t.message}"
        Log.e(TAG, errorMessage, t)
        onError(errorMessage)
      }

      override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
        isConnected = false
        Log.d(TAG, "WebSocket closing / WebSocket 종료 중: code=$code, reason=$reason")
      }

      override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
        isConnected = false
        Log.d(TAG, "WebSocket closed / WebSocket 종료됨: code=$code, reason=$reason")
        onClose()
      }
    })

    Log.d(TAG, "WebSocket creation initiated / WebSocket 생성 시작됨")
  }

  fun send(message: String) {
    if (isConnected && webSocket != null) {
      webSocket?.send(message)
      Log.d(TAG, "Message sent via WebSocket / WebSocket을 통해 메시지 전송")
    } else {
      Log.w(TAG, "Cannot send message, WebSocket not connected / 메시지를 전송할 수 없습니다. WebSocket이 연결되지 않았습니다")
    }
  }

  fun close() {
    webSocket?.close(1000, "Normal closure / 정상 종료")
    isConnected = false
  }

  fun isConnected(): Boolean = isConnected

  companion object {
    private const val TAG = "ChromeRemoteDevToolsInspectorWebSocketAdapter"
  }
}

