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
import okhttp3.Interceptor
import okhttp3.Request
import okhttp3.Response
import okhttp3.ResponseBody
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.atomic.AtomicLong

/**
 * Network interceptor for intercepting network requests / 네트워크 요청을 가로채기 위한 네트워크 인터셉터
 */
class ChromeRemoteDevToolsNetworkInterceptor(
  private val serverHost: String,
  private val serverPort: Int
) : Interceptor {

  private val requestMetadata = mutableMapOf<String, RequestMetadata>()

  /**
   * Request metadata / 요청 메타데이터
   */
  private data class RequestMetadata(
    val url: String,
    val method: String
  )

  companion object {
    private const val TAG = "ChromeRemoteDevToolsNetworkInterceptor"
    private var isEnabled = false
    private var globalServerHost: String? = null
    private var globalServerPort: Int = 0
    private var globalConnection: ChromeRemoteDevToolsInspectorPackagerConnection? = null
    private var interceptorInstance: ChromeRemoteDevToolsNetworkInterceptor? = null
    // Global request ID counter to ensure unique IDs across instances / 인스턴스 간 고유 ID 보장을 위한 전역 요청 ID 카운터
    private val requestIdCounter = AtomicLong(0)
    // Store response bodies by requestId / requestId별로 응답 본문 저장
    private val responseData = mutableMapOf<String, String>()

    /**
     * Enable network interception / 네트워크 인터셉션 활성화
     */
    fun enable(serverHost: String, serverPort: Int, connection: ChromeRemoteDevToolsInspectorPackagerConnection?) {
      Log.d(TAG, "enable() called / enable() 호출됨: serverHost=$serverHost, serverPort=$serverPort, connection=${connection != null}")

      if (isEnabled) {
        Log.d(TAG, "Network interception already enabled / 네트워크 인터셉션이 이미 활성화되어 있습니다")
        return
      }

      isEnabled = true
      globalServerHost = serverHost
      globalServerPort = serverPort
      globalConnection = connection

      // Create interceptor instance / 인터셉터 인스턴스 생성
      interceptorInstance = ChromeRemoteDevToolsNetworkInterceptor(serverHost, serverPort)
      Log.d(TAG, "Interceptor instance created / 인터셉터 인스턴스 생성됨")

      // Add interceptor to React Native's OkHttpClient using OkHttpClientFactory / OkHttpClientFactory를 사용하여 React Native의 OkHttpClient에 인터셉터 추가
      try {
        val okHttpClientProviderClass = Class.forName("com.facebook.react.modules.network.OkHttpClientProvider")
        val okHttpClientFactoryInterface = Class.forName("com.facebook.react.modules.network.OkHttpClientFactory")

        // Store previous factory if exists / 기존 factory가 있으면 저장
        var previousFactory: Any? = null
        try {
          val factoryField = okHttpClientProviderClass.getDeclaredField("factory")
          factoryField.isAccessible = true
          previousFactory = factoryField.get(null)
          Log.d(TAG, "Previous factory found / 기존 factory 발견: ${previousFactory != null}")
        } catch (e: Exception) {
          Log.d(TAG, "No previous factory or could not access field / 기존 factory가 없거나 필드에 접근할 수 없습니다: ${e.message}")
        }

        // Create factory instance using Proxy / Proxy를 사용하여 factory 인스턴스 생성
        val factoryInstance = java.lang.reflect.Proxy.newProxyInstance(
          okHttpClientFactoryInterface.classLoader,
          arrayOf(okHttpClientFactoryInterface)
        ) { proxy, method, args ->
          if (method.name == "createNewNetworkModuleClient") {
            Log.d(TAG, "createNewNetworkModuleClient called / createNewNetworkModuleClient 호출됨")

            // Use createClientBuilder() to avoid infinite recursion / 무한 재귀를 피하기 위해 createClientBuilder() 사용
            val createClientBuilderMethod = okHttpClientProviderClass.getMethod("createClientBuilder")
            val builder = createClientBuilderMethod.invoke(null) as okhttp3.OkHttpClient.Builder

            // If there was a previous factory, call it first to preserve its configuration / 기존 factory가 있으면 먼저 호출하여 설정 보존
            if (previousFactory != null) {
              try {
                val previousCreateMethod = previousFactory!!.javaClass.getMethod("createNewNetworkModuleClient")
                val previousClient = previousCreateMethod.invoke(previousFactory) as okhttp3.OkHttpClient
                Log.d(TAG, "Got client from previous factory / 기존 factory에서 클라이언트 가져옴: interceptors=${previousClient.interceptors.size}")

                // Copy interceptors from previous client / 기존 클라이언트에서 인터셉터 복사
                previousClient.interceptors.forEach { builder.addInterceptor(it) }
              } catch (e: Exception) {
                Log.w(TAG, "Could not use previous factory / 기존 factory를 사용할 수 없습니다: ${e.message}")
              }
            }

            // Add our interceptor / 우리 인터셉터 추가
            builder.addInterceptor(interceptorInstance!!)

            val newClient = builder.build()
            Log.d(TAG, "New OkHttpClient created / 새 OkHttpClient 생성됨: interceptors=${newClient.interceptors.size}")

            newClient
          } else {
            null
          }
        }

        // Set factory / factory 설정
        val setFactoryMethod = okHttpClientProviderClass.getMethod("setOkHttpClientFactory", okHttpClientFactoryInterface)
        setFactoryMethod.invoke(null, factoryInstance)

        // Clear cached client to force recreation / 캐시된 클라이언트를 지워서 재생성 강제
        try {
          val clientField = okHttpClientProviderClass.getDeclaredField("client")
          clientField.isAccessible = true
          clientField.set(null, null)
          Log.d(TAG, "Cleared cached OkHttpClient / 캐시된 OkHttpClient 지움")
        } catch (e: Exception) {
          Log.w(TAG, "Could not clear cached client (this is OK if client not yet created) / 캐시된 클라이언트를 지울 수 없습니다 (클라이언트가 아직 생성되지 않은 경우 정상입니다): ${e.message}")
        }

        Log.d(TAG, "Network interception enabled using OkHttpClientFactory / OkHttpClientFactory를 사용하여 네트워크 인터셉션 활성화됨: $serverHost:$serverPort")
      } catch (e: ClassNotFoundException) {
        Log.e(TAG, "OkHttpClientProvider or OkHttpClientFactory not found / OkHttpClientProvider 또는 OkHttpClientFactory를 찾을 수 없습니다. React Native 네트워크 요청을 가로챌 수 없습니다.", e)
      } catch (e: NoSuchMethodException) {
        Log.e(TAG, "OkHttpClientProvider method not found / OkHttpClientProvider 메서드를 찾을 수 없습니다.", e)
      } catch (e: Exception) {
        Log.e(TAG, "Failed to add interceptor to OkHttpClient / OkHttpClient에 인터셉터 추가 실패", e)
      }
    }

    /**
     * Disable network interception / 네트워크 인터셉션 비활성화
     */
    fun disable() {
      if (!isEnabled) {
        Log.d(TAG, "Network interception already disabled / 네트워크 인터셉션이 이미 비활성화되어 있습니다")
        return
      }

      // Note: OkHttp doesn't provide a direct way to remove interceptors / 참고: OkHttp는 인터셉터를 직접 제거하는 방법을 제공하지 않습니다
      // We just disable the interceptor logic, and it will skip processing when isEnabled is false / 인터셉터 로직만 비활성화하고, isEnabled가 false일 때 처리를 건너뜁니다
      // The interceptor will remain in the client but won't do anything / 인터셉터는 클라이언트에 남아있지만 아무것도 하지 않습니다
      Log.d(TAG, "Network interceptor disabled (will skip processing) / 네트워크 인터셉터 비활성화 (처리 건너뜀)")

      // Clear stored response data / 저장된 응답 데이터 정리
      clearResponseData()

      isEnabled = false
      globalServerHost = null
      globalServerPort = 0
      globalConnection = null
      interceptorInstance = null
      Log.d(TAG, "Network interception disabled / 네트워크 인터셉션 비활성화")
    }

    /**
     * Check if network interception is enabled / 네트워크 인터셉션이 활성화되었는지 확인
     */
    fun isEnabled(): Boolean = isEnabled

    /**
     * Send CDP network event / CDP 네트워크 이벤트 전송
     */
    private fun sendCDPNetworkEvent(event: JSONObject) {
      if (!isEnabled) {
        Log.d(TAG, "Network interception not enabled / 네트워크 인터셉션이 활성화되지 않음")
        return
      }

      if (globalConnection == null) {
        Log.w(TAG, "Global connection is null / 전역 연결이 null입니다")
        return
      }

      if (!globalConnection!!.isConnected()) {
        Log.w(TAG, "Global connection is not connected / 전역 연결이 연결되지 않았습니다")
        return
      }

      try {
        val message = event.toString()
        val method = event.optString("method", "unknown")

        // Log message preview for debugging / 디버깅을 위해 메시지 미리보기 로그
        val messagePreview = if (message.length > 1000) {
          message.take(1000) + "... (truncated)"
        } else {
          message
        }
        Log.d(TAG, "Sending CDP network event / CDP 네트워크 이벤트 전송: method=$method, messageLength=${message.length}")
        Log.d(TAG, "CDP message preview / CDP 메시지 미리보기: $messagePreview")

        globalConnection!!.sendCDPMessage(message)
        Log.d(TAG, "CDP network event sent successfully / CDP 네트워크 이벤트 전송 성공: method=$method")
      } catch (e: Exception) {
        Log.e(TAG, "Failed to send CDP network event / CDP 네트워크 이벤트 전송 실패", e)
      }
    }

    /**
     * Get timestamp in seconds / 초 단위 타임스탬프 가져오기
     */
    private fun getTimestamp(): Double {
      return System.currentTimeMillis() / 1000.0
    }

    /**
     * Format headers to CDP format / 헤더를 CDP 형식으로 포맷팅
     */
    private fun formatHeaders(headers: okhttp3.Headers): JSONObject {
      val formatted = JSONObject()
      for (i in 0 until headers.size) {
        val name = headers.name(i)
        val value = headers.value(i)
        // Use original header name (CDP accepts any case) / 원본 헤더 이름 사용 (CDP는 모든 대소문자 허용)
        // Note: Some CDP implementations expect Title-Case, but we keep original for compatibility / 참고: 일부 CDP 구현은 Title-Case를 기대하지만 호환성을 위해 원본 유지
        formatted.put(name, value)
      }
      Log.d(TAG, "Formatted headers / 포맷된 헤더: count=${headers.size}, keys=${headers.names().joinToString(", ")}")
      return formatted
    }

    /**
     * Send Network.requestWillBeSent event / Network.requestWillBeSent 이벤트 전송
     */
    fun sendRequestWillBeSent(request: Request, requestId: String) {
      if (!isEnabled) {
        return
      }

      try {
        // Get request headers / 요청 헤더 가져오기
        val headers = formatHeaders(request.headers)
        Log.d(TAG, "Request headers formatted / 요청 헤더 포맷됨: requestId=$requestId, headerCount=${request.headers.size}")

        // Get request body / 요청 본문 가져오기
        val postData = request.body?.let { body ->
          try {
            val buffer = okio.Buffer()
            body.writeTo(buffer)
            buffer.readUtf8()
          } catch (e: Exception) {
            null
          }
        }

        val requestObj = JSONObject().apply {
          put("url", request.url.toString())
          put("method", request.method)
          put("headers", headers)
          if (postData != null) {
            put("postData", postData)
          } else {
            put("postData", JSONObject.NULL)
          }
        }

        // Log request object for debugging / 디버깅을 위해 요청 객체 로그
        val requestObjJson = requestObj.toString()
        Log.d(TAG, "Request object / 요청 객체: requestId=$requestId, ${requestObjJson.take(500)}...")

        val event = JSONObject().apply {
          put("method", "Network.requestWillBeSent")
          put("params", JSONObject().apply {
            put("requestId", requestId)
            put("loaderId", requestId)
            put("documentURL", request.url.toString())
            put("request", requestObj)
            put("timestamp", getTimestamp())
            put("type", "Other")
          })
        }

        sendCDPNetworkEvent(event)
      } catch (e: Exception) {
        Log.e(TAG, "Failed to send requestWillBeSent event / requestWillBeSent 이벤트 전송 실패", e)
      }
    }

    /**
     * Send Network.responseReceived event / Network.responseReceived 이벤트 전송
     * @param requestId Request ID / 요청 ID
     * @param responseBody Response body as string (optional) / 응답 본문 문자열 (선택사항)
     */
    fun sendResponseReceived(request: Request, response: Response, requestId: String, responseBody: String? = null) {
      if (!isEnabled) {
        return
      }

      try {
        val headers = formatHeaders(response.headers)

        val contentType = response.header("Content-Type") ?: response.header("content-type") ?: "text/plain"
        // Extract MIME type from Content-Type header (e.g., "text/html; charset=utf-8" -> "text/html") / Content-Type 헤더에서 MIME 타입 추출 (예: "text/html; charset=utf-8" -> "text/html")
        val mimeType = contentType.split(";")[0].trim()

        // Log response body info / 응답 본문 정보 로그
        val bodyLength = responseBody?.length ?: 0
        Log.d(TAG, "sendResponseReceived / responseReceived 전송: requestId=$requestId, bodyLength=$bodyLength, hasBody=${responseBody != null}")

        // Store response body for getResponseBody requests / getResponseBody 요청을 위해 응답 본문 저장
        if (responseBody != null && responseBody.isNotEmpty()) {
          val existingData = responseData.containsKey(requestId)
          if (existingData) {
            Log.w(TAG, "⚠️ Overwriting existing response data for requestId / requestId에 대한 기존 응답 데이터 덮어쓰기: $requestId")
          }
          responseData[requestId] = responseBody
          Log.d(TAG, "Response body stored for requestId / 응답 본문 저장됨: requestId=$requestId, length=${responseBody.length}, totalStored=${responseData.size}")
        }

        val responseObj = JSONObject().apply {
          put("url", request.url.toString())
          put("status", response.code)
          put("statusText", response.message)
          put("headers", headers)
          put("mimeType", mimeType)
          // Include response body for preview / 프리뷰를 위해 응답 본문 포함
          if (responseBody != null && responseBody.isNotEmpty()) {
            put("body", responseBody)
            Log.d(TAG, "Response body included in CDP event / CDP 이벤트에 응답 본문 포함: length=${responseBody.length}")
          } else {
            // Use empty string instead of NULL / NULL 대신 빈 문자열 사용
            put("body", "")
            Log.d(TAG, "Response body is empty or null / 응답 본문이 비어있거나 null입니다")
          }
        }

        val event = JSONObject().apply {
          put("method", "Network.responseReceived")
          put("params", JSONObject().apply {
            put("requestId", requestId)
            put("loaderId", requestId)
            put("timestamp", getTimestamp())
            put("type", "Other")
            put("response", responseObj)
          })
        }

        // Log event JSON for debugging / 디버깅을 위해 이벤트 JSON 로그
        val eventJson = event.toString()
        Log.d(TAG, "Network.responseReceived event JSON / Network.responseReceived 이벤트 JSON: ${eventJson.take(500)}...")

        sendCDPNetworkEvent(event)
      } catch (e: Exception) {
        Log.e(TAG, "Failed to send responseReceived event / responseReceived 이벤트 전송 실패", e)
      }
    }

    /**
     * Send Network.loadingFinished event / Network.loadingFinished 이벤트 전송
     */
    fun sendLoadingFinished(requestId: String, dataLength: Long) {
      if (!isEnabled) {
        return
      }

      try {
        val event = JSONObject().apply {
          put("method", "Network.loadingFinished")
          put("params", JSONObject().apply {
            put("requestId", requestId)
            put("timestamp", getTimestamp())
            put("encodedDataLength", dataLength)
          })
        }

        sendCDPNetworkEvent(event)

        // Note: We keep responseData for getResponseBody requests / getResponseBody 요청을 위해 responseData 유지
        // The data will be cleaned up when the interceptor is disabled / 인터셉터가 비활성화될 때 데이터 정리됨
        Log.d(TAG, "loadingFinished sent / loadingFinished 전송됨: requestId=$requestId, responseDataSize=${responseData.size}")
      } catch (e: Exception) {
        Log.e(TAG, "Failed to send loadingFinished event / loadingFinished 이벤트 전송 실패", e)
      }
    }

    /**
     * Send Network.loadingFailed event / Network.loadingFailed 이벤트 전송
     */
    fun sendLoadingFailed(requestId: String, error: IOException) {
      if (!isEnabled) {
        return
      }

      try {
        val event = JSONObject().apply {
          put("method", "Network.loadingFailed")
          put("params", JSONObject().apply {
            put("requestId", requestId)
            put("timestamp", getTimestamp())
            put("errorText", error.message ?: "Network error")
            put("canceled", false)
          })
        }

        sendCDPNetworkEvent(event)
      } catch (e: Exception) {
        Log.e(TAG, "Failed to send loadingFailed event / loadingFailed 이벤트 전송 실패", e)
      }
    }

    /**
     * Get response body for a request / 요청에 대한 응답 본문 가져오기
     * @param requestId Request ID / 요청 ID
     * @return Response body as string, or empty string if not found / 응답 본문 문자열, 없으면 빈 문자열
     */
    fun getResponseBody(requestId: String): String {
      val body = responseData[requestId] ?: ""
      val hasData = responseData.containsKey(requestId)
      Log.d(TAG, "getResponseBody called / getResponseBody 호출됨: requestId=$requestId, bodyLength=${body.length}, hasData=$hasData, totalStored=${responseData.size}")
      if (!hasData) {
        Log.w(TAG, "Response body not found for requestId / requestId에 대한 응답 본문을 찾을 수 없음: $requestId")
        Log.w(TAG, "Available requestIds / 사용 가능한 requestIds: ${responseData.keys.joinToString(", ")}")
      }
      return body
    }

    /**
     * Clear all stored response data / 저장된 모든 응답 데이터 정리
     */
    fun clearResponseData() {
      val size = responseData.size
      responseData.clear()
      Log.d(TAG, "Response data cleared / 응답 데이터 정리됨: removed $size entries")
    }
  }

  @Throws(IOException::class)
  override fun intercept(chain: Interceptor.Chain): Response {
    // 디버그 로그 추가 / 디버그 로그 추가
    val isEnabled = Companion.isEnabled()
    Log.d(TAG, "intercept called / intercept 호출됨: isEnabled=$isEnabled")

    if (!isEnabled) {
      Log.d(TAG, "Network interception disabled, skipping / 네트워크 인터셉션 비활성화됨, 건너뜀")
      return chain.proceed(chain.request())
    }

    val request = chain.request()
    val requestId = Companion.requestIdCounter.incrementAndGet().toString()

    Log.d(TAG, "Intercepting network request / 네트워크 요청 가로채기: requestId=$requestId, URL=${request.url}, method=${request.method}")

    // Store request metadata / 요청 메타데이터 저장
    requestMetadata[requestId] = RequestMetadata(
      url = request.url.toString(),
      method = request.method
    )

    // Send requestWillBeSent event / requestWillBeSent 이벤트 전송
    Companion.sendRequestWillBeSent(request, requestId)

    try {
      val response = chain.proceed(request)

      Log.d(TAG, "Network response received / 네트워크 응답 수신: requestId=$requestId, status=${response.code}, URL=${request.url}")

      // Read response body / 응답 본문 읽기
      val responseBody = response.body
      var responseBodyText: String? = null
      var dataLength: Long = 0

      if (responseBody != null) {
        val source = responseBody.source()
        source.request(Long.MAX_VALUE) // Buffer the entire body / 전체 본문 버퍼링
        val buffer = source.buffer

        dataLength = buffer.size

        // Read body as text for preview (only for text-based content types) / 프리뷰를 위해 본문을 텍스트로 읽기 (텍스트 기반 콘텐츠 타입만)
        try {
          val contentType = response.header("Content-Type") ?: response.header("content-type") ?: ""
          val mimeType = contentType.split(";")[0].trim().lowercase()

          // Only read as text for text-based content types / 텍스트 기반 콘텐츠 타입만 텍스트로 읽기
          if (mimeType.startsWith("text/") ||
              mimeType.contains("json") ||
              mimeType.contains("xml") ||
              mimeType.contains("javascript") ||
              mimeType.contains("application/json") ||
              mimeType.contains("application/xml")) {
            responseBodyText = buffer.clone().readUtf8()
            Log.d(TAG, "Response body read as text / 응답 본문을 텍스트로 읽음: length=${responseBodyText.length}")
          } else {
            Log.d(TAG, "Skipping body read for non-text content type / 비텍스트 콘텐츠 타입이므로 본문 읽기 건너뜀: $mimeType")
          }
        } catch (e: Exception) {
          Log.w(TAG, "Failed to read response body as text / 응답 본문을 텍스트로 읽기 실패: ${e.message}")
        }

        // Clone response with new body / 새 본문으로 응답 복제
        val newResponseBody = ResponseBody.create(
          responseBody.contentType(),
          dataLength,
          buffer.clone()
        )

        val newResponse = response.newBuilder()
          .body(newResponseBody)
          .build()

        // Send responseReceived event with body / 본문이 포함된 responseReceived 이벤트 전송
        Companion.sendResponseReceived(request, response, requestId, responseBodyText)

        // Send loadingFinished event / loadingFinished 이벤트 전송
        Log.d(TAG, "Network request finished / 네트워크 요청 완료: requestId=$requestId, dataLength=$dataLength")
        Companion.sendLoadingFinished(requestId, dataLength)

        // Clean up request metadata / 요청 메타데이터 정리
        requestMetadata.remove(requestId)

        return newResponse
      } else {
        // Send responseReceived event without body / 본문 없이 responseReceived 이벤트 전송
        Companion.sendResponseReceived(request, response, requestId, null)

        // Send loadingFinished event with zero length / 길이가 0인 loadingFinished 이벤트 전송
        Companion.sendLoadingFinished(requestId, 0)

        // Clean up request metadata / 요청 메타데이터 정리
        requestMetadata.remove(requestId)

        return response
      }
    } catch (e: IOException) {
      // Send loadingFailed event / loadingFailed 이벤트 전송
      Log.e(TAG, "Network request failed / 네트워크 요청 실패: requestId=$requestId, error=${e.message}", e)
      Companion.sendLoadingFailed(requestId, e)

      // Clean up request metadata / 요청 메타데이터 정리
      requestMetadata.remove(requestId)

      throw e
    }
  }
}

