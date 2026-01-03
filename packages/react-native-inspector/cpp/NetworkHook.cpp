/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Modified for Chrome Remote DevTools / Chrome Remote DevTools용으로 수정됨
 */

#include "NetworkHook.h"
#include "ConsoleHook.h" // For SendCDPMessageCallback and helper functions / SendCDPMessageCallback 및 헬퍼 함수를 위해
#include <cstring>
#include <chrono>
#include <atomic>
#include <map>
#include <string>
#include <sstream>
#include <folly/dynamic.h>
#include <folly/json.h>

// Platform-specific log support / 플랫폼별 로그 지원
#ifdef __ANDROID__
#include <android/log.h>
#define LOG_TAG "NetworkHook"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)
#define LOGW(...) __android_log_print(ANDROID_LOG_WARN, LOG_TAG, __VA_ARGS__)
#elif defined(__APPLE__)
// Note: Cannot use Foundation.h in C++ files (Objective-C headers) / 참고: C++ 파일에서는 Foundation.h를 사용할 수 없음 (Objective-C 헤더)
// Logging is disabled in C++ files for iOS. Use Objective-C++ wrapper (.mm) for NSLog if needed / iOS의 C++ 파일에서는 로깅이 비활성화됩니다. 필요하면 Objective-C++ 래퍼(.mm)에서 NSLog를 사용하세요
#define LOG_TAG "NetworkHook"
#define LOGI(...) ((void)0)
#define LOGE(...) ((void)0)
#define LOGW(...) ((void)0)
#else
#define LOGI(...)
#define LOGE(...)
#define LOGW(...)
#endif

namespace chrome_remote_devtools {

// Global request ID counter / 전역 요청 ID 카운터
static std::atomic<size_t> g_requestIdCounter{1};

// Store response data by requestId / requestId별로 응답 데이터 저장
static std::map<std::string, std::string> g_responseData;

// Platform-specific callback for sending CDP messages / CDP 메시지 전송을 위한 플랫폼별 콜백
// Note: This is shared with ConsoleHook via extern / 참고: extern을 통해 ConsoleHook과 공유됨
extern SendCDPMessageCallback g_sendCDPMessageCallback;

// Get timestamp in seconds / 초 단위 타임스탬프 가져오기
static double getTimestamp() {
  return std::chrono::duration_cast<std::chrono::milliseconds>(
    std::chrono::system_clock::now().time_since_epoch()
  ).count() / 1000.0;
}

// Get server host and port from global / 전역에서 서버 호스트와 포트 가져오기
static void getServerInfo(facebook::jsi::Runtime& runtime, std::string& serverHost, int& serverPort) {
  serverHost = "localhost";
  serverPort = 8080;
  try {
    facebook::jsi::Value hostValue = runtime.global().getProperty(runtime, "__ChromeRemoteDevToolsServerHost");
    if (hostValue.isString()) {
      serverHost = hostValue.asString(runtime).utf8(runtime); // Correct: runtime is the parameter / 올바름: runtime이 파라미터임
    }
    facebook::jsi::Value portValue = runtime.global().getProperty(runtime, "__ChromeRemoteDevToolsServerPort");
    if (portValue.isNumber()) {
      serverPort = static_cast<int>(portValue.asNumber());
    }
  } catch (...) {
    // Use defaults / 기본값 사용
  }
}

// Send CDP network event / CDP 네트워크 이벤트 전송
static void sendCDPNetworkEvent(facebook::jsi::Runtime& runtime, const folly::dynamic& event) {
  try {
    // Serialize to JSON string / JSON 문자열로 직렬화
    folly::json::serialization_opts opts;
    std::string cdpMessageJson = folly::json::serialize(event, opts);

    // Get server info / 서버 정보 가져오기
    std::string serverHost;
    int serverPort;
    getServerInfo(runtime, serverHost, serverPort);

    // Get callback from ConsoleHook / ConsoleHook에서 콜백 가져오기
    // Note: We need to access the callback set by setSendCDPMessageCallback / 참고: setSendCDPMessageCallback으로 설정된 콜백에 접근해야 함
    // For now, try TurboModule directly / 지금은 TurboModule을 직접 시도
    {
      // Try TurboModule / TurboModule 시도
      try {
        facebook::jsi::Value turboModuleValue = runtime.global().getProperty(runtime, "NativeChromeRemoteDevToolsInspector");
        if (turboModuleValue.isObject()) {
          facebook::jsi::Object turboModule = turboModuleValue.asObject(runtime);
          facebook::jsi::Value sendCDPMessageValue = turboModule.getProperty(runtime, "sendCDPMessage");
          if (sendCDPMessageValue.isObject() && sendCDPMessageValue.asObject(runtime).isFunction(runtime)) {
            facebook::jsi::Function sendCDPMessage = sendCDPMessageValue.asObject(runtime).asFunction(runtime);
            facebook::jsi::Value hostValue = facebook::jsi::String::createFromUtf8(runtime, serverHost);
            facebook::jsi::Value portValue = facebook::jsi::Value(serverPort);
            facebook::jsi::Value messageValue = facebook::jsi::String::createFromUtf8(runtime, cdpMessageJson);
            sendCDPMessage.call(runtime, hostValue, portValue, messageValue);
            return;
          }
        }
      } catch (...) {
        // TurboModule failed, try require / TurboModule 실패, require 시도
      }

      // Fallback: Try require / 폴백: require 시도
      try {
        facebook::jsi::Value requireValue = runtime.global().getProperty(runtime, "require");
        if (requireValue.isObject() && requireValue.asObject(runtime).isFunction(runtime)) {
          facebook::jsi::Function require = requireValue.asObject(runtime).asFunction(runtime);
          facebook::jsi::Value rnModule = require.call(runtime, facebook::jsi::String::createFromUtf8(runtime, "react-native"));
          if (rnModule.isObject()) {
            facebook::jsi::Object rnObj = rnModule.asObject(runtime);
            facebook::jsi::Value nativeModulesValue = rnObj.getProperty(runtime, "NativeModules");
            if (nativeModulesValue.isObject()) {
              facebook::jsi::Object nativeModules = nativeModulesValue.asObject(runtime);
              facebook::jsi::Value inspectorValue = nativeModules.getProperty(runtime, "ChromeRemoteDevToolsInspector");
              if (inspectorValue.isObject()) {
                facebook::jsi::Object inspector = inspectorValue.asObject(runtime);
                facebook::jsi::Value sendCDPMessageValue = inspector.getProperty(runtime, "sendCDPMessage");
                if (sendCDPMessageValue.isObject() && sendCDPMessageValue.asObject(runtime).isFunction(runtime)) {
                  facebook::jsi::Function sendCDPMessage = sendCDPMessageValue.asObject(runtime).asFunction(runtime);
                  facebook::jsi::Value hostValue = facebook::jsi::String::createFromUtf8(runtime, serverHost);
                  facebook::jsi::Value portValue = facebook::jsi::Value(serverPort);
                  facebook::jsi::Value messageValue = facebook::jsi::String::createFromUtf8(runtime, cdpMessageJson);
                  sendCDPMessage.call(runtime, hostValue, portValue, messageValue);
                }
              }
            }
          }
        }
      } catch (...) {
        LOGE("Failed to send CDP network event / CDP 네트워크 이벤트 전송 실패");
      }
    }
  } catch (const std::exception& e) {
    LOGE("Failed to send CDP network event / CDP 네트워크 이벤트 전송 실패: %s", e.what());
  }
}

// Get default headers / 기본 헤더 가져오기
static folly::dynamic getDefaultHeaders(facebook::jsi::Runtime& runtime) {
  folly::dynamic headers = folly::dynamic::object;
  try {
    // Try to get User-Agent from navigator / navigator에서 User-Agent 가져오기 시도
    facebook::jsi::Value navigatorValue = runtime.global().getProperty(runtime, "navigator");
    if (navigatorValue.isObject()) {
      facebook::jsi::Object navigator = navigatorValue.asObject(runtime);
      facebook::jsi::Value userAgentValue = navigator.getProperty(runtime, "userAgent");
      if (userAgentValue.isString()) {
        headers["User-Agent"] = userAgentValue.asString(runtime).utf8(runtime);
      }
    }
  } catch (...) {
    // Use default / 기본값 사용
    headers["User-Agent"] = "ReactNative";
  }
  return headers;
}

// Format response headers / 응답 헤더 포맷팅
static folly::dynamic formatResponseHeaders(const std::string& headerString) {
  folly::dynamic headers = folly::dynamic::object;
  std::istringstream stream(headerString);
  std::string line;
  while (std::getline(stream, line)) {
    if (line.empty() || line == "\r") continue;
    size_t colonPos = line.find(':');
    if (colonPos != std::string::npos) {
      std::string key = line.substr(0, colonPos);
      std::string value = line.substr(colonPos + 1);
      // Trim whitespace / 공백 제거
      key.erase(0, key.find_first_not_of(" \t\r\n"));
      key.erase(key.find_last_not_of(" \t\r\n") + 1);
      value.erase(0, value.find_first_not_of(" \t\r\n"));
      value.erase(value.find_last_not_of(" \t\r\n") + 1);
      if (!key.empty()) {
        headers[key] = value;
      }
    }
  }
  return headers;
}

// Calculate encoded data length / 인코딩된 데이터 길이 계산
static size_t calculateEncodedDataLength(const std::string& contentLength, const std::string& body) {
  if (!contentLength.empty()) {
    try {
      size_t length = std::stoul(contentLength);
      return length;
    } catch (...) {
      // Parse failed, use body size / 파싱 실패, 본문 크기 사용
    }
  }
  return body.length();
}

bool hookNetworkMethods(facebook::jsi::Runtime& runtime) {
  try {
    // Hook XMLHttpRequest / XMLHttpRequest 훅
    try {
      facebook::jsi::Value xhrValue = runtime.global().getProperty(runtime, "XMLHttpRequest");
      if (xhrValue.isObject()) {
        facebook::jsi::Object xhrConstructor = xhrValue.asObject(runtime);

        // Get prototype / 프로토타입 가져오기
        facebook::jsi::Value prototypeValue = xhrConstructor.getProperty(runtime, "prototype");
        if (prototypeValue.isObject()) {
          facebook::jsi::Object xhrPrototype = prototypeValue.asObject(runtime);

          // Store original methods in backup properties / 백업 속성에 원본 메서드 저장
          facebook::jsi::Value originalOpen = xhrPrototype.getProperty(runtime, "open");
          if (originalOpen.isObject() && originalOpen.asObject(runtime).isFunction(runtime)) {
            xhrPrototype.setProperty(runtime, "__original_open", std::move(originalOpen));
          }
          facebook::jsi::Value originalSend = xhrPrototype.getProperty(runtime, "send");
          if (originalSend.isObject() && originalSend.asObject(runtime).isFunction(runtime)) {
            xhrPrototype.setProperty(runtime, "__original_send", std::move(originalSend));
          }
          facebook::jsi::Value originalSetRequestHeader = xhrPrototype.getProperty(runtime, "setRequestHeader");
          if (originalSetRequestHeader.isObject() && originalSetRequestHeader.asObject(runtime).isFunction(runtime)) {
            xhrPrototype.setProperty(runtime, "__original_setRequestHeader", std::move(originalSetRequestHeader));
          }

          // Hook open / open 훅
          auto hookedOpen = facebook::jsi::Function::createFromHostFunction(
            runtime,
            facebook::jsi::PropNameID::forAscii(runtime, "open"),
            5, // method, url, async, user, password
            [](facebook::jsi::Runtime& rt,
              const facebook::jsi::Value& thisVal,
              const facebook::jsi::Value* args,
              size_t count) -> facebook::jsi::Value {
              if (count >= 2 && thisVal.isObject()) {
                facebook::jsi::Object xhr = thisVal.asObject(rt);
                std::string method = args[0].asString(rt).utf8(rt);
                std::string url = args[1].asString(rt).utf8(rt);

                // Store metadata in hidden property / 숨겨진 속성에 메타데이터 저장
                facebook::jsi::Object metadata = facebook::jsi::Object(rt);
                metadata.setProperty(rt, "method", facebook::jsi::String::createFromUtf8(rt, method));
                metadata.setProperty(rt, "url", facebook::jsi::String::createFromUtf8(rt, url));
                metadata.setProperty(rt, "headers", facebook::jsi::Object(rt));
                xhr.setProperty(rt, "__cdpNetworkMetadata", metadata);
              }

              // Call original from prototype backup property / prototype의 백업 속성에서 원본 호출
              try {
                // Get constructor from instance / 인스턴스에서 constructor 가져오기
                facebook::jsi::Value constructorValue = thisVal.asObject(rt).getProperty(rt, "constructor");
                if (constructorValue.isObject()) {
                  facebook::jsi::Object constructor = constructorValue.asObject(rt);
                  facebook::jsi::Value prototypeValue = constructor.getProperty(rt, "prototype");
                  if (prototypeValue.isObject()) {
                    facebook::jsi::Object prototype = prototypeValue.asObject(rt);
                    facebook::jsi::Value originalOpenValue = prototype.getProperty(rt, "__original_open");
                    if (originalOpenValue.isObject() && originalOpenValue.asObject(rt).isFunction(rt)) {
                      facebook::jsi::Function originalOpen = originalOpenValue.asObject(rt).asFunction(rt);
                      if (thisVal.isObject()) {
                        return originalOpen.callWithThis(rt, thisVal.asObject(rt), args, count);
                      }
                    }
                  }
                }
              } catch (...) {
                // Failed to call original / 원본 호출 실패
              }
              return facebook::jsi::Value::undefined();
            }
          );
          xhrPrototype.setProperty(runtime, "open", hookedOpen);

          // Hook setRequestHeader / setRequestHeader 훅
          auto hookedSetRequestHeader = facebook::jsi::Function::createFromHostFunction(
            runtime,
            facebook::jsi::PropNameID::forAscii(runtime, "setRequestHeader"),
            2, // name, value
            [](facebook::jsi::Runtime& rt,
              const facebook::jsi::Value& thisVal,
              const facebook::jsi::Value* args,
              size_t count) -> facebook::jsi::Value {
              if (count >= 2 && thisVal.isObject()) {
                facebook::jsi::Object xhr = thisVal.asObject(rt);
                facebook::jsi::Value metadataValue = xhr.getProperty(rt, "__cdpNetworkMetadata");
                if (metadataValue.isObject()) {
                  facebook::jsi::Object metadata = metadataValue.asObject(rt);
                  facebook::jsi::Value headersValue = metadata.getProperty(rt, "headers");
                  if (headersValue.isObject()) {
                    facebook::jsi::Object headers = headersValue.asObject(rt);
                    std::string name = args[0].asString(rt).utf8(rt);
                    std::string value = args[1].asString(rt).utf8(rt);
                    headers.setProperty(rt, name.c_str(), facebook::jsi::String::createFromUtf8(rt, value));
                  }
                }
              }

              // Call original from prototype backup property / prototype의 백업 속성에서 원본 호출
              try {
                // Get constructor from instance / 인스턴스에서 constructor 가져오기
                facebook::jsi::Value constructorValue = thisVal.asObject(rt).getProperty(rt, "constructor");
                if (constructorValue.isObject()) {
                  facebook::jsi::Object constructor = constructorValue.asObject(rt);
                  facebook::jsi::Value prototypeValue = constructor.getProperty(rt, "prototype");
                  if (prototypeValue.isObject()) {
                    facebook::jsi::Object prototype = prototypeValue.asObject(rt);
                    facebook::jsi::Value originalSetRequestHeaderValue = prototype.getProperty(rt, "__original_setRequestHeader");
                    if (originalSetRequestHeaderValue.isObject() && originalSetRequestHeaderValue.asObject(rt).isFunction(rt)) {
                      facebook::jsi::Function originalSetRequestHeader = originalSetRequestHeaderValue.asObject(rt).asFunction(rt);
                      if (thisVal.isObject()) {
                        return originalSetRequestHeader.callWithThis(rt, thisVal.asObject(rt), args, count);
                      }
                    }
                  }
                }
              } catch (...) {
                // Failed to call original / 원본 호출 실패
              }
              return facebook::jsi::Value::undefined();
            }
          );
          xhrPrototype.setProperty(runtime, "setRequestHeader", hookedSetRequestHeader);

          // Hook send / send 훅
          auto hookedSend = facebook::jsi::Function::createFromHostFunction(
            runtime,
            facebook::jsi::PropNameID::forAscii(runtime, "send"),
            1, // body (optional)
            [](facebook::jsi::Runtime& rt,
              const facebook::jsi::Value& thisVal,
              const facebook::jsi::Value* args,
              size_t count) -> facebook::jsi::Value {
                if (thisVal.isObject()) {
                  facebook::jsi::Object xhr = thisVal.asObject(rt);
                  facebook::jsi::Value metadataValue = xhr.getProperty(rt, "__cdpNetworkMetadata");
                  if (metadataValue.isObject()) {
                    facebook::jsi::Object metadata = metadataValue.asObject(rt);
                    std::string method = metadata.getProperty(rt, "method").asString(rt).utf8(rt);
                    std::string url = metadata.getProperty(rt, "url").asString(rt).utf8(rt);
                    std::string requestId = std::to_string(g_requestIdCounter.fetch_add(1));

                    // Get headers / 헤더 가져오기
                    folly::dynamic headers = getDefaultHeaders(rt);
                    facebook::jsi::Value headersValue = metadata.getProperty(rt, "headers");
                    if (headersValue.isObject()) {
                      facebook::jsi::Object headersObj = headersValue.asObject(rt);
                      facebook::jsi::Array propNames = headersObj.getPropertyNames(rt);
                      for (size_t i = 0; i < propNames.size(rt); i++) {
                        facebook::jsi::Value keyValue = propNames.getValueAtIndex(rt, i);
                        if (keyValue.isString()) {
                          std::string key = keyValue.asString(rt).utf8(rt);
                          facebook::jsi::Value valueValue = headersObj.getProperty(rt, key.c_str());
                          if (valueValue.isString()) {
                            headers[key] = valueValue.asString(rt).utf8(rt);
                          }
                        }
                      }
                    }

                    // Get post data / POST 데이터 가져오기
                    std::string postData;
                    if (count > 0 && !args[0].isUndefined() && !args[0].isNull()) {
                      if (args[0].isString()) {
                        postData = args[0].asString(rt).utf8(rt);
                      } else {
                        // Try to stringify / 문자열화 시도
                        try {
                          facebook::jsi::Value jsonValue = rt.global().getPropertyAsObject(rt, "JSON")
                            .getPropertyAsFunction(rt, "stringify")
                            .call(rt, args[0]);
                          if (jsonValue.isString()) {
                            postData = jsonValue.asString(rt).utf8(rt);
                          }
                        } catch (...) {
                          // Stringify failed / 문자열화 실패
                        }
                      }
                    }

                    // Send requestWillBeSent event / requestWillBeSent 이벤트 전송
                    folly::dynamic requestObj = folly::dynamic::object;
                    requestObj["url"] = url;
                    requestObj["method"] = method;
                    requestObj["headers"] = headers;
                    if (!postData.empty()) {
                      requestObj["postData"] = postData;
                    } else {
                      requestObj["postData"] = nullptr;
                    }

                    folly::dynamic params = folly::dynamic::object;
                    params["requestId"] = requestId;
                    params["loaderId"] = requestId;
                    params["documentURL"] = url; // React Native doesn't have location / React Native에는 location이 없음
                    params["request"] = requestObj;
                    params["timestamp"] = getTimestamp();
                    params["type"] = "XHR";

                    folly::dynamic event = folly::dynamic::object;
                    event["method"] = "Network.requestWillBeSent";
                    event["params"] = params;
                    sendCDPNetworkEvent(rt, event);

                    // Store requestId in metadata / 메타데이터에 requestId 저장
                    metadata.setProperty(rt, "requestId", facebook::jsi::String::createFromUtf8(rt, requestId));

                    // Hook load event / load 이벤트 훅
                    facebook::jsi::Value addEventListenerValue = xhr.getProperty(rt, "addEventListener");
                    if (addEventListenerValue.isObject() && addEventListenerValue.asObject(rt).isFunction(rt)) {
                      facebook::jsi::Function addEventListener = addEventListenerValue.asObject(rt).asFunction(rt);
                      facebook::jsi::Value loadListener = facebook::jsi::Function::createFromHostFunction(
                        rt,
                        facebook::jsi::PropNameID::forAscii(rt, "load"),
                        0,
                        [requestId, url](facebook::jsi::Runtime& runtime,
                                        const facebook::jsi::Value& thisVal,
                                        const facebook::jsi::Value*,
                                        size_t) -> facebook::jsi::Value {
                          if (thisVal.isObject()) {
                            facebook::jsi::Object xhrObj = thisVal.asObject(runtime);

                            // Get response / 응답 가져오기
                            int status = 0;
                            std::string statusText;
                            std::string responseText;
                            std::string allHeaders;
                            std::string contentType;

                            try {
                              facebook::jsi::Value statusValue = xhrObj.getProperty(runtime, "status");
                              if (statusValue.isNumber()) {
                                status = static_cast<int>(statusValue.asNumber());
                              }
                              facebook::jsi::Value statusTextValue = xhrObj.getProperty(runtime, "statusText");
                              if (statusTextValue.isString()) {
                                statusText = statusTextValue.asString(runtime).utf8(runtime);
                              }
                              facebook::jsi::Value responseTextValue = xhrObj.getProperty(runtime, "responseText");
                              if (responseTextValue.isString()) {
                                responseText = responseTextValue.asString(runtime).utf8(runtime);
                              }
                              facebook::jsi::Value getAllResponseHeadersValue = xhrObj.getProperty(runtime, "getAllResponseHeaders");
                              if (getAllResponseHeadersValue.isObject() && getAllResponseHeadersValue.asObject(runtime).isFunction(runtime)) {
                                facebook::jsi::Function getAllResponseHeaders = getAllResponseHeadersValue.asObject(runtime).asFunction(runtime);
                                facebook::jsi::Value headersValue = getAllResponseHeaders.call(runtime);
                                if (headersValue.isString()) {
                                  allHeaders = headersValue.asString(runtime).utf8(runtime);
                                }
                              }
                              facebook::jsi::Value getResponseHeaderValue = xhrObj.getProperty(runtime, "getResponseHeader");
                              if (getResponseHeaderValue.isObject() && getResponseHeaderValue.asObject(runtime).isFunction(runtime)) {
                                facebook::jsi::Function getResponseHeader = getResponseHeaderValue.asObject(runtime).asFunction(runtime);
                                facebook::jsi::Value contentTypeValue = getResponseHeader.call(runtime, facebook::jsi::String::createFromUtf8(runtime, "content-type"));
                                if (contentTypeValue.isString()) {
                                  contentType = contentTypeValue.asString(runtime).utf8(runtime);
                                }
                              }
                            } catch (...) {
                              // Failed to get response properties / 응답 속성 가져오기 실패
                            }

                            // Store response data / 응답 데이터 저장
                            g_responseData[requestId] = responseText;

                            // Send responseReceived event / responseReceived 이벤트 전송
                            folly::dynamic responseObj = folly::dynamic::object;
                            responseObj["url"] = url;
                            responseObj["status"] = status;
                            responseObj["statusText"] = statusText;
                            responseObj["headers"] = formatResponseHeaders(allHeaders);
                            responseObj["mimeType"] = contentType.empty() ? "text/plain" : contentType;
                            responseObj["body"] = responseText;

                            folly::dynamic responseParams = folly::dynamic::object;
                            responseParams["requestId"] = requestId;
                            responseParams["loaderId"] = requestId;
                            responseParams["timestamp"] = getTimestamp();
                            responseParams["type"] = "XHR";
                            responseParams["response"] = responseObj;

                            folly::dynamic responseEvent = folly::dynamic::object;
                            responseEvent["method"] = "Network.responseReceived";
                            responseEvent["params"] = responseParams;
                            sendCDPNetworkEvent(runtime, responseEvent);

                            // Send loadingFinished event / loadingFinished 이벤트 전송
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
                          return facebook::jsi::Value::undefined();
                        }
                      );
                      addEventListener.call(rt, facebook::jsi::String::createFromUtf8(rt, "load"), loadListener);
                    }
                  }
                }

                // Call original from prototype backup property / prototype의 백업 속성에서 원본 호출
                try {
                  // Get constructor from instance / 인스턴스에서 constructor 가져오기
                  facebook::jsi::Value constructorValue = thisVal.asObject(rt).getProperty(rt, "constructor");
                  if (constructorValue.isObject()) {
                    facebook::jsi::Object constructor = constructorValue.asObject(rt);
                    facebook::jsi::Value prototypeValue = constructor.getProperty(rt, "prototype");
                    if (prototypeValue.isObject()) {
                      facebook::jsi::Object prototype = prototypeValue.asObject(rt);
                      facebook::jsi::Value originalSendValue = prototype.getProperty(rt, "__original_send");
                      if (originalSendValue.isObject() && originalSendValue.asObject(rt).isFunction(rt)) {
                        facebook::jsi::Function originalSend = originalSendValue.asObject(rt).asFunction(rt);
                        if (thisVal.isObject()) {
                          return originalSend.callWithThis(rt, thisVal.asObject(rt), args, count);
                        }
                      }
                    }
                  }
                } catch (...) {
                  // Failed to call original / 원본 호출 실패
                }
                return facebook::jsi::Value::undefined();
              }
            );
            xhrPrototype.setProperty(runtime, "send", hookedSend);
        }
      }
    } catch (const std::exception& e) {
      LOGE("Failed to hook XMLHttpRequest / XMLHttpRequest 훅 실패: %s", e.what());
    }

    // Hook fetch / fetch 훅
    try {
      facebook::jsi::Value fetchValue = runtime.global().getProperty(runtime, "fetch");
      if (fetchValue.isObject() && fetchValue.asObject(runtime).isFunction(runtime)) {
        // Store original fetch in backup property / 백업 속성에 원본 fetch 저장
        runtime.global().setProperty(runtime, "__original_fetch", std::move(fetchValue));

        auto hookedFetch = facebook::jsi::Function::createFromHostFunction(
          runtime,
          facebook::jsi::PropNameID::forAscii(runtime, "fetch"),
          2, // input, init (optional)
          [](facebook::jsi::Runtime& rt,
             const facebook::jsi::Value&,
             const facebook::jsi::Value* args,
             size_t count) -> facebook::jsi::Value {
            std::string url;
            std::string method = "GET";
            folly::dynamic headers = getDefaultHeaders(rt);
            std::string postData;

            // Parse input / input 파싱
            if (count > 0 && args[0].isString()) {
              url = args[0].asString(rt).utf8(rt);
            } else if (count > 0 && args[0].isObject()) {
              facebook::jsi::Object requestObj = args[0].asObject(rt);
              facebook::jsi::Value urlValue = requestObj.getProperty(rt, "url");
              if (urlValue.isString()) {
                url = urlValue.asString(rt).utf8(rt);
              }
              facebook::jsi::Value methodValue = requestObj.getProperty(rt, "method");
              if (methodValue.isString()) {
                method = methodValue.asString(rt).utf8(rt);
              }
              facebook::jsi::Value headersValue = requestObj.getProperty(rt, "headers");
              if (headersValue.isObject()) {
                facebook::jsi::Object headersObj = headersValue.asObject(rt);
                facebook::jsi::Array propNames = headersObj.getPropertyNames(rt);
                for (size_t i = 0; i < propNames.size(rt); i++) {
                  facebook::jsi::Value keyValue = propNames.getValueAtIndex(rt, i);
                  if (keyValue.isString()) {
                    std::string key = keyValue.asString(rt).utf8(rt);
                    facebook::jsi::Value valueValue = headersObj.getProperty(rt, key.c_str());
                    if (valueValue.isString()) {
                      headers[key] = valueValue.asString(rt).utf8(rt);
                    }
                  }
                }
              }
            }

            // Parse init / init 파싱
            if (count > 1 && args[1].isObject()) {
              facebook::jsi::Object initObj = args[1].asObject(rt);
              facebook::jsi::Value methodValue = initObj.getProperty(rt, "method");
              if (methodValue.isString()) {
                method = methodValue.asString(rt).utf8(rt);
              }
              facebook::jsi::Value headersValue = initObj.getProperty(rt, "headers");
              if (headersValue.isObject()) {
                facebook::jsi::Object headersObj = headersValue.asObject(rt);
                facebook::jsi::Array propNames = headersObj.getPropertyNames(rt);
                for (size_t i = 0; i < propNames.size(rt); i++) {
                  facebook::jsi::Value keyValue = propNames.getValueAtIndex(rt, i);
                  if (keyValue.isString()) {
                    std::string key = keyValue.asString(rt).utf8(rt);
                    facebook::jsi::Value valueValue = headersObj.getProperty(rt, key.c_str());
                    if (valueValue.isString()) {
                      headers[key] = valueValue.asString(rt).utf8(rt);
                    }
                  }
                }
              }
              facebook::jsi::Value bodyValue = initObj.getProperty(rt, "body");
              if (!bodyValue.isUndefined() && !bodyValue.isNull()) {
                if (bodyValue.isString()) {
                  postData = bodyValue.asString(rt).utf8(rt);
                } else {
                  try {
                    facebook::jsi::Value jsonValue = rt.global().getPropertyAsObject(rt, "JSON")
                      .getPropertyAsFunction(rt, "stringify")
                      .call(rt, bodyValue);
                    if (jsonValue.isString()) {
                      postData = jsonValue.asString(rt).utf8(rt);
                    }
                  } catch (...) {
                    // Stringify failed / 문자열화 실패
                  }
                }
              }
            }

            std::string requestId = std::to_string(g_requestIdCounter.fetch_add(1));

            // Send requestWillBeSent event / requestWillBeSent 이벤트 전송
            folly::dynamic requestObj = folly::dynamic::object;
            requestObj["url"] = url;
            requestObj["method"] = method;
            requestObj["headers"] = headers;
            if (!postData.empty()) {
              requestObj["postData"] = postData;
            } else {
              requestObj["postData"] = nullptr;
            }

            folly::dynamic params = folly::dynamic::object;
            params["requestId"] = requestId;
            params["loaderId"] = requestId;
            params["documentURL"] = url;
            params["request"] = requestObj;
            params["timestamp"] = getTimestamp();
            params["type"] = "Fetch";

            folly::dynamic event = folly::dynamic::object;
            event["method"] = "Network.requestWillBeSent";
            event["params"] = params;
            sendCDPNetworkEvent(rt, event);

            // Call original fetch from backup property and hook response / 백업 속성에서 원본 fetch 호출 및 응답 훅
            facebook::jsi::Value fetchResult = facebook::jsi::Value::undefined();
            try {
              facebook::jsi::Value originalFetchValue = rt.global().getProperty(rt, "__original_fetch");
              if (originalFetchValue.isObject() && originalFetchValue.asObject(rt).isFunction(rt)) {
                fetchResult = originalFetchValue.asObject(rt).asFunction(rt).call(rt, args, count);
              }
            } catch (...) {
              // Failed to call original fetch / 원본 fetch 호출 실패
            }
            if (fetchResult.isObject()) {
              facebook::jsi::Object promiseObj = fetchResult.asObject(rt);
              facebook::jsi::Value thenValue = promiseObj.getProperty(rt, "then");
              if (thenValue.isObject() && thenValue.asObject(rt).isFunction(rt)) {
                facebook::jsi::Function then = thenValue.asObject(rt).asFunction(rt);
                facebook::jsi::Value onFulfilled = facebook::jsi::Function::createFromHostFunction(
                  rt,
                  facebook::jsi::PropNameID::forAscii(rt, "onFulfilled"),
                  1,
                  [requestId, url](facebook::jsi::Runtime& runtime,
                                   const facebook::jsi::Value&,
                                   const facebook::jsi::Value* args,
                                   size_t count) -> facebook::jsi::Value {
                    if (count > 0 && args[0].isObject()) {
                      facebook::jsi::Object response = args[0].asObject(runtime);

                      // Get response properties / 응답 속성 가져오기
                      int status = 0;
                      std::string statusText;
                      std::string contentType;
                      folly::dynamic responseHeaders = folly::dynamic::object;

                      try {
                        facebook::jsi::Value statusValue = response.getProperty(runtime, "status");
                        if (statusValue.isNumber()) {
                          status = static_cast<int>(statusValue.asNumber());
                        }
                        facebook::jsi::Value statusTextValue = response.getProperty(runtime, "statusText");
                        if (statusTextValue.isString()) {
                          statusText = statusTextValue.asString(runtime).utf8(runtime);
                        }
                        facebook::jsi::Value headersValue = response.getProperty(runtime, "headers");
                        if (headersValue.isObject()) {
                          facebook::jsi::Object headersObj = headersValue.asObject(runtime);
                          facebook::jsi::Value getValue = headersObj.getProperty(runtime, "get");
                          if (getValue.isObject() && getValue.asObject(runtime).isFunction(runtime)) {
                            facebook::jsi::Function get = getValue.asObject(runtime).asFunction(runtime);
                            facebook::jsi::Value contentTypeValue = get.call(runtime, facebook::jsi::String::createFromUtf8(runtime, "content-type"));
                            if (contentTypeValue.isString()) {
                              contentType = contentTypeValue.asString(runtime).utf8(runtime);
                            }

                            // Get all headers / 모든 헤더 가져오기
                            facebook::jsi::Value forEachValue = headersObj.getProperty(runtime, "forEach");
                            if (forEachValue.isObject() && forEachValue.asObject(runtime).isFunction(runtime)) {
                              facebook::jsi::Function forEach = forEachValue.asObject(runtime).asFunction(runtime);
                              // Note: forEach callback would need to be implemented / 참고: forEach 콜백 구현 필요
                            }
                          }
                        }

                        // Clone response and read body / 응답 복제 및 본문 읽기
                        facebook::jsi::Value cloneValue = response.getProperty(runtime, "clone");
                        if (cloneValue.isObject() && cloneValue.asObject(runtime).isFunction(runtime)) {
                          facebook::jsi::Function clone = cloneValue.asObject(runtime).asFunction(runtime);
                          facebook::jsi::Object clonedResponse = clone.call(runtime).asObject(runtime);
                          facebook::jsi::Value textValue = clonedResponse.getProperty(runtime, "text");
                          if (textValue.isObject() && textValue.asObject(runtime).isFunction(runtime)) {
                            facebook::jsi::Function text = textValue.asObject(runtime).asFunction(runtime);
                            facebook::jsi::Value textPromise = text.call(runtime);
                            if (textPromise.isObject()) {
                              facebook::jsi::Object textPromiseObj = textPromise.asObject(runtime);
                              facebook::jsi::Value thenValue = textPromiseObj.getProperty(runtime, "then");
                              if (thenValue.isObject() && thenValue.asObject(runtime).isFunction(runtime)) {
                                facebook::jsi::Function textThen = thenValue.asObject(runtime).asFunction(runtime);
                                facebook::jsi::Value onTextFulfilled = facebook::jsi::Function::createFromHostFunction(
                                  runtime,
                                  facebook::jsi::PropNameID::forAscii(runtime, "onTextFulfilled"),
                                  1,
                                  [requestId, url, status, statusText, contentType, responseHeaders](facebook::jsi::Runtime& rt,
                                                                                                      const facebook::jsi::Value&,
                                                                                                      const facebook::jsi::Value* textArgs,
                                                                                                      size_t) -> facebook::jsi::Value {
                                    std::string responseText;
                                    if (textArgs[0].isString()) {
                                      responseText = textArgs[0].asString(rt).utf8(rt);
                                    }

                                    // Store response data / 응답 데이터 저장
                                    g_responseData[requestId] = responseText;

                                    // Send responseReceived event / responseReceived 이벤트 전송
                                    folly::dynamic responseObj = folly::dynamic::object;
                                    responseObj["url"] = url;
                                    responseObj["status"] = status;
                                    responseObj["statusText"] = statusText;
                                    responseObj["headers"] = responseHeaders;
                                    responseObj["mimeType"] = contentType.empty() ? "text/plain" : contentType;
                                    responseObj["body"] = responseText;

                                    folly::dynamic responseParams = folly::dynamic::object;
                                    responseParams["requestId"] = requestId;
                                    responseParams["loaderId"] = requestId;
                                    responseParams["timestamp"] = getTimestamp();
                                    responseParams["type"] = "Fetch";
                                    responseParams["response"] = responseObj;

                                    folly::dynamic responseEvent = folly::dynamic::object;
                                    responseEvent["method"] = "Network.responseReceived";
                                    responseEvent["params"] = responseParams;
                                    sendCDPNetworkEvent(rt, responseEvent);

                                    // Send loadingFinished event / loadingFinished 이벤트 전송
                                    size_t encodedDataLength = calculateEncodedDataLength("", responseText);
                                    folly::dynamic loadingParams = folly::dynamic::object;
                                    loadingParams["requestId"] = requestId;
                                    loadingParams["timestamp"] = getTimestamp();
                                    loadingParams["encodedDataLength"] = encodedDataLength;

                                    folly::dynamic loadingEvent = folly::dynamic::object;
                                    loadingEvent["method"] = "Network.loadingFinished";
                                    loadingEvent["params"] = loadingParams;
                                    sendCDPNetworkEvent(rt, loadingEvent);

                                    return facebook::jsi::Value::undefined();
                                  }
                                );
                                textThen.call(runtime, onTextFulfilled);
                              }
                            }
                          }
                        }
                      } catch (...) {
                        // Failed to process response / 응답 처리 실패
                      }
                    }
                    // Return original response / 원본 응답 반환
                    // In Promise then callback, we need to return the value as-is / Promise then 콜백에서는 값을 그대로 반환해야 함
                    // Since jsi::Value is move-only, we need to use std::move / jsi::Value가 move-only이므로 std::move 사용 필요
                    // However, we can't move from const reference, so we need to create a new Promise that resolves with the value
                    // 하지만 const reference에서 move할 수 없으므로, 값을 resolve하는 새로운 Promise를 생성해야 함
                    if (count > 0) {
                      // Create a Promise that resolves with the original value / 원본 값으로 resolve하는 Promise 생성
                      try {
                        facebook::jsi::Value PromiseValue = runtime.global().getProperty(runtime, "Promise");
                        if (PromiseValue.isObject()) {
                          facebook::jsi::Object PromiseObj = PromiseValue.asObject(runtime);
                          facebook::jsi::Value resolveValue = PromiseObj.getProperty(runtime, "resolve");
                          if (resolveValue.isObject() && resolveValue.asObject(runtime).isFunction(runtime)) {
                            facebook::jsi::Function resolve = resolveValue.asObject(runtime).asFunction(runtime);
                            return resolve.call(runtime, args[0]);
                          }
                        }
                      } catch (...) {
                        // Failed to create Promise, try direct return / Promise 생성 실패, 직접 반환 시도
                      }
                      // Fallback: use std::move (may cause issues but should work for Promise chain) / 대체: std::move 사용 (문제가 있을 수 있지만 Promise 체인에서는 작동해야 함)
                      return std::move(const_cast<facebook::jsi::Value&>(args[0]));
                    }
                    return facebook::jsi::Value::undefined();
                  }
                );
                then.call(rt, onFulfilled);
              }
            }

            return fetchResult;
          }
        );

        runtime.global().setProperty(runtime, "fetch", hookedFetch);
      }
    } catch (const std::exception& e) {
      LOGE("Failed to hook fetch / fetch 훅 실패: %s", e.what());
    }

    LOGI("Network hook installed successfully / 네트워크 훅이 성공적으로 설치됨");
    return true;
  } catch (const std::exception& e) {
    LOGE("Failed to hook network methods / 네트워크 메서드 훅 실패: %s", e.what());
    return false;
  }
}

} // namespace chrome_remote_devtools

