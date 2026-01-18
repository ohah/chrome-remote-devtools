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

              // Check if this is a fetch request / Fetch 요청인지 확인
              bool isFetchRequest = false;
              std::string fetchRequestId;
              {
                std::lock_guard<std::mutex> lock(g_fetchRequestMutex);
                if (g_isFetchRequestActive.load()) {
                  isFetchRequest = true;
                  fetchRequestId = g_activeFetchRequestId;
                }
              }

              // Store metadata in hidden property / 숨겨진 속성에 메타데이터 저장
              facebook::jsi::Object metadata = facebook::jsi::Object(rt);
              metadata.setProperty(rt, "method", facebook::jsi::String::createFromUtf8(rt, method));
              metadata.setProperty(rt, "url", facebook::jsi::String::createFromUtf8(rt, url));
              metadata.setProperty(rt, "headers", facebook::jsi::Object(rt));
              if (isFetchRequest) {
                // Mark as fetch request and store fetch requestId / Fetch 요청으로 표시하고 fetch requestId 저장
                metadata.setProperty(rt, "__isFetchRequest", facebook::jsi::Value(true));
                metadata.setProperty(rt, "__fetchRequestId", facebook::jsi::String::createFromUtf8(rt, fetchRequestId));
                LOGI("XHRHook: Detected fetch request, will use fetch requestId=%s / XHRHook: Fetch 요청 감지, fetch requestId=%s 사용", fetchRequestId.c_str(), fetchRequestId.c_str());
              } else {
                metadata.setProperty(rt, "__isFetchRequest", facebook::jsi::Value(false));
              }
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
            bool isFetchRequest = false;

              if (metadataValue.isObject()) {
                facebook::jsi::Object metadata = metadataValue.asObject(rt);

                // Check if this is a fetch request / Fetch 요청인지 확인
                try {
                  facebook::jsi::Value isFetchRequestValue = metadata.getProperty(rt, "__isFetchRequest");
                  if (isFetchRequestValue.isBool() && isFetchRequestValue.getBool()) {
                    isFetchRequest = true;
                    // Use fetch requestId / Fetch requestId 사용
                    facebook::jsi::Value fetchRequestIdValue = metadata.getProperty(rt, "__fetchRequestId");
                    if (fetchRequestIdValue.isString()) {
                      requestId = fetchRequestIdValue.asString(rt).utf8(rt);
                      LOGI("XHRHook: Using fetch requestId=%s for tracking / XHRHook: 추적에 fetch requestId=%s 사용", requestId.c_str(), requestId.c_str());
                    }
                  }
                } catch (...) {
                  // Not a fetch request / Fetch 요청이 아님
                }

                if (!isFetchRequest) {
                  // Regular XHR request / 일반 XHR 요청
                  requestId = std::to_string(g_requestIdCounter.fetch_add(1));
                  RequestInfo requestInfo = collectXHRRequestInfo(rt, metadata, args, count);
                  capturedUrl = requestInfo.url;
                  sendRequestWillBeSent(rt, requestId, requestInfo, "XHR");
                  metadata.setProperty(rt, "requestId", facebook::jsi::String::createFromUtf8(rt, requestId));
                } else {
                  // Fetch request - requestWillBeSent already sent by Fetch hook / Fetch 요청 - requestWillBeSent는 이미 Fetch 훅에서 전송됨
                  // Just collect URL for responseReceived / responseReceived를 위해 URL만 수집
                  RequestInfo requestInfo = collectXHRRequestInfo(rt, metadata, args, count);
                  capturedUrl = requestInfo.url;
                  LOGI("XHRHook: Fetch request detected, skipping requestWillBeSent / XHRHook: Fetch 요청 감지, requestWillBeSent 건너뜀");
                }

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
                  // HEADERS_RECEIVED (2) - collect response headers / 응답 헤더 수집
                  // DONE (4) - collect response body and send events / 응답 본문 수집 및 이벤트 전송
                  facebook::jsi::Value readystatechangeListener = facebook::jsi::Function::createFromHostFunction(
                  rt,
                    facebook::jsi::PropNameID::forAscii(rt, "readystatechangeListener"),
                  0,
                  [requestId, capturedUrl, isFetchRequest](facebook::jsi::Runtime& runtime,
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

                        // HEADERS_RECEIVED (2) - collect response headers / 응답 헤더 수집
                        // This is when React Native XHRInterceptor collects headers / React Native XHRInterceptor가 헤더를 수집하는 시점
                        if (readyState == 2) {
                          LOGI("ReadyState HEADERS_RECEIVED (2) - collecting headers / ReadyState HEADERS_RECEIVED (2) - 헤더 수집 중");
                          // Get response headers and store in metadata / 응답 헤더 가져오기 및 메타데이터에 저장
                          try {
                            facebook::jsi::Value metadataValue = xhrObj.getProperty(runtime, "__cdpNetworkMetadata");
                            if (metadataValue.isObject()) {
                              facebook::jsi::Object metadata = metadataValue.asObject(runtime);

                              // Get all response headers / 모든 응답 헤더 가져오기
                              std::string allHeaders;
                              facebook::jsi::Value getAllResponseHeadersValue = xhrObj.getProperty(runtime, "getAllResponseHeaders");
                              if (getAllResponseHeadersValue.isObject() && getAllResponseHeadersValue.asObject(runtime).isFunction(runtime)) {
                                LOGI("getAllResponseHeaders function found / getAllResponseHeaders 함수 발견");
                                facebook::jsi::Function getAllResponseHeaders = getAllResponseHeadersValue.asObject(runtime).asFunction(runtime);
                                facebook::jsi::Value headersValue = getAllResponseHeaders.callWithThis(runtime, xhrObj);
                                if (headersValue.isString()) {
                                  allHeaders = headersValue.asString(runtime).utf8(runtime);
                                  LOGI("Headers collected at HEADERS_RECEIVED: length=%zu", allHeaders.length());
                                  if (!allHeaders.empty()) {
                                    LOGI("Headers content (first 200 chars): %s", allHeaders.substr(0, 200).c_str());
                                  } else {
                                    LOGW("Headers string is empty at HEADERS_RECEIVED / HEADERS_RECEIVED에서 헤더 문자열이 비어있음");
                                  }
                                  // Store headers string in metadata for later use / 나중에 사용하기 위해 메타데이터에 헤더 문자열 저장
                                  metadata.setProperty(runtime, "__responseHeaders", facebook::jsi::String::createFromUtf8(runtime, allHeaders));
                                  LOGI("Headers stored in metadata / 메타데이터에 헤더 저장됨");
                                } else {
                                  LOGW("getAllResponseHeaders returned non-string value / getAllResponseHeaders가 문자열이 아닌 값을 반환함");
                                }
                              } else {
                                LOGW("getAllResponseHeaders is not a function / getAllResponseHeaders가 함수가 아님");
                              }
                            } else {
                              LOGW("Metadata not found at HEADERS_RECEIVED / HEADERS_RECEIVED에서 메타데이터를 찾을 수 없음");
                            }
                          } catch (const std::exception& e) {
                            LOGE("Exception while collecting headers at HEADERS_RECEIVED: %s", e.what());
                          } catch (...) {
                            LOGE("Unknown exception while collecting headers at HEADERS_RECEIVED / HEADERS_RECEIVED에서 헤더 수집 중 알 수 없는 예외");
                          }
                        }

                        // DONE (4) - collect response data and send events / 응답 데이터 수집 및 이벤트 전송
                        // This is when React Native XHRInterceptor collects response body / React Native XHRInterceptor가 응답 본문을 수집하는 시점
                        // XHRInterceptor uses this.response (not responseText) / XHRInterceptor는 this.response를 사용함 (responseText 아님)
                        if (readyState == 4) {
                          // Collect response info / 응답 정보 수집
                          // collectXHRResponseInfo will try responseText first, then response / collectXHRResponseInfo는 먼저 responseText를 시도하고, 그 다음 response를 시도함
                          ResponseInfo responseInfo = collectXHRResponseInfo(runtime, xhrObj);

                          // Check if this is a network error (status === 0) / 네트워크 에러인지 확인 (status === 0)
                          // XHR status is 0 for network errors (DNS failure, connection refused, etc.) / XHR status가 0이면 네트워크 에러 (DNS 실패, 연결 거부 등)
                          if (responseInfo.status == 0) {
                            // Mark error as handled in metadata to prevent duplicate handling / 중복 처리 방지를 위해 메타데이터에 에러 처리됨으로 표시
                            try {
                              facebook::jsi::Value metadataValue = xhrObj.getProperty(runtime, "__cdpNetworkMetadata");
                              if (metadataValue.isObject()) {
                                facebook::jsi::Object metadata = metadataValue.asObject(runtime);
                                metadata.setProperty(runtime, "__errorHandled", facebook::jsi::Value(true));
                              }
                            } catch (...) {
                              // Failed to set error handled flag / 에러 처리 플래그 설정 실패
                            }

                            // Network error - send loadingFailed event / 네트워크 에러 - loadingFailed 이벤트 전송
                            LOGI("Network error detected (status=0) - sending loadingFailed / 네트워크 에러 감지 (status=0) - loadingFailed 전송");
                            sendLoadingFailed(runtime, requestId, "Network error", "XHR");
                            return facebook::jsi::Value::undefined();
                          }

                          // Use headers collected at HEADERS_RECEIVED (readyState 2) / HEADERS_RECEIVED (readyState 2)에서 수집한 헤더 사용
                          // XHRInterceptor pattern: headers are collected at HEADERS_RECEIVED, not at DONE / XHRInterceptor 패턴: 헤더는 HEADERS_RECEIVED에서 수집하고, DONE에서 수집하지 않음
                          LOGI("ReadyState DONE (4) - using headers from metadata / ReadyState DONE (4) - 메타데이터에서 헤더 사용");
                          bool headersFound = false;
                          try {
                            facebook::jsi::Value metadataValue = xhrObj.getProperty(runtime, "__cdpNetworkMetadata");
                            if (metadataValue.isObject()) {
                              LOGI("Metadata found, checking for stored headers / 메타데이터 발견, 저장된 헤더 확인 중");
                              facebook::jsi::Object metadata = metadataValue.asObject(runtime);
                              facebook::jsi::Value headersValue = metadata.getProperty(runtime, "__responseHeaders");
                              if (headersValue.isString()) {
                                std::string allHeaders = headersValue.asString(runtime).utf8(runtime);
                                LOGI("Stored headers found: length=%zu", allHeaders.length());
                                if (!allHeaders.empty()) {
                                  LOGI("Stored headers content (first 200 chars): %s", allHeaders.substr(0, 200).c_str());
                                  // Format and use stored headers / 저장된 헤더 포맷팅 및 사용
                                  responseInfo.headers = formatResponseHeaders(allHeaders);
                                  headersFound = true;
                                  LOGI("Headers formatted and set from metadata / 메타데이터에서 헤더 포맷팅 및 설정 완료");
                                } else {
                                  LOGW("Stored headers string is empty / 저장된 헤더 문자열이 비어있음");
                                }
                              } else {
                                LOGW("__responseHeaders is not a string in metadata / 메타데이터의 __responseHeaders가 문자열이 아님");
                              }
                            } else {
                              LOGW("Metadata not found at DONE / DONE에서 메타데이터를 찾을 수 없음");
                            }
                          } catch (const std::exception& e) {
                            LOGE("Exception while getting stored headers: %s", e.what());
                          } catch (...) {
                            LOGE("Unknown exception while getting stored headers / 저장된 헤더 가져오기 중 알 수 없는 예외");
                          }

                          // Failed to get stored headers, try to collect at DONE as fallback / 저장된 헤더 가져오기 실패, 폴백으로 DONE에서 수집 시도
                          if (!headersFound) {
                            LOGI("Headers not found in metadata, trying to collect at DONE / 메타데이터에서 헤더를 찾을 수 없음, DONE에서 수집 시도");
                            try {
                              facebook::jsi::Value getAllResponseHeadersValue = xhrObj.getProperty(runtime, "getAllResponseHeaders");
                              if (getAllResponseHeadersValue.isObject() && getAllResponseHeadersValue.asObject(runtime).isFunction(runtime)) {
                                LOGI("getAllResponseHeaders function found at DONE / DONE에서 getAllResponseHeaders 함수 발견");
                                facebook::jsi::Function getAllResponseHeaders = getAllResponseHeadersValue.asObject(runtime).asFunction(runtime);
                                facebook::jsi::Value headersValue = getAllResponseHeaders.callWithThis(runtime, xhrObj);
                                if (headersValue.isString()) {
                                  std::string allHeaders = headersValue.asString(runtime).utf8(runtime);
                                  LOGI("Headers collected at DONE: length=%zu", allHeaders.length());
                                  if (!allHeaders.empty()) {
                                    LOGI("Headers content at DONE (first 200 chars): %s", allHeaders.substr(0, 200).c_str());
                                    // Format and use headers / 헤더 포맷팅 및 사용
                                    responseInfo.headers = formatResponseHeaders(allHeaders);
                                    headersFound = true;
                                    LOGI("Headers formatted and set from DONE collection / DONE 수집에서 헤더 포맷팅 및 설정 완료");
                                  } else {
                                    LOGW("Headers string is empty at DONE / DONE에서 헤더 문자열이 비어있음");
                                  }
                                } else {
                                  LOGW("getAllResponseHeaders returned non-string value at DONE / DONE에서 getAllResponseHeaders가 문자열이 아닌 값을 반환함");
                                }
                              } else {
                                LOGW("getAllResponseHeaders is not a function at DONE / DONE에서 getAllResponseHeaders가 함수가 아님");
                              }
                            } catch (const std::exception& e) {
                              LOGE("Exception while collecting headers at DONE: %s", e.what());
                            } catch (...) {
                              LOGE("Unknown exception while collecting headers at DONE / DONE에서 헤더 수집 중 알 수 없는 예외");
                            }
                          }

                          // Check final headers state / 최종 헤더 상태 확인
                          if (headersFound) {
                            LOGI("Headers successfully set in responseInfo / responseInfo에 헤더 성공적으로 설정됨");
                          } else {
                            LOGW("No headers found in responseInfo, using headers from collectXHRResponseInfo / responseInfo에 헤더 없음, collectXHRResponseInfo의 헤더 사용");
                          }

                          // For fetch requests, body is handled by Fetch hook, so clear it here / Fetch 요청의 경우 본문은 Fetch 훅에서 처리하므로 여기서 지움
                          if (isFetchRequest) {
                            // Check if Fetch hook already stored the body / Fetch 훅이 이미 본문을 저장했는지 확인
                            std::string fetchBody;
                            {
                              std::lock_guard<std::mutex> lock(g_responseDataMutex);
                              auto it = g_responseData.find(requestId);
                              if (it != g_responseData.end()) {
                                fetchBody = it->second;
                                LOGI("XHRHook: Found body from Fetch hook for requestId=%s, length=%zu / XHRHook: requestId=%s에 대한 Fetch 훅의 본문 발견, 길이=%zu", requestId.c_str(), fetchBody.length(), requestId.c_str(), fetchBody.length());
                              } else {
                                LOGW("XHRHook: Body not found from Fetch hook for requestId=%s / XHRHook: requestId=%s에 대한 Fetch 훅의 본문을 찾을 수 없음", requestId.c_str(), requestId.c_str());
                              }
                            }
                            // Clear responseText (body will be retrieved from g_responseData by Network.getResponseBody) / responseText 지우기 (본문은 Network.getResponseBody에서 g_responseData에서 가져옴)
                            responseInfo.responseText = "";
                            LOGI("XHRHook: Sending responseReceived for fetch request without body / XHRHook: 본문 없이 fetch 요청에 대한 responseReceived 전송");
                          } else {
                            // Store response data for regular XHR requests / 일반 XHR 요청에 대한 응답 데이터 저장 (thread-safe / 스레드 안전)
                            // Only store if responseText is not empty / responseText가 비어있지 않을 때만 저장
                            if (!responseInfo.responseText.empty()) {
                              std::lock_guard<std::mutex> lock(g_responseDataMutex);
                              g_responseData[requestId] = responseInfo.responseText;
                            }
                          }

                          // Send responseReceived event / responseReceived 이벤트 전송
                          // Use "Fetch" for fetch requests, "XHR" for regular XHR requests / Fetch 요청에는 "Fetch", 일반 XHR 요청에는 "XHR" 사용
                          sendResponseReceived(runtime, requestId, capturedUrl, responseInfo, isFetchRequest ? "Fetch" : "XHR");

                          // Send loadingFinished event / loadingFinished 이벤트 전송
                          // For fetch requests, use empty string (body is in g_responseData) / Fetch 요청의 경우 빈 문자열 사용 (본문은 g_responseData에 있음)
                          sendLoadingFinished(runtime, requestId, isFetchRequest ? "" : responseInfo.responseText);
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
                  // Note: This is a fallback in case readystatechange didn't capture the data / 참고: readystatechange에서 데이터를 캡처하지 못한 경우를 위한 폴백
                  facebook::jsi::Value loadListener = facebook::jsi::Function::createFromHostFunction(
                  rt,
                    facebook::jsi::PropNameID::forAscii(rt, "loadListener"),
                  0,
                  [requestId](facebook::jsi::Runtime& runtime,
                              const facebook::jsi::Value& thisVal,
                              const facebook::jsi::Value*,
                              size_t) -> facebook::jsi::Value {
                    if (thisVal.isObject()) {
                        facebook::jsi::Object xhrObj = thisVal.asObject(runtime);
                        ResponseInfo responseInfo = collectXHRResponseInfo(runtime, xhrObj);

                        // Update response data if it was empty in readystatechange / readystatechange에서 비어있었으면 응답 데이터 업데이트
                        // Only update if we have data and it's not already stored / 데이터가 있고 아직 저장되지 않았을 때만 업데이트
                        if (!responseInfo.responseText.empty()) {
                          std::lock_guard<std::mutex> lock(g_responseDataMutex);
                          // Only update if not already set / 이미 설정되지 않았을 때만 업데이트
                          if (g_responseData.find(requestId) == g_responseData.end() || g_responseData[requestId].empty()) {
                            g_responseData[requestId] = responseInfo.responseText;
                          }
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
                                const facebook::jsi::Value& thisVal,
                                const facebook::jsi::Value*,
                                size_t) -> facebook::jsi::Value {
                      // Check if already handled by readystatechange using metadata flag / 메타데이터 플래그를 사용하여 readystatechange에서 이미 처리되었는지 확인
                      // Use metadata flag to prevent race conditions / race condition 방지를 위해 메타데이터 플래그 사용
                      if (thisVal.isObject()) {
                        facebook::jsi::Object xhrObj = thisVal.asObject(runtime);
                        try {
                          facebook::jsi::Value metadataValue = xhrObj.getProperty(runtime, "__cdpNetworkMetadata");
                          if (metadataValue.isObject()) {
                            facebook::jsi::Object metadata = metadataValue.asObject(runtime);
                            facebook::jsi::Value errorHandledValue = metadata.getProperty(runtime, "__errorHandled");
                            if (errorHandledValue.isBool() && errorHandledValue.getBool()) {
                              LOGI("Error event fired but already handled by readystatechange / 에러 이벤트 발생했지만 이미 readystatechange에서 처리됨");
                              return facebook::jsi::Value::undefined();
                            }
                            // Mark error as handled to prevent duplicate handling / 중복 처리 방지를 위해 에러 처리됨으로 표시
                            metadata.setProperty(runtime, "__errorHandled", facebook::jsi::Value(true));
                          }
                        } catch (...) {
                          // Failed to check error handled flag / 에러 처리 플래그 확인 실패
                        }
                      }
                      // Otherwise, send loadingFailed / 그렇지 않으면 loadingFailed 전송
                      LOGI("Error event fired - sending loadingFailed / 에러 이벤트 발생 - loadingFailed 전송");
                      sendLoadingFailed(runtime, requestId, "Network error", "XHR");
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
                    sendLoadingFailed(runtime, requestId, "Request timeout", "XHR");
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

