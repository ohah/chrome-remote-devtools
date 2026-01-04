/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Modified for Chrome Remote DevTools / Chrome Remote DevTools용으로 수정됨
 */

#include "XHRHook.h"
#include "NetworkTypes.h"
#include "NetworkUtils.h"
#include "NetworkInfoCollector.h"
#include "NetworkEventSender.h"
#include "NetworkGlobals.h"
#include <vector>

// Platform-specific log support / 플랫폼별 로그 지원
#ifdef __ANDROID__
#include <android/log.h>
#define LOG_TAG "XHRHook"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)
#define LOGW(...) __android_log_print(ANDROID_LOG_WARN, LOG_TAG, __VA_ARGS__)
#elif defined(__APPLE__)
#define LOG_TAG "XHRHook"
#define LOGI(...) ((void)0)
#define LOGE(...) ((void)0)
#define LOGW(...) ((void)0)
#else
#define LOGI(...)
#define LOGE(...)
#define LOGW(...)
#endif

namespace chrome_remote_devtools {
namespace network {

bool hookXHR(facebook::jsi::Runtime& runtime) {
  try {
    facebook::jsi::Value xhrValue = runtime.global().getProperty(runtime, "XMLHttpRequest");
    if (xhrValue.isObject()) {
      facebook::jsi::Object xhrConstructor = xhrValue.asObject(runtime);

      // Get prototype / 프로토타입 가져오기
      facebook::jsi::Value prototypeValue = xhrConstructor.getProperty(runtime, "prototype");
      if (prototypeValue.isObject()) {
        facebook::jsi::Object xhrPrototype = prototypeValue.asObject(runtime);

        // Check if already hooked by checking for backup property / 백업 속성 확인하여 이미 훅되었는지 확인
        facebook::jsi::Value originalOpenValue = xhrPrototype.getProperty(runtime, "__original_open");
        if (originalOpenValue.isObject() && originalOpenValue.asObject(runtime).isFunction(runtime)) {
          LOGW("XMLHttpRequest already hooked, skipping / XMLHttpRequest가 이미 훅되었으므로 건너뜀");
          return true;
        }

        // Store original methods in prototype backup properties / prototype의 백업 속성에 원본 메서드 저장
        originalOpenValue = xhrPrototype.getProperty(runtime, "open");
        if (originalOpenValue.isObject() && originalOpenValue.asObject(runtime).isFunction(runtime)) {
          xhrPrototype.setProperty(runtime, "__original_open", std::move(originalOpenValue));
        }

        facebook::jsi::Value originalSendValue = xhrPrototype.getProperty(runtime, "send");
        if (originalSendValue.isObject() && originalSendValue.asObject(runtime).isFunction(runtime)) {
          xhrPrototype.setProperty(runtime, "__original_send", std::move(originalSendValue));
        }

        facebook::jsi::Value originalSetRequestHeaderValue = xhrPrototype.getProperty(runtime, "setRequestHeader");
        if (originalSetRequestHeaderValue.isObject() && originalSetRequestHeaderValue.asObject(runtime).isFunction(runtime)) {
          xhrPrototype.setProperty(runtime, "__original_setRequestHeader", std::move(originalSetRequestHeaderValue));
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

            // Get original function from prototype / prototype에서 원본 함수 가져오기
            try {
              if (!thisVal.isObject()) {
                return facebook::jsi::Value::undefined();
              }
              // Get XMLHttpRequest constructor from global / 전역에서 XMLHttpRequest constructor 가져오기
              facebook::jsi::Value xhrConstructorValue = rt.global().getProperty(rt, "XMLHttpRequest");
              if (xhrConstructorValue.isObject()) {
                facebook::jsi::Object xhrConstructor = xhrConstructorValue.asObject(rt);
                facebook::jsi::Value prototypeValue = xhrConstructor.getProperty(rt, "prototype");
                if (prototypeValue.isObject()) {
                  facebook::jsi::Object prototype = prototypeValue.asObject(rt);
                  facebook::jsi::Value originalOpenValue = prototype.getProperty(rt, "__original_open");
                  if (originalOpenValue.isObject() && originalOpenValue.asObject(rt).isFunction(rt)) {
                    facebook::jsi::Function originalOpen = originalOpenValue.asObject(rt).asFunction(rt);
                    return originalOpen.callWithThis(rt, thisVal.asObject(rt), args, count);
                  }
                }
              }
            } catch (const std::exception& e) {
              LOGE("Failed to call original XMLHttpRequest.open: %s", e.what());
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

            // Get original function from prototype / prototype에서 원본 함수 가져오기
            try {
              if (!thisVal.isObject()) {
                return facebook::jsi::Value::undefined();
              }
              // Get XMLHttpRequest constructor from global / 전역에서 XMLHttpRequest constructor 가져오기
              facebook::jsi::Value xhrConstructorValue = rt.global().getProperty(rt, "XMLHttpRequest");
              if (xhrConstructorValue.isObject()) {
                facebook::jsi::Object xhrConstructor = xhrConstructorValue.asObject(rt);
                facebook::jsi::Value prototypeValue = xhrConstructor.getProperty(rt, "prototype");
                if (prototypeValue.isObject()) {
                  facebook::jsi::Object prototype = prototypeValue.asObject(rt);
                  facebook::jsi::Value originalSetRequestHeaderValue = prototype.getProperty(rt, "__original_setRequestHeader");
                  if (originalSetRequestHeaderValue.isObject() && originalSetRequestHeaderValue.asObject(rt).isFunction(rt)) {
                    facebook::jsi::Function originalSetRequestHeader = originalSetRequestHeaderValue.asObject(rt).asFunction(rt);
                    return originalSetRequestHeader.callWithThis(rt, thisVal.asObject(rt), args, count);
                  }
                }
              }
            } catch (const std::exception& e) {
              LOGE("Failed to call original XMLHttpRequest.setRequestHeader: %s", e.what());
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
            if (!thisVal.isObject()) {
              return facebook::jsi::Value::undefined();
            }

            facebook::jsi::Object xhr = thisVal.asObject(rt);
            facebook::jsi::Value metadataValue = xhr.getProperty(rt, "__cdpNetworkMetadata");

            // CDP 이벤트 전송을 위한 정보 수집 (메타데이터가 있을 때만) / Collect info for CDP event (only if metadata exists)
            std::string requestId;
            std::string capturedUrl;
            bool shouldTrack = false;

            if (metadataValue.isObject()) {
              facebook::jsi::Object metadata = metadataValue.asObject(rt);
              requestId = std::to_string(g_requestIdCounter.fetch_add(1));

              // Collect request info / 요청 정보 수집
              RequestInfo requestInfo = collectXHRRequestInfo(rt, metadata, args, count);
              capturedUrl = requestInfo.url;

              // Send requestWillBeSent event / requestWillBeSent 이벤트 전송
              sendRequestWillBeSent(rt, requestId, requestInfo, "XHR");

              // Store requestId in metadata / 메타데이터에 requestId 저장
              metadata.setProperty(rt, "requestId", facebook::jsi::String::createFromUtf8(rt, requestId));
              shouldTrack = true;
            }

            // Call original send function FIRST, then add listeners / 원본 send 함수를 먼저 호출한 후 리스너 추가
            // This preserves original XHR behavior / 이를 통해 원본 XHR 동작을 보존합니다
            facebook::jsi::Value sendResult = facebook::jsi::Value::undefined();
            try {
              facebook::jsi::Value xhrConstructorValue = rt.global().getProperty(rt, "XMLHttpRequest");
              if (xhrConstructorValue.isObject()) {
                facebook::jsi::Object xhrConstructor = xhrConstructorValue.asObject(rt);
                facebook::jsi::Value prototypeValue = xhrConstructor.getProperty(rt, "prototype");
                if (prototypeValue.isObject()) {
                  facebook::jsi::Object prototype = prototypeValue.asObject(rt);
                  facebook::jsi::Value originalSendValue = prototype.getProperty(rt, "__original_send");
                  if (originalSendValue.isObject() && originalSendValue.asObject(rt).isFunction(rt)) {
                    facebook::jsi::Function originalSend = originalSendValue.asObject(rt).asFunction(rt);
                    sendResult = originalSend.callWithThis(rt, thisVal.asObject(rt), args, count);
                  }
                }
              }
            } catch (const std::exception& e) {
              LOGE("Failed to call original XMLHttpRequest.send: %s", e.what());
            }

            // Add event listeners AFTER calling original send / 원본 send 호출 후 이벤트 리스너 추가
            // Use addEventListener instead of overriding onload/onerror/ontimeout / onload/onerror/ontimeout를 덮어쓰는 대신 addEventListener 사용
            // This preserves original event handlers / 이를 통해 원본 이벤트 핸들러를 보존합니다
            // Follow React Native XHRInterceptor pattern: use readystatechange for DONE state / React Native XHRInterceptor 패턴 따름: readystatechange에서 DONE 상태 처리
            if (shouldTrack) {
              try {
                facebook::jsi::Value addEventListenerValue = xhr.getProperty(rt, "addEventListener");
                if (addEventListenerValue.isObject() && addEventListenerValue.asObject(rt).isFunction(rt)) {
                  facebook::jsi::Function addEventListener = addEventListenerValue.asObject(rt).asFunction(rt);

                  // Create readystatechange listener - React Native XHRInterceptor pattern / readystatechange 리스너 생성 - React Native XHRInterceptor 패턴
                  // This matches the pattern used in React Native's XHRInterceptor.js / React Native의 XHRInterceptor.js에서 사용하는 패턴과 일치
                  facebook::jsi::Value readystatechangeListener = facebook::jsi::Function::createFromHostFunction(
                    rt,
                    facebook::jsi::PropNameID::forAscii(rt, "readystatechangeListener"),
                    0,
                    [requestId, capturedUrl](facebook::jsi::Runtime& runtime,
                                             const facebook::jsi::Value& thisVal,
                                             const facebook::jsi::Value*,
                                             size_t) -> facebook::jsi::Value {
                      if (thisVal.isObject()) {
                        facebook::jsi::Object xhrObj = thisVal.asObject(runtime);
                        facebook::jsi::Value readyStateValue = xhrObj.getProperty(runtime, "readyState");
                        if (!readyStateValue.isNumber()) {
                          return facebook::jsi::Value::undefined();
                        }

                        double readyState = readyStateValue.asNumber();

                        // DONE (4) - collect response data / 응답 데이터 수집
                        // This is when React Native XHRInterceptor collects response / React Native XHRInterceptor가 응답을 수집하는 시점
                        if (readyState == 4) {
                          // Collect response info / 응답 정보 수집
                          // collectXHRResponseInfo will try responseText first, then response / collectXHRResponseInfo는 먼저 responseText를 시도하고, 그 다음 response를 시도함
                          ResponseInfo responseInfo = collectXHRResponseInfo(runtime, xhrObj);

                          // Store response data / 응답 데이터 저장 (thread-safe / 스레드 안전)
                          {
                            std::lock_guard<std::mutex> lock(g_responseDataMutex);
                            g_responseData[requestId] = responseInfo.responseText;
                          }

                          // Send responseReceived event / responseReceived 이벤트 전송
                          sendResponseReceived(runtime, requestId, capturedUrl, responseInfo, "XHR");

                          // Send loadingFinished event / loadingFinished 이벤트 전송
                          sendLoadingFinished(runtime, requestId, responseInfo.responseText);
                        }
                      }
                      return facebook::jsi::Value::undefined();
                    }
                  );

                  // Add readystatechange listener / readystatechange 리스너 추가
                  facebook::jsi::Value eventName = facebook::jsi::String::createFromUtf8(rt, "readystatechange");
                  addEventListener.callWithThis(rt, xhr, std::move(eventName), std::move(readystatechangeListener));

                  // Also add load listener as fallback / 폴백으로 load 리스너도 추가
                  // load event fires after readystatechange, so it's safer for response data / load 이벤트는 readystatechange 이후에 발생하므로 응답 데이터에 더 안전함
                  facebook::jsi::Value loadListener = facebook::jsi::Function::createFromHostFunction(
                    rt,
                    facebook::jsi::PropNameID::forAscii(rt, "loadListener"),
                    0,
                    [requestId, capturedUrl](facebook::jsi::Runtime& runtime,
                                const facebook::jsi::Value& thisVal,
                                const facebook::jsi::Value*,
                                size_t) -> facebook::jsi::Value {
                      if (thisVal.isObject()) {
                        facebook::jsi::Object xhrObj = thisVal.asObject(runtime);
                        ResponseInfo responseInfo = collectXHRResponseInfo(runtime, xhrObj);

                        // Update response data if it was empty in readystatechange / readystatechange에서 비어있었으면 응답 데이터 업데이트
                        if (!responseInfo.responseText.empty()) {
                          std::lock_guard<std::mutex> lock(g_responseDataMutex);
                          g_responseData[requestId] = responseInfo.responseText;
                        }
                      }
                      return facebook::jsi::Value::undefined();
                    }
                  );

                  facebook::jsi::Value loadEventName = facebook::jsi::String::createFromUtf8(rt, "load");
                  addEventListener.callWithThis(rt, xhr, std::move(loadEventName), std::move(loadListener));

                  // Add error listener / error 리스너 추가
                  facebook::jsi::Value errorListener = facebook::jsi::Function::createFromHostFunction(
                    rt,
                    facebook::jsi::PropNameID::forAscii(rt, "errorListener"),
                    0,
                    [requestId](facebook::jsi::Runtime& runtime,
                                const facebook::jsi::Value&,
                                const facebook::jsi::Value*,
                                size_t) -> facebook::jsi::Value {
                      sendLoadingFailed(runtime, requestId, "Network error");
                    return facebook::jsi::Value::undefined();
                  }
                );

                  facebook::jsi::Value errorEventName = facebook::jsi::String::createFromUtf8(rt, "error");
                  addEventListener.callWithThis(rt, xhr, std::move(errorEventName), std::move(errorListener));

                  // Add timeout listener / timeout 리스너 추가
                  facebook::jsi::Value timeoutListener = facebook::jsi::Function::createFromHostFunction(
                  rt,
                    facebook::jsi::PropNameID::forAscii(rt, "timeoutListener"),
                  0,
                  [requestId](facebook::jsi::Runtime& runtime,
                                const facebook::jsi::Value&,
                               const facebook::jsi::Value*,
                               size_t) -> facebook::jsi::Value {
                    sendLoadingFailed(runtime, requestId, "Request timeout");
                      return facebook::jsi::Value::undefined();
                    }
                  );

                  facebook::jsi::Value timeoutEventName = facebook::jsi::String::createFromUtf8(rt, "timeout");
                  addEventListener.callWithThis(rt, xhr, std::move(timeoutEventName), std::move(timeoutListener));
              }
              } catch (const std::exception& e) {
                LOGW("Failed to add event listeners, CDP events may not be sent / 이벤트 리스너 추가 실패, CDP 이벤트가 전송되지 않을 수 있음: %s", e.what());
              }
            }

            return sendResult;  // 원본 send의 반환값을 그대로 반환 / Return original send's return value
          }
        );
        xhrPrototype.setProperty(runtime, "send", hookedSend);
      }
    }
    return true;
  } catch (const std::exception& e) {
    LOGE("Failed to hook XMLHttpRequest / XMLHttpRequest 훅 실패: %s", e.what());
    return false;
  }
}

} // namespace network
} // namespace chrome_remote_devtools

