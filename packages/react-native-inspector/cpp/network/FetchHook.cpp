/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Modified for Chrome Remote DevTools / Chrome Remote DevTools용으로 수정됨
 */

#include "FetchHook.h"
#include "NetworkTypes.h"
#include "NetworkUtils.h"
#include "NetworkInfoCollector.h"
#include "NetworkEventSender.h"
#include "NetworkGlobals.h"

// Platform-specific log support / 플랫폼별 로그 지원
#ifdef __ANDROID__
#include <android/log.h>
#define LOG_TAG "FetchHook"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)
#define LOGW(...) __android_log_print(ANDROID_LOG_WARN, LOG_TAG, __VA_ARGS__)
#elif defined(__APPLE__)
#define LOG_TAG "FetchHook"
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

bool hookFetch(facebook::jsi::Runtime& runtime) {
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
          // Collect request info / 요청 정보 수집
          RequestInfo requestInfo = collectFetchRequestInfo(rt, args, count);
          std::string requestId = std::to_string(g_requestIdCounter.fetch_add(1));

          // Send requestWillBeSent event / requestWillBeSent 이벤트 전송
          sendRequestWillBeSent(rt, requestId, requestInfo, "Fetch");

          // Call original fetch from backup property and hook response / 백업 속성에서 원본 fetch 호출 및 응답 훅
          facebook::jsi::Value fetchResult = facebook::jsi::Value::undefined();
          try {
            facebook::jsi::Value originalFetchValue = rt.global().getProperty(rt, "__original_fetch");
            if (originalFetchValue.isObject() && originalFetchValue.asObject(rt).isFunction(rt)) {
              fetchResult = originalFetchValue.asObject(rt).asFunction(rt).call(rt, args, count);
            } else {
              // Fallback: try to get original fetch from global / 폴백: 전역에서 원본 fetch 가져오기 시도
              facebook::jsi::Value globalFetch = rt.global().getProperty(rt, "fetch");
              if (globalFetch.isObject() && globalFetch.asObject(rt).isFunction(rt)) {
                fetchResult = globalFetch.asObject(rt).asFunction(rt).call(rt, args, count);
              }
            }
          } catch (const std::exception& e) {
            LOGE("Failed to call original fetch: %s", e.what());
            // Return undefined if all attempts fail / 모든 시도가 실패하면 undefined 반환
            return facebook::jsi::Value::undefined();
          }

          // Ensure fetchResult is a valid Promise / fetchResult가 유효한 Promise인지 확인
          if (!fetchResult.isObject()) {
            LOGE("Original fetch did not return a Promise / 원본 fetch가 Promise를 반환하지 않음");
            return fetchResult;
          }

          facebook::jsi::Object promiseObj = fetchResult.asObject(rt);
          facebook::jsi::Value thenValue = promiseObj.getProperty(rt, "then");
          if (thenValue.isObject() && thenValue.asObject(rt).isFunction(rt)) {
            facebook::jsi::Function then = thenValue.asObject(rt).asFunction(rt);
            // Capture requestInfo by value for lambda / 람다를 위해 requestInfo를 값으로 캡처
            RequestInfo capturedRequestInfo = requestInfo;
            facebook::jsi::Value onFulfilled = facebook::jsi::Function::createFromHostFunction(
              rt,
              facebook::jsi::PropNameID::forAscii(rt, "onFulfilled"),
              1,
              [requestId, capturedRequestInfo](facebook::jsi::Runtime& runtime,
                                               const facebook::jsi::Value&,
                                               const facebook::jsi::Value* args,
                                               size_t count) -> facebook::jsi::Value {
                if (count > 0 && args[0].isObject()) {
                  facebook::jsi::Object response = args[0].asObject(runtime);

                  // Collect response info / 응답 정보 수집
                  ResponseInfo responseInfo = collectFetchResponseInfo(runtime, response);

                  try {
                    // Clone response and read body / 응답 복제 및 본문 읽기
                    facebook::jsi::Value cloneValue = response.getProperty(runtime, "clone");
                    if (cloneValue.isObject() && cloneValue.asObject(runtime).isFunction(runtime)) {
                      facebook::jsi::Function clone = cloneValue.asObject(runtime).asFunction(runtime);
                      facebook::jsi::Value clonedResponseValue = clone.call(runtime);
                      // Check if clone returned a valid object / clone이 유효한 객체를 반환했는지 확인
                      if (clonedResponseValue.isObject() && !clonedResponseValue.isNull() && !clonedResponseValue.isUndefined()) {
                        facebook::jsi::Object clonedResponse = clonedResponseValue.asObject(runtime);
                        facebook::jsi::Value textValue = clonedResponse.getProperty(runtime, "text");
                        if (textValue.isObject() && textValue.asObject(runtime).isFunction(runtime)) {
                          facebook::jsi::Function text = textValue.asObject(runtime).asFunction(runtime);
                          facebook::jsi::Value textPromise = text.call(runtime);
                          if (textPromise.isObject()) {
                            facebook::jsi::Object textPromiseObj = textPromise.asObject(runtime);
                            facebook::jsi::Value thenValue = textPromiseObj.getProperty(runtime, "then");
                            if (thenValue.isObject() && thenValue.asObject(runtime).isFunction(runtime)) {
                              facebook::jsi::Function textThen = thenValue.asObject(runtime).asFunction(runtime);
                              // Capture responseInfo by value for lambda / 람다를 위해 responseInfo를 값으로 캡처
                              ResponseInfo capturedResponseInfo = responseInfo;
                              facebook::jsi::Value onTextFulfilled = facebook::jsi::Function::createFromHostFunction(
                                runtime,
                                facebook::jsi::PropNameID::forAscii(runtime, "onTextFulfilled"),
                                1,
                                [requestId, capturedRequestInfo, capturedResponseInfo](facebook::jsi::Runtime& rt,
                                                                                         const facebook::jsi::Value&,
                                                                                         const facebook::jsi::Value* textArgs,
                                                                                         size_t) -> facebook::jsi::Value {
                                  std::string responseText;
                                  if (textArgs[0].isString()) {
                                    responseText = textArgs[0].asString(rt).utf8(rt);
                                  }

                                  // Update response info with body / 응답 정보에 본문 업데이트
                                  ResponseInfo updatedInfo = capturedResponseInfo;
                                  updatedInfo.responseText = responseText;

                                  // Store response data / 응답 데이터 저장
                                  g_responseData[requestId] = responseText;

                                  // Send responseReceived event / responseReceived 이벤트 전송
                                  sendResponseReceived(rt, requestId, capturedRequestInfo.url, updatedInfo, "Fetch");

                                  // Send loadingFinished event / loadingFinished 이벤트 전송
                                  sendLoadingFinished(rt, requestId, responseText);

                                  return facebook::jsi::Value::undefined();
                                }
                              );
                              textThen.call(runtime, onTextFulfilled);
                            }
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

            // then.call()은 새로운 Promise를 반환하므로, 그것을 반환해야 함 / then.call() returns a new Promise, so we must return it
            facebook::jsi::Value hookedPromise = then.call(rt, onFulfilled);
            if (hookedPromise.isObject()) {
              return hookedPromise;  // 훅이 적용된 Promise 반환 / Return Promise with hook applied
            }
          }

          // Fallback: 원본 Promise 반환 (훅 적용 실패 시) / Fallback: return original Promise (if hook failed)
          return fetchResult;
        }
      );

      runtime.global().setProperty(runtime, "fetch", hookedFetch);
      return true;
    }
    return false;
  } catch (const std::exception& e) {
    LOGE("Failed to hook fetch / fetch 훅 실패: %s", e.what());
    return false;
  }
}

} // namespace network
} // namespace chrome_remote_devtools

