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
            if (thisVal.isObject()) {
              facebook::jsi::Object xhr = thisVal.asObject(rt);
              facebook::jsi::Value metadataValue = xhr.getProperty(rt, "__cdpNetworkMetadata");
              if (metadataValue.isObject()) {
                facebook::jsi::Object metadata = metadataValue.asObject(rt);
                std::string requestId = std::to_string(g_requestIdCounter.fetch_add(1));

                // Collect request info / 요청 정보 수집
                RequestInfo requestInfo = collectXHRRequestInfo(rt, metadata, args, count);

                // Send requestWillBeSent event / requestWillBeSent 이벤트 전송
                sendRequestWillBeSent(rt, requestId, requestInfo, "XHR");

                // Store requestId in metadata / 메타데이터에 requestId 저장
                metadata.setProperty(rt, "requestId", facebook::jsi::String::createFromUtf8(rt, requestId));

                // Capture requestInfo.url for lambda / 람다를 위해 requestInfo.url 캡처
                std::string capturedUrl = requestInfo.url;

                // Hook onload property only (not addEventListener to prevent duplicate events) / onload 속성만 훅 (중복 이벤트 방지를 위해 addEventListener는 사용하지 않음)
                // Store original onload if exists / 기존 onload가 있으면 저장
                facebook::jsi::Value originalOnloadValue = xhr.getProperty(rt, "onload");
                if (originalOnloadValue.isObject() && originalOnloadValue.asObject(rt).isFunction(rt)) {
                  xhr.setProperty(rt, "__original_onload", std::move(originalOnloadValue));
                }

                // Set wrapped onload handler / 래핑된 onload 핸들러 설정
                facebook::jsi::Value wrappedOnload = facebook::jsi::Function::createFromHostFunction(
                  rt,
                  facebook::jsi::PropNameID::forAscii(rt, "onload"),
                  0,
                  [requestId, capturedUrl](facebook::jsi::Runtime& runtime,
                                           const facebook::jsi::Value& thisVal,
                                           const facebook::jsi::Value*,
                                           size_t) -> facebook::jsi::Value {
                    if (thisVal.isObject()) {
                      facebook::jsi::Object xhrObj = thisVal.asObject(runtime);

                      // Collect response info / 응답 정보 수집
                      ResponseInfo responseInfo = collectXHRResponseInfo(runtime, xhrObj);

                      // Store response data / 응답 데이터 저장
                      g_responseData[requestId] = responseInfo.responseText;

                      // Send responseReceived event / responseReceived 이벤트 전송
                      sendResponseReceived(runtime, requestId, capturedUrl, responseInfo, "XHR");

                      // Send loadingFinished event / loadingFinished 이벤트 전송
                      sendLoadingFinished(runtime, requestId, responseInfo.responseText);

                      // Call original onload if exists / 기존 onload가 있으면 호출
                      try {
                        facebook::jsi::Value originalOnloadValue = xhrObj.getProperty(runtime, "__original_onload");
                        if (originalOnloadValue.isObject() && originalOnloadValue.asObject(runtime).isFunction(runtime)) {
                          facebook::jsi::Function originalOnload = originalOnloadValue.asObject(runtime).asFunction(runtime);
                          return originalOnload.call(runtime);
                        }
                      } catch (...) {
                        // Original onload call failed / 기존 onload 호출 실패
                      }
                    }
                    return facebook::jsi::Value::undefined();
                  }
                );
                xhr.setProperty(rt, "onload", wrappedOnload);

                // Hook onerror property / onerror 속성 훅
                // Store original onerror if exists / 기존 onerror가 있으면 저장
                facebook::jsi::Value originalOnerrorValue = xhr.getProperty(rt, "onerror");
                if (originalOnerrorValue.isObject() && originalOnerrorValue.asObject(rt).isFunction(rt)) {
                  xhr.setProperty(rt, "__original_onerror", std::move(originalOnerrorValue));
                }

                // Set wrapped onerror handler / 래핑된 onerror 핸들러 설정
                facebook::jsi::Value wrappedOnerror = facebook::jsi::Function::createFromHostFunction(
                  rt,
                  facebook::jsi::PropNameID::forAscii(rt, "onerror"),
                  0,
                  [requestId](facebook::jsi::Runtime& runtime,
                              const facebook::jsi::Value& thisVal,
                              const facebook::jsi::Value*,
                              size_t) -> facebook::jsi::Value {
                    // Send loadingFailed event / loadingFailed 이벤트 전송
                    sendLoadingFailed(runtime, requestId, "Network error");

                    // Call original onerror if exists / 기존 onerror가 있으면 호출
                    if (thisVal.isObject()) {
                      try {
                        facebook::jsi::Object xhrObj = thisVal.asObject(runtime);
                        facebook::jsi::Value originalOnerrorValue = xhrObj.getProperty(runtime, "__original_onerror");
                        if (originalOnerrorValue.isObject() && originalOnerrorValue.asObject(runtime).isFunction(runtime)) {
                          facebook::jsi::Function originalOnerror = originalOnerrorValue.asObject(runtime).asFunction(runtime);
                          return originalOnerror.call(runtime);
                        }
                      } catch (...) {
                        // Original onerror call failed / 기존 onerror 호출 실패
                      }
                    }
                    return facebook::jsi::Value::undefined();
                  }
                );
                xhr.setProperty(rt, "onerror", wrappedOnerror);

                // Hook ontimeout property / ontimeout 속성 훅
                // Store original ontimeout if exists / 기존 ontimeout가 있으면 저장
                facebook::jsi::Value originalOntimeoutValue = xhr.getProperty(rt, "ontimeout");
                if (originalOntimeoutValue.isObject() && originalOntimeoutValue.asObject(rt).isFunction(rt)) {
                  xhr.setProperty(rt, "__original_ontimeout", std::move(originalOntimeoutValue));
                }

                // Set wrapped ontimeout handler / 래핑된 ontimeout 핸들러 설정
                facebook::jsi::Value wrappedOntimeout = facebook::jsi::Function::createFromHostFunction(
                  rt,
                  facebook::jsi::PropNameID::forAscii(rt, "ontimeout"),
                  0,
                  [requestId](facebook::jsi::Runtime& runtime,
                               const facebook::jsi::Value& thisVal,
                               const facebook::jsi::Value*,
                               size_t) -> facebook::jsi::Value {
                    // Send loadingFailed event / loadingFailed 이벤트 전송
                    sendLoadingFailed(runtime, requestId, "Request timeout");

                    // Call original ontimeout if exists / 기존 ontimeout가 있으면 호출
                    if (thisVal.isObject()) {
                      try {
                        facebook::jsi::Object xhrObj = thisVal.asObject(runtime);
                        facebook::jsi::Value originalOntimeoutValue = xhrObj.getProperty(runtime, "__original_ontimeout");
                        if (originalOntimeoutValue.isObject() && originalOntimeoutValue.asObject(runtime).isFunction(runtime)) {
                          facebook::jsi::Function originalOntimeout = originalOntimeoutValue.asObject(runtime).asFunction(runtime);
                          return originalOntimeout.call(runtime);
                        }
                      } catch (...) {
                        // Original ontimeout call failed / 기존 ontimeout 호출 실패
                      }
                    }
                    return facebook::jsi::Value::undefined();
                  }
                );
                xhr.setProperty(rt, "ontimeout", wrappedOntimeout);
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
                  facebook::jsi::Value originalSendValue = prototype.getProperty(rt, "__original_send");
                  if (originalSendValue.isObject() && originalSendValue.asObject(rt).isFunction(rt)) {
                    facebook::jsi::Function originalSend = originalSendValue.asObject(rt).asFunction(rt);
                    return originalSend.callWithThis(rt, thisVal.asObject(rt), args, count);
                  }
                }
              }
            } catch (const std::exception& e) {
              LOGE("Failed to call original XMLHttpRequest.send: %s", e.what());
            }
            return facebook::jsi::Value::undefined();
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

