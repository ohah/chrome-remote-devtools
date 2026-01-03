/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Modified for Chrome Remote DevTools / Chrome Remote DevTools용으로 수정됨
 */

#include "NetworkEventSender.h"
#include "NetworkUtils.h"
#include "../ConsoleHook.h" // For SendCDPMessageCallback / SendCDPMessageCallback을 위해
#include <folly/json.h>

// Platform-specific log support / 플랫폼별 로그 지원
#ifdef __ANDROID__
#include <android/log.h>
#define LOG_TAG "NetworkEventSender"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)
#define LOGW(...) __android_log_print(ANDROID_LOG_WARN, LOG_TAG, __VA_ARGS__)
#elif defined(__APPLE__)
#define LOG_TAG "NetworkEventSender"
#define LOGI(...) ((void)0)
#define LOGE(...) ((void)0)
#define LOGW(...) ((void)0)
#else
#define LOGI(...)
#define LOGE(...)
#define LOGW(...)
#endif

// Forward declaration / 전방 선언
namespace chrome_remote_devtools {
  extern SendCDPMessageCallback g_sendCDPMessageCallback;
}

namespace chrome_remote_devtools {
namespace network {

// Platform-specific callback for sending CDP messages / CDP 메시지 전송을 위한 플랫폼별 콜백
// Note: g_sendCDPMessageCallback is defined in chrome_remote_devtools namespace (not network) / 참고: g_sendCDPMessageCallback은 chrome_remote_devtools 네임스페이스에 정의됨 (network 아님)
// We access it via chrome_remote_devtools::g_sendCDPMessageCallback / chrome_remote_devtools::g_sendCDPMessageCallback을 통해 접근

// Send CDP network event / CDP 네트워크 이벤트 전송
void sendCDPNetworkEvent(facebook::jsi::Runtime& runtime, const folly::dynamic& event) {
  try {
    // Serialize to JSON string / JSON 문자열로 직렬화
    folly::json::serialization_opts opts;
    std::string cdpMessageJson = folly::json::serialize(event, opts);

    // Get server info / 서버 정보 가져오기
    std::string serverHost;
    int serverPort;
    getServerInfo(runtime, serverHost, serverPort);

    // Send via platform-specific callback only / 플랫폼별 콜백만 사용하여 전송
    // Access g_sendCDPMessageCallback from parent namespace / 부모 네임스페이스에서 g_sendCDPMessageCallback 접근
    if (chrome_remote_devtools::g_sendCDPMessageCallback != nullptr) {
      try {
        chrome_remote_devtools::g_sendCDPMessageCallback(serverHost.c_str(), serverPort, cdpMessageJson.c_str());
        LOGI("Sending CDP network event via platform callback / 플랫폼 콜백을 통해 CDP 네트워크 이벤트 전송");
      } catch (const std::exception& e) {
        LOGE("Failed to send CDP network event via platform callback: %s", e.what());
      } catch (...) {
        LOGE("Failed to send CDP network event via platform callback (unknown exception) / 플랫폼 콜백을 통해 CDP 네트워크 이벤트 전송 실패 (알 수 없는 예외)");
      }
    } else {
      LOGE("Platform callback not available for CDP network event (g_sendCDPMessageCallback is nullptr) / CDP 네트워크 이벤트를 위한 플랫폼 콜백을 사용할 수 없음 (g_sendCDPMessageCallback이 nullptr)");
    }
  } catch (const std::exception& e) {
    LOGE("Failed to send CDP network event / CDP 네트워크 이벤트 전송 실패: %s", e.what());
  } catch (...) {
    LOGE("Failed to send CDP network event (unknown exception) / CDP 네트워크 이벤트 전송 실패 (알 수 없는 예외)");
  }
}

// Send requestWillBeSent event / requestWillBeSent 이벤트 전송
void sendRequestWillBeSent(facebook::jsi::Runtime& runtime,
                           const std::string& requestId,
                           const RequestInfo& requestInfo,
                           const std::string& type) {
  folly::dynamic requestObj = folly::dynamic::object;
  requestObj["url"] = requestInfo.url;
  requestObj["method"] = requestInfo.method;
  requestObj["headers"] = requestInfo.headers;
  if (!requestInfo.postData.empty()) {
    requestObj["postData"] = requestInfo.postData;
  } else {
    requestObj["postData"] = nullptr;
  }

  folly::dynamic params = folly::dynamic::object;
  params["requestId"] = requestId;
  params["loaderId"] = requestId;
  params["documentURL"] = requestInfo.url;
  params["request"] = requestObj;
  params["timestamp"] = getTimestamp();
  params["type"] = type;

  folly::dynamic event = folly::dynamic::object;
  event["method"] = "Network.requestWillBeSent";
  event["params"] = params;
  sendCDPNetworkEvent(runtime, event);
}

// Send responseReceived event / responseReceived 이벤트 전송
void sendResponseReceived(facebook::jsi::Runtime& runtime,
                         const std::string& requestId,
                         const std::string& url,
                         const ResponseInfo& responseInfo,
                         const std::string& type) {
  folly::dynamic responseObj = folly::dynamic::object;
  responseObj["url"] = url;
  responseObj["status"] = responseInfo.status;
  responseObj["statusText"] = responseInfo.statusText;
  responseObj["headers"] = responseInfo.headers;
  responseObj["mimeType"] = responseInfo.contentType.empty() ? "text/plain" : responseInfo.contentType;
  responseObj["body"] = responseInfo.responseText;

  folly::dynamic responseParams = folly::dynamic::object;
  responseParams["requestId"] = requestId;
  responseParams["loaderId"] = requestId;
  responseParams["timestamp"] = getTimestamp();
  responseParams["type"] = type;
  responseParams["response"] = responseObj;

  folly::dynamic responseEvent = folly::dynamic::object;
  responseEvent["method"] = "Network.responseReceived";
  responseEvent["params"] = responseParams;
  sendCDPNetworkEvent(runtime, responseEvent);
}

// Send loadingFinished event / loadingFinished 이벤트 전송
void sendLoadingFinished(facebook::jsi::Runtime& runtime,
                         const std::string& requestId,
                         const std::string& responseText) {
  size_t encodedDataLength = calculateEncodedDataLength("", responseText);
  folly::dynamic loadingParams = folly::dynamic::object;
  loadingParams["requestId"] = requestId;
  loadingParams["timestamp"] = getTimestamp();
  loadingParams["encodedDataLength"] = encodedDataLength;

  folly::dynamic loadingEvent = folly::dynamic::object;
  loadingEvent["method"] = "Network.loadingFinished";
  loadingEvent["params"] = loadingParams;
  sendCDPNetworkEvent(runtime, loadingEvent);
}

// Send loadingFailed event / loadingFailed 이벤트 전송
void sendLoadingFailed(facebook::jsi::Runtime& runtime,
                       const std::string& requestId,
                       const std::string& errorText) {
  folly::dynamic failedParams = folly::dynamic::object;
  failedParams["requestId"] = requestId;
  failedParams["timestamp"] = getTimestamp();
  failedParams["errorText"] = errorText.empty() ? "Network error" : errorText;
  failedParams["canceled"] = false;

  folly::dynamic failedEvent = folly::dynamic::object;
  failedEvent["method"] = "Network.loadingFailed";
  failedEvent["params"] = failedParams;
  sendCDPNetworkEvent(runtime, failedEvent);
}

} // namespace network
} // namespace chrome_remote_devtools

