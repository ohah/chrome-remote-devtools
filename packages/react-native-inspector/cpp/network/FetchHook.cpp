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
  // Declare hookedFetch outside try block so it can be used after / hookedFetch를 try 블록 밖에 선언하여 이후에 사용 가능하게 함
  facebook::jsi::Function hookedFetch = facebook::jsi::Function::createFromHostFunction(
    runtime,
    facebook::jsi::PropNameID::forAscii(runtime, "fetch"),
    2, // input, init (optional)
    [](facebook::jsi::Runtime& /*rt*/,
       const facebook::jsi::Value& /*thisVal*/,
       const facebook::jsi::Value* /*args*/,
       size_t /*count*/) -> facebook::jsi::Value {
      // This will be filled in below / 아래에서 채워질 것임
      return facebook::jsi::Value::undefined();
    }
  );

  try {
    // Check if already hooked by checking for backup property / 백업 속성 확인하여 이미 훅되었는지 확인
    facebook::jsi::Value originalFetchValue = runtime.global().getProperty(runtime, "__original_fetch");
    if (originalFetchValue.isObject() && originalFetchValue.asObject(runtime).isFunction(runtime)) {
      LOGW("Fetch already hooked, skipping / Fetch가 이미 훅되었으므로 건너뜀");
      return true;
    }

    facebook::jsi::Value fetchValue = runtime.global().getProperty(runtime, "fetch");
    if (fetchValue.isObject() && fetchValue.asObject(runtime).isFunction(runtime)) {
      // Store original fetch in backup property / 백업 속성에 원본 fetch 저장
      runtime.global().setProperty(runtime, "__original_fetch", std::move(fetchValue));

      // Create hooked fetch function / 훅된 fetch 함수 생성
      hookedFetch = facebook::jsi::Function::createFromHostFunction(
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

          // Set global flag to indicate fetch request is active / Fetch 요청이 활성화되었음을 나타내는 전역 플래그 설정
          {
            std::lock_guard<std::mutex> lock(g_fetchRequestMutex);
            g_isFetchRequestActive.store(true);
            g_activeFetchRequestId = requestId;
          }

          // Send requestWillBeSent event only / requestWillBeSent 이벤트만 전송
          sendRequestWillBeSent(rt, requestId, requestInfo, "Fetch");

          // Call original fetch / 원본 fetch 호출
          facebook::jsi::Value fetchResult = facebook::jsi::Value::undefined();
          try {
            facebook::jsi::Value originalFetchValue = rt.global().getProperty(rt, "__original_fetch");
            if (originalFetchValue.isObject() && originalFetchValue.asObject(rt).isFunction(rt)) {
              fetchResult = originalFetchValue.asObject(rt).asFunction(rt).call(rt, args, count);
            } else {
              // __original_fetch not found - this should not happen / __original_fetch를 찾을 수 없음 - 이는 발생하지 않아야 함
              LOGE("__original_fetch not found, cannot call original fetch / __original_fetch를 찾을 수 없어 원본 fetch를 호출할 수 없음");
              // Clear flag on error / 에러 시 플래그 지우기
              {
                std::lock_guard<std::mutex> lock(g_fetchRequestMutex);
                g_isFetchRequestActive.store(false);
                g_activeFetchRequestId.clear();
              }
              // Return undefined to fail the request / 요청을 실패시키기 위해 undefined 반환
              return facebook::jsi::Value::undefined();
            }
          } catch (const std::exception& e) {
            LOGE("Failed to call original fetch: %s", e.what());
            // Clear flag on error / 에러 시 플래그 지우기
            {
              std::lock_guard<std::mutex> lock(g_fetchRequestMutex);
              g_isFetchRequestActive.store(false);
              g_activeFetchRequestId.clear();
            }
            return facebook::jsi::Value::undefined();
          }

          // Clear flag after fetch is called (XHR will handle tracking) / fetch 호출 후 플래그 지우기 (XHR이 추적 처리)
          {
            std::lock_guard<std::mutex> lock(g_fetchRequestMutex);
            g_isFetchRequestActive.store(false);
            g_activeFetchRequestId.clear();
          }

          // Ensure fetchResult is a valid Promise / fetchResult가 유효한 Promise인지 확인
          if (!fetchResult.isObject()) {
            LOGE("Original fetch did not return a Promise / 원본 fetch가 Promise를 반환하지 않음");
            // Return the result as-is (might be undefined or error) / 결과를 그대로 반환 (undefined이거나 에러일 수 있음)
            return fetchResult;
          }

          // Capture requestInfo by value for lambda / 람다를 위해 requestInfo를 값으로 캡처
          RequestInfo capturedRequestInfo = requestInfo;
          std::string capturedRequestId = requestId;
          // Store fetchResult in a way that can be accessed from lambda / 람다에서 접근할 수 있도록 fetchResult 저장
          // Since jsi::Value cannot be copied, we need to move it / jsi::Value는 복사할 수 없으므로 move 필요
          // But we need to use it after lambda creation, so we'll access it directly from outer scope / 하지만 람다 생성 후에도 사용해야 하므로 외부 스코프에서 직접 접근
          facebook::jsi::Value onFulfilled = facebook::jsi::Function::createFromHostFunction(
            rt,
            facebook::jsi::PropNameID::forAscii(rt, "onFulfilled"),
            1,
            [capturedRequestId, capturedRequestInfo](facebook::jsi::Runtime& runtime,
                                               const facebook::jsi::Value&,
                                               const facebook::jsi::Value* args,
                                               size_t count) -> facebook::jsi::Value {
                LOGI("FetchHook: onFulfilled called for requestId=%s / FetchHook: requestId=%s에 대한 onFulfilled 호출됨", capturedRequestId.c_str(), capturedRequestId.c_str());
                if (count > 0 && args[0].isObject()) {
                  facebook::jsi::Object response = args[0].asObject(runtime);
                  LOGI("FetchHook: Response object received, starting body extraction / FetchHook: 응답 객체 수신, 본문 추출 시작");

                  // Collect response info / 응답 정보 수집
                  ResponseInfo responseInfo = collectFetchResponseInfo(runtime, response);

                  // Try to extract blob data from response object before calling response.clone().text() / response.clone().text() 호출 전에 response 객체에서 blob 데이터 추출 시도
                  std::string preExtractedData = "";
                  try {
                    // Try to get _data property from response / response에서 _data 속성 가져오기 시도
                    if (response.hasProperty(runtime, "_data")) {
                      facebook::jsi::Value _dataValue = response.getProperty(runtime, "_data");
                      if (_dataValue.isString()) {
                        std::string dataStr = _dataValue.asString(runtime).utf8(runtime);
                        if (dataStr.length() > 50 &&
                            dataStr.find("blobId") == std::string::npos) {
                          preExtractedData = dataStr;
                          LOGI("FetchHook: Pre-extracted data from response._data, length=%zu / FetchHook: response._data에서 사전 추출된 데이터, 길이=%zu", preExtractedData.length(), preExtractedData.length());
                        }
                      } else if (_dataValue.isObject()) {
                        facebook::jsi::Object _dataObj = _dataValue.asObject(runtime);
                        // Try common property names / 일반적인 속성 이름 시도
                        std::vector<std::string> dataProps = {"data", "content", "text", "body", "value", "string", "buffer"};
                        for (const auto& propName : dataProps) {
                          try {
                            if (_dataObj.hasProperty(runtime, propName.c_str())) {
                              facebook::jsi::Value propValue = _dataObj.getProperty(runtime, propName.c_str());
                              if (propValue.isString()) {
                                std::string propData = propValue.asString(runtime).utf8(runtime);
                                if (propData.length() > 50) {
                                  preExtractedData = propData;
                                  LOGI("FetchHook: Pre-extracted data from response._data.%s, length=%zu / FetchHook: response._data.%s에서 사전 추출된 데이터, 길이=%zu",
                                       propName.c_str(), preExtractedData.length(), propName.c_str(), preExtractedData.length());
                                  break;
                                }
                              }
                            }
                          } catch (...) {
                            // Continue to next property / 다음 속성으로 계속
                          }
                        }
                      }
                    }

                    // If still not found, try response object directly / 여전히 찾지 못한 경우 response 객체 직접 시도
                    if (preExtractedData.empty()) {
                      std::vector<std::string> responseProps = {"_data", "data", "content", "text", "body", "value", "string"};
                      for (const auto& propName : responseProps) {
                        try {
                          if (response.hasProperty(runtime, propName.c_str())) {
                            facebook::jsi::Value propValue = response.getProperty(runtime, propName.c_str());
                            if (propValue.isString()) {
                              std::string propData = propValue.asString(runtime).utf8(runtime);
                              if (propData.length() > 50 &&
                                  propData.find("blobId") == std::string::npos) {
                                preExtractedData = propData;
                                LOGI("FetchHook: Pre-extracted data from response.%s, length=%zu / FetchHook: response.%s에서 사전 추출된 데이터, 길이=%zu",
                                     propName.c_str(), preExtractedData.length(), propName.c_str(), preExtractedData.length());
                                break;
                              }
                            }
                          }
                        } catch (...) {
                          // Continue to next property / 다음 속성으로 계속
                        }
                      }
                    }
                  } catch (const std::exception& e) {
                    LOGE("FetchHook: Exception while pre-extracting blob data: %s / FetchHook: blob 데이터 사전 추출 중 예외: %s", e.what(), e.what());
                  } catch (...) {
                    LOGW("FetchHook: Unknown exception while pre-extracting blob data / FetchHook: blob 데이터 사전 추출 중 알 수 없는 예외");
                  }

                  try {
                    // Clone response and read body / 응답 복제 및 본문 읽기
                    LOGI("FetchHook: Attempting to clone response and read body / FetchHook: 응답 복제 및 본문 읽기 시도");
                    facebook::jsi::Value cloneValue = response.getProperty(runtime, "clone");
                    if (cloneValue.isObject() && cloneValue.asObject(runtime).isFunction(runtime)) {
                      LOGI("FetchHook: clone() method found, calling it / FetchHook: clone() 메서드 발견, 호출");
                      facebook::jsi::Function clone = cloneValue.asObject(runtime).asFunction(runtime);
                      // Call clone with response as this to ensure proper context / 올바른 컨텍스트를 위해 response를 this로 하여 clone 호출
                      facebook::jsi::Value clonedResponseValue = clone.callWithThis(runtime, response);
                      // Check if clone returned a valid object / clone이 유효한 객체를 반환했는지 확인
                      if (clonedResponseValue.isObject() && !clonedResponseValue.isNull() && !clonedResponseValue.isUndefined()) {
                        LOGI("FetchHook: clone() returned valid object, getting text() / FetchHook: clone()이 유효한 객체 반환, text() 가져오기");
                        facebook::jsi::Object clonedResponse = clonedResponseValue.asObject(runtime);
                        facebook::jsi::Value textValue = clonedResponse.getProperty(runtime, "text");
                        if (textValue.isObject() && textValue.asObject(runtime).isFunction(runtime)) {
                          LOGI("FetchHook: text() method found, calling it / FetchHook: text() 메서드 발견, 호출");
                          facebook::jsi::Function text = textValue.asObject(runtime).asFunction(runtime);
                          // Use callWithThis to bind clonedResponse as this / clonedResponse를 this로 바인딩하기 위해 callWithThis 사용
                          facebook::jsi::Value textPromise = text.callWithThis(runtime, clonedResponse);
                          if (textPromise.isObject()) {
                            LOGI("FetchHook: text() returned Promise, setting up then() / FetchHook: text()가 Promise 반환, then() 설정");
                            facebook::jsi::Object textPromiseObj = textPromise.asObject(runtime);
                            facebook::jsi::Value thenValue = textPromiseObj.getProperty(runtime, "then");
                            if (thenValue.isObject() && thenValue.asObject(runtime).isFunction(runtime)) {
                              LOGI("FetchHook: Promise.then() found, setting up callback / FetchHook: Promise.then() 발견, 콜백 설정");
                              facebook::jsi::Function textThen = thenValue.asObject(runtime).asFunction(runtime);
                              // Capture responseInfo and preExtractedData by value for lambda / 람다를 위해 responseInfo와 preExtractedData를 값으로 캡처
                              ResponseInfo capturedResponseInfo = responseInfo;
                              std::string capturedPreExtractedData = preExtractedData;
                              facebook::jsi::Value onTextFulfilled = facebook::jsi::Function::createFromHostFunction(
                                runtime,
                                facebook::jsi::PropNameID::forAscii(runtime, "onTextFulfilled"),
                                1,
                                [capturedRequestId, capturedRequestInfo, capturedResponseInfo, capturedPreExtractedData](facebook::jsi::Runtime& rt,
                                                                                         const facebook::jsi::Value&,
                                                                                         const facebook::jsi::Value* textArgs,
                                                                                         size_t) -> facebook::jsi::Value {
                                  LOGI("FetchHook: onTextFulfilled called for requestId=%s / FetchHook: requestId=%s에 대한 onTextFulfilled 호출됨", capturedRequestId.c_str(), capturedRequestId.c_str());
                                  std::string responseText;
                                  if (textArgs[0].isString()) {
                                    responseText = textArgs[0].asString(rt).utf8(rt);
                                    LOGI("FetchHook: Response text received, length=%zu / FetchHook: 응답 텍스트 수신, 길이=%zu", responseText.length(), responseText.length());
                                  } else {
                                    LOGW("FetchHook: onTextFulfilled received non-string argument / FetchHook: onTextFulfilled가 문자열이 아닌 인자 수신");
                                  }

                                  // Check if response.text() returned blob metadata instead of actual data / response.text()가 실제 데이터 대신 blob 메타데이터를 반환했는지 확인
                                  if (responseText.length() < 500 &&
                                      responseText.find("blobId") != std::string::npos &&
                                      responseText.find("size") != std::string::npos &&
                                      responseText.find("offset") != std::string::npos) {
                                    LOGW("FetchHook: response.text() returned blob metadata instead of actual data / FetchHook: response.text()가 실제 데이터 대신 blob 메타데이터 반환");
                                    LOGI("FetchHook: blob metadata: %s / FetchHook: blob 메타데이터: %s", responseText.c_str(), responseText.c_str());

                                    // Use pre-extracted data if available / 사전 추출된 데이터가 있으면 사용
                                    if (!capturedPreExtractedData.empty()) {
                                      responseText = capturedPreExtractedData;
                                      LOGI("FetchHook: Using pre-extracted data, length=%zu / FetchHook: 사전 추출된 데이터 사용, 길이=%zu", responseText.length(), responseText.length());
                                    } else {
                                      responseText = ""; // Clear metadata / 메타데이터 지우기
                                      LOGW("FetchHook: Could not extract actual data from response object / FetchHook: response 객체에서 실제 데이터를 추출할 수 없음");
                                    }
                                  }

                                  // Store response data only (XHR hook handles responseReceived and loadingFinished) / 응답 데이터만 저장 (XHR 훅이 responseReceived와 loadingFinished 처리)
                                  {
                                    std::lock_guard<std::mutex> lock(g_responseDataMutex);
                                    g_responseData[capturedRequestId] = responseText;
                                  }

                                  LOGI("FetchHook: Response body stored for requestId=%s, length=%zu / FetchHook: requestId=%s에 대한 응답 본문 저장, 길이=%zu", capturedRequestId.c_str(), responseText.length(), capturedRequestId.c_str(), responseText.length());

                                  return facebook::jsi::Value::undefined();
                                }
                              );
                              // Use callWithThis to bind textPromiseObj as this / textPromiseObj를 this로 바인딩하기 위해 callWithThis 사용
                              textThen.callWithThis(runtime, textPromiseObj, onTextFulfilled);
                              LOGI("FetchHook: textThen.callWithThis() completed / FetchHook: textThen.callWithThis() 완료");
                            } else {
                              LOGW("FetchHook: Promise.then() is not a function / FetchHook: Promise.then()이 함수가 아님");
                            }
                          } else {
                            LOGW("FetchHook: text() did not return an object / FetchHook: text()가 객체를 반환하지 않음");
                          }
                        } else {
                          LOGW("FetchHook: text() is not a function / FetchHook: text()가 함수가 아님");
                        }
                      } else {
                        LOGW("FetchHook: clone() did not return a valid object / FetchHook: clone()이 유효한 객체를 반환하지 않음");
                      }
                    } else {
                      LOGW("FetchHook: clone() is not a function / FetchHook: clone()이 함수가 아님");
                    }
                  } catch (const std::exception& e) {
                    LOGE("FetchHook: Exception while processing response: %s / FetchHook: 응답 처리 중 예외: %s", e.what(), e.what());
                  } catch (...) {
                    LOGE("FetchHook: Unknown exception while processing response / FetchHook: 응답 처리 중 알 수 없는 예외");
                  }
                }
                // Return original response / 원본 응답 반환
                // In Promise then callback, we need to return the value as-is / Promise then 콜백에서는 값을 그대로 반환해야 함
                // This is critical for the Promise chain to work correctly / Promise 체인이 올바르게 동작하려면 이것이 중요함
                LOGI("FetchHook: onFulfilled returning original response / FetchHook: onFulfilled가 원본 응답 반환");
                if (count > 0) {
                  // Return the original response value directly / 원본 응답 값을 직접 반환
                  // Note: This is safe because we're moving the value, not modifying it / 참고: 값을 수정하는 것이 아니라 이동하는 것이므로 안전함
                  return std::move(const_cast<facebook::jsi::Value&>(args[0]));
                }
                LOGW("FetchHook: onFulfilled called with no arguments / FetchHook: onFulfilled가 인자 없이 호출됨");
                return facebook::jsi::Value::undefined();
              }
            );

            // Add error handler for Promise rejection / Promise rejection을 위한 에러 핸들러 추가
            facebook::jsi::Value onRejected = facebook::jsi::Function::createFromHostFunction(
              rt,
              facebook::jsi::PropNameID::forAscii(rt, "onRejected"),
              1,
              [capturedRequestId](facebook::jsi::Runtime& runtime,
                         const facebook::jsi::Value&,
                         const facebook::jsi::Value* args,
                         size_t count) -> facebook::jsi::Value {
                // Extract error message / 에러 메시지 추출
                std::string errorText = "Network error";
                if (count > 0) {
                  if (args[0].isString()) {
                    errorText = args[0].asString(runtime).utf8(runtime);
                  } else if (args[0].isObject()) {
                    facebook::jsi::Object errorObj = args[0].asObject(runtime);
                    facebook::jsi::Value messageValue = errorObj.getProperty(runtime, "message");
                    if (messageValue.isString()) {
                      errorText = messageValue.asString(runtime).utf8(runtime);
                    } else {
                      facebook::jsi::Value nameValue = errorObj.getProperty(runtime, "name");
                      if (nameValue.isString()) {
                        errorText = nameValue.asString(runtime).utf8(runtime);
                      }
                    }
                  }
                }

                // Send loadingFailed event / loadingFailed 이벤트 전송
                LOGE("Fetch request failed - sending loadingFailed: %s", errorText.c_str());
                sendLoadingFailed(runtime, capturedRequestId, errorText, "Fetch");

                // Re-throw the error to preserve original behavior / 원본 동작을 보존하기 위해 에러를 다시 throw
                // Create a rejected Promise / rejected Promise 생성
                try {
                  facebook::jsi::Value PromiseValue = runtime.global().getProperty(runtime, "Promise");
                  if (PromiseValue.isObject()) {
                    facebook::jsi::Object PromiseObj = PromiseValue.asObject(runtime);
                    facebook::jsi::Value rejectValue = PromiseObj.getProperty(runtime, "reject");
                    if (rejectValue.isObject() && rejectValue.asObject(runtime).isFunction(runtime)) {
                      facebook::jsi::Function reject = rejectValue.asObject(runtime).asFunction(runtime);
                      return reject.call(runtime, args[0]);
                    }
                  }
                } catch (...) {
                  // Failed to create rejected Promise / rejected Promise 생성 실패
                }
                // Fallback: return the error value / 폴백: 에러 값 반환
                // Note: This is safe because we're moving the value, not modifying it / 참고: 값을 수정하는 것이 아니라 이동하는 것이므로 안전함
                if (count > 0) {
                  return std::move(const_cast<facebook::jsi::Value&>(args[0]));
                }
                return facebook::jsi::Value::undefined();
              }
            );

            // then.call()은 새로운 Promise를 반환하므로, 그것을 반환해야 함 / then.call() returns a new Promise, so we must return it
            // Call then with both fulfilled and rejected handlers / fulfilled와 rejected 핸들러 모두 전달하여 then 호출
            // Get then method from fetchResult (which is still in scope) / fetchResult에서 then 메서드를 가져옴 (여전히 스코프 내에 있음)
            try {
              // fetchResult is still in scope, so we can use it directly / fetchResult는 여전히 스코프 내에 있으므로 직접 사용 가능
              if (!fetchResult.isObject()) {
                LOGE("FetchHook: fetchResult is not an object / FetchHook: fetchResult가 객체가 아님");
                return fetchResult;
              }
              facebook::jsi::Object promiseObj2 = fetchResult.asObject(rt);
              facebook::jsi::Value thenValue = promiseObj2.getProperty(rt, "then");
              if (!thenValue.isObject() || !thenValue.asObject(rt).isFunction(rt)) {
                LOGE("FetchHook: Promise does not have then method / FetchHook: Promise에 then 메서드가 없음");
                return fetchResult;
              }
              facebook::jsi::Function then = thenValue.asObject(rt).asFunction(rt);

              // Use callWithThis to bind promiseObj2 as this / promiseObj2를 this로 바인딩하기 위해 callWithThis 사용
              facebook::jsi::Value firstPromise = then.callWithThis(rt, promiseObj2, onFulfilled);
              if (firstPromise.isObject()) {
                facebook::jsi::Object firstPromiseObj = firstPromise.asObject(rt);
                facebook::jsi::Value catchValue = firstPromiseObj.getProperty(rt, "catch");
                if (catchValue.isObject() && catchValue.asObject(rt).isFunction(rt)) {
                  facebook::jsi::Function catchFunc = catchValue.asObject(rt).asFunction(rt);
                  // Use callWithThis to bind firstPromiseObj as this / firstPromiseObj를 this로 바인딩하기 위해 callWithThis 사용
                  facebook::jsi::Value hookedPromise = catchFunc.callWithThis(rt, firstPromiseObj, onRejected);
                  return hookedPromise;
                }
              }
              // Fallback: return first promise if catch is not available / catch를 사용할 수 없으면 첫 번째 promise 반환
              return firstPromise;
            } catch (const std::exception& e) {
              LOGE("FetchHook: Exception while calling then: %s / FetchHook: then 호출 중 예외: %s", e.what(), e.what());
              // Fallback: return original promise / 폴백: 원본 promise 반환
              return fetchResult;
            } catch (...) {
              LOGE("FetchHook: Unknown exception while calling then / FetchHook: then 호출 중 알 수 없는 예외");
              // Fallback: return original promise / 폴백: 원본 promise 반환
              return fetchResult;
            }
        }
      );

      runtime.global().setProperty(runtime, "fetch", std::move(hookedFetch));
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

