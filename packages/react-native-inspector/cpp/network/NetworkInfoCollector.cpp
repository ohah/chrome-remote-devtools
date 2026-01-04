/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Modified for Chrome Remote DevTools / Chrome Remote DevTools용으로 수정됨
 */

#include "NetworkInfoCollector.h"
#include "NetworkUtils.h"
#include <string>

// Platform-specific log support / 플랫폼별 로그 지원
#ifdef __ANDROID__
#include <android/log.h>
#define LOG_TAG "NetworkInfoCollector"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)
#define LOGW(...) __android_log_print(ANDROID_LOG_WARN, LOG_TAG, __VA_ARGS__)
#elif defined(__APPLE__)
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

// Collect XHR request info from metadata / 메타데이터에서 XHR 요청 정보 수집
RequestInfo collectXHRRequestInfo(facebook::jsi::Runtime& runtime,
                                  facebook::jsi::Object& metadata,
                                  const facebook::jsi::Value* args,
                                  size_t count) {
  RequestInfo info;
  info.method = metadata.getProperty(runtime, "method").asString(runtime).utf8(runtime);
  info.url = metadata.getProperty(runtime, "url").asString(runtime).utf8(runtime);
  info.headers = getDefaultHeaders(runtime);

  // Get headers from metadata / 메타데이터에서 헤더 가져오기
  facebook::jsi::Value headersValue = metadata.getProperty(runtime, "headers");
  if (headersValue.isObject()) {
    facebook::jsi::Object headersObj = headersValue.asObject(runtime);
    facebook::jsi::Array propNames = headersObj.getPropertyNames(runtime);
    for (size_t i = 0; i < propNames.size(runtime); i++) {
      facebook::jsi::Value keyValue = propNames.getValueAtIndex(runtime, i);
      if (keyValue.isString()) {
        std::string key = keyValue.asString(runtime).utf8(runtime);
        facebook::jsi::Value valueValue = headersObj.getProperty(runtime, key.c_str());
        if (valueValue.isString()) {
          info.headers[key] = valueValue.asString(runtime).utf8(runtime);
        }
      }
    }
  }

  // Get post data / POST 데이터 가져오기
  if (count > 0 && !args[0].isUndefined() && !args[0].isNull()) {
    if (args[0].isString()) {
      info.postData = args[0].asString(runtime).utf8(runtime);
    } else {
      // Try to stringify / 문자열화 시도
      try {
        facebook::jsi::Value jsonValue = runtime.global().getPropertyAsObject(runtime, "JSON")
          .getPropertyAsFunction(runtime, "stringify")
          .call(runtime, args[0]);
        if (jsonValue.isString()) {
          info.postData = jsonValue.asString(runtime).utf8(runtime);
        }
      } catch (...) {
        // Stringify failed / 문자열화 실패
      }
    }
  }

  return info;
}

// Collect XHR response info / XHR 응답 정보 수집
ResponseInfo collectXHRResponseInfo(facebook::jsi::Runtime& runtime,
                                    facebook::jsi::Object& xhrObj) {
  ResponseInfo info;
  info.status = 0;
  info.statusText = "";
  info.responseText = "";
  info.contentType = "";

  try {
    facebook::jsi::Value statusValue = xhrObj.getProperty(runtime, "status");
    if (statusValue.isNumber()) {
      info.status = static_cast<int>(statusValue.asNumber());
    }
    facebook::jsi::Value statusTextValue = xhrObj.getProperty(runtime, "statusText");
    if (statusTextValue.isString()) {
      info.statusText = statusTextValue.asString(runtime).utf8(runtime);
    }

    // Get responseType first to determine how to read response / 먼저 responseType을 가져와서 응답을 읽는 방법 결정
    // XHRInterceptor pattern: use this.response (not responseText) / XHRInterceptor 패턴: this.response 사용 (responseText 아님)
    // Reference: XHRInterceptor.js line 182 uses this.response directly / 참조: XHRInterceptor.js 182번 줄에서 this.response를 직접 사용
    std::string responseType = "";
    try {
      facebook::jsi::Value responseTypeValue = xhrObj.getProperty(runtime, "responseType");
      if (responseTypeValue.isString()) {
        responseType = responseTypeValue.asString(runtime).utf8(runtime);
      }
    } catch (...) {
      // responseType not available, assume default (empty string) / responseType을 사용할 수 없음, 기본값(빈 문자열) 가정
    }

    // XHRInterceptor pattern: use this.response directly / XHRInterceptor 패턴: this.response를 직접 사용
    // Handle different responseType cases explicitly / responseType 케이스를 명시적으로 처리
    try {
      facebook::jsi::Value responseValue = xhrObj.getProperty(runtime, "response");

      // Case 1: responseType is '' or 'text' - response is a string / 케이스 1: responseType이 '' 또는 'text' - response는 문자열
      if (responseType.empty() || responseType == "text") {
        if (responseValue.isString()) {
          info.responseText = responseValue.asString(runtime).utf8(runtime);
          LOGI("NetworkInfoCollector: Collected response (text): length=%zu / 응답 수집됨 (text): 길이=%zu", info.responseText.length());
        }
      }
      // Case 2: responseType is 'json' - response is a parsed JSON object / 케이스 2: responseType이 'json' - response는 파싱된 JSON 객체
      else if (responseType == "json") {
        if (responseValue.isObject()) {
          // Stringify the JSON object / JSON 객체를 문자열화
          facebook::jsi::Value jsonValue = runtime.global().getPropertyAsObject(runtime, "JSON")
            .getPropertyAsFunction(runtime, "stringify")
            .call(runtime, responseValue);
          if (jsonValue.isString()) {
            info.responseText = jsonValue.asString(runtime).utf8(runtime);
            LOGI("NetworkInfoCollector: Collected response (json): length=%zu / 응답 수집됨 (json): 길이=%zu", info.responseText.length());
          }
        }
      }
      // Case 3: responseType is 'blob' - response is a Blob object, use internal _response / 케이스 3: responseType이 'blob' - response는 Blob 객체, 내부 _response 사용
      else if (responseType == "blob") {
        if (responseValue.isObject()) {
          // For blob, access internal _response property which contains the raw string / blob의 경우 원시 문자열을 포함하는 내부 _response 속성에 접근
          facebook::jsi::Value internalResponseValue = xhrObj.getProperty(runtime, "_response");
          if (internalResponseValue.isString()) {
            info.responseText = internalResponseValue.asString(runtime).utf8(runtime);
            LOGI("NetworkInfoCollector: Collected response (blob): length=%zu / 응답 수집됨 (blob): 길이=%zu", info.responseText.length());
          }
        }
      }
      // Case 4: responseType is 'arraybuffer' - use internal _response / 케이스 4: responseType이 'arraybuffer' - 내부 _response 사용
      else if (responseType == "arraybuffer") {
        // For arraybuffer, access internal _response property / arraybuffer의 경우 내부 _response 속성에 접근
        facebook::jsi::Value internalResponseValue = xhrObj.getProperty(runtime, "_response");
        if (internalResponseValue.isString()) {
          info.responseText = internalResponseValue.asString(runtime).utf8(runtime);
          LOGI("NetworkInfoCollector: Collected response (arraybuffer): length=%zu / 응답 수집됨 (arraybuffer): 길이=%zu", info.responseText.length());
        }
      }
      // Case 5: Unknown responseType - try to handle as string or object / 케이스 5: 알 수 없는 responseType - 문자열 또는 객체로 처리 시도
      else {
        if (responseValue.isString()) {
          info.responseText = responseValue.asString(runtime).utf8(runtime);
          LOGI("NetworkInfoCollector: Collected response (unknown type, as string): length=%zu / 응답 수집됨 (알 수 없는 타입, 문자열로): 길이=%zu", info.responseText.length());
        } else if (responseValue.isObject()) {
          // Try to stringify if it's an object / 객체인 경우 문자열화 시도
          try {
            facebook::jsi::Value jsonValue = runtime.global().getPropertyAsObject(runtime, "JSON")
              .getPropertyAsFunction(runtime, "stringify")
              .call(runtime, responseValue);
            if (jsonValue.isString()) {
              info.responseText = jsonValue.asString(runtime).utf8(runtime);
              LOGI("NetworkInfoCollector: Collected response (unknown type, stringified): length=%zu / 응답 수집됨 (알 수 없는 타입, 문자열화): 길이=%zu", info.responseText.length());
            }
          } catch (...) {
            LOGW("NetworkInfoCollector: Failed to stringify response for unknown responseType: %s / 알 수 없는 responseType에 대해 응답 문자열화 실패: %s", responseType.c_str());
          }
        }
      }
    } catch (const std::exception& e) {
      LOGE("NetworkInfoCollector: Exception while getting 'response' property: %s / 'response' 속성 가져오기 중 예외: %s", e.what());
    } catch (...) {
      LOGE("NetworkInfoCollector: Unknown exception while getting 'response' property / 'response' 속성 가져오기 중 알 수 없는 예외");
    }

    // Get headers / 헤더 가져오기
    std::string allHeaders;
    try {
      facebook::jsi::Value getAllResponseHeadersValue = xhrObj.getProperty(runtime, "getAllResponseHeaders");
      if (getAllResponseHeadersValue.isObject() && getAllResponseHeadersValue.asObject(runtime).isFunction(runtime)) {
        facebook::jsi::Function getAllResponseHeaders = getAllResponseHeadersValue.asObject(runtime).asFunction(runtime);
        facebook::jsi::Value headersValue = getAllResponseHeaders.callWithThis(runtime, xhrObj);
        if (headersValue.isString()) {
          allHeaders = headersValue.asString(runtime).utf8(runtime);
          // Log headers collection in collectXHRResponseInfo / collectXHRResponseInfo에서 헤더 수집 로그
          LOGI("collectXHRResponseInfo: Headers collected, length=%zu", allHeaders.length());
          if (!allHeaders.empty()) {
            LOGI("collectXHRResponseInfo: Headers (first 200 chars): %s", allHeaders.substr(0, 200).c_str());
          } else {
            LOGW("collectXHRResponseInfo: Headers string is empty");
          }
        } else {
          LOGW("collectXHRResponseInfo: getAllResponseHeaders returned non-string");
        }
      } else {
        LOGW("collectXHRResponseInfo: getAllResponseHeaders is not a function");
      }
    } catch (const std::exception& e) {
      LOGE("collectXHRResponseInfo: Exception while getting headers: %s", e.what());
    } catch (...) {
      LOGE("collectXHRResponseInfo: Unknown exception while getting headers");
    }
    info.headers = formatResponseHeaders(allHeaders);

    // Get content type / Content-Type 가져오기
    facebook::jsi::Value getResponseHeaderValue = xhrObj.getProperty(runtime, "getResponseHeader");
    if (getResponseHeaderValue.isObject() && getResponseHeaderValue.asObject(runtime).isFunction(runtime)) {
      facebook::jsi::Function getResponseHeader = getResponseHeaderValue.asObject(runtime).asFunction(runtime);
      facebook::jsi::Value contentTypeValue = getResponseHeader.call(runtime, facebook::jsi::String::createFromUtf8(runtime, "content-type"));
      if (contentTypeValue.isString()) {
        info.contentType = contentTypeValue.asString(runtime).utf8(runtime);
      }
    }
  } catch (...) {
    // Failed to get response properties / 응답 속성 가져오기 실패
  }

  return info;
}

// Collect fetch request info from arguments / 인자에서 fetch 요청 정보 수집
RequestInfo collectFetchRequestInfo(facebook::jsi::Runtime& runtime,
                                    const facebook::jsi::Value* args,
                                    size_t count) {
  RequestInfo info;
  info.method = "GET";
  info.url = "";
  info.headers = getDefaultHeaders(runtime);
  info.postData = "";

  // Parse input / input 파싱
  if (count > 0 && args[0].isString()) {
    info.url = args[0].asString(runtime).utf8(runtime);
  } else if (count > 0 && args[0].isObject()) {
    facebook::jsi::Object requestObj = args[0].asObject(runtime);
    facebook::jsi::Value urlValue = requestObj.getProperty(runtime, "url");
    if (urlValue.isString()) {
      info.url = urlValue.asString(runtime).utf8(runtime);
    }
    facebook::jsi::Value methodValue = requestObj.getProperty(runtime, "method");
    if (methodValue.isString()) {
      info.method = methodValue.asString(runtime).utf8(runtime);
    }
    facebook::jsi::Value headersValue = requestObj.getProperty(runtime, "headers");
    if (headersValue.isObject()) {
      facebook::jsi::Object headersObj = headersValue.asObject(runtime);
      facebook::jsi::Array propNames = headersObj.getPropertyNames(runtime);
      for (size_t i = 0; i < propNames.size(runtime); i++) {
        facebook::jsi::Value keyValue = propNames.getValueAtIndex(runtime, i);
        if (keyValue.isString()) {
          std::string key = keyValue.asString(runtime).utf8(runtime);
          facebook::jsi::Value valueValue = headersObj.getProperty(runtime, key.c_str());
          if (valueValue.isString()) {
            info.headers[key] = valueValue.asString(runtime).utf8(runtime);
          }
        }
      }
    }
  }

  // Parse init / init 파싱
  if (count > 1 && args[1].isObject()) {
    facebook::jsi::Object initObj = args[1].asObject(runtime);
    facebook::jsi::Value methodValue = initObj.getProperty(runtime, "method");
    if (methodValue.isString()) {
      info.method = methodValue.asString(runtime).utf8(runtime);
    }
    facebook::jsi::Value headersValue = initObj.getProperty(runtime, "headers");
    if (headersValue.isObject()) {
      facebook::jsi::Object headersObj = headersValue.asObject(runtime);
      facebook::jsi::Array propNames = headersObj.getPropertyNames(runtime);
      for (size_t i = 0; i < propNames.size(runtime); i++) {
        facebook::jsi::Value keyValue = propNames.getValueAtIndex(runtime, i);
        if (keyValue.isString()) {
          std::string key = keyValue.asString(runtime).utf8(runtime);
          facebook::jsi::Value valueValue = headersObj.getProperty(runtime, key.c_str());
          if (valueValue.isString()) {
            info.headers[key] = valueValue.asString(runtime).utf8(runtime);
          }
        }
      }
    }
    facebook::jsi::Value bodyValue = initObj.getProperty(runtime, "body");
    if (!bodyValue.isUndefined() && !bodyValue.isNull()) {
      if (bodyValue.isString()) {
        info.postData = bodyValue.asString(runtime).utf8(runtime);
      } else {
        try {
          facebook::jsi::Value jsonValue = runtime.global().getPropertyAsObject(runtime, "JSON")
            .getPropertyAsFunction(runtime, "stringify")
            .call(runtime, bodyValue);
          if (jsonValue.isString()) {
            info.postData = jsonValue.asString(runtime).utf8(runtime);
          }
        } catch (...) {
          // Stringify failed / 문자열화 실패
        }
      }
    }
  }

  return info;
}

// Collect fetch response info / fetch 응답 정보 수집
ResponseInfo collectFetchResponseInfo(facebook::jsi::Runtime& runtime,
                                      facebook::jsi::Object& response) {
  ResponseInfo info;
  info.status = 0;
  info.statusText = "";
  info.responseText = "";
  info.contentType = "";
  info.headers = folly::dynamic::object;

  try {
    facebook::jsi::Value statusValue = response.getProperty(runtime, "status");
    if (statusValue.isNumber()) {
      info.status = static_cast<int>(statusValue.asNumber());
    }
    facebook::jsi::Value statusTextValue = response.getProperty(runtime, "statusText");
    if (statusTextValue.isString()) {
      info.statusText = statusTextValue.asString(runtime).utf8(runtime);
    }
    facebook::jsi::Value headersValue = response.getProperty(runtime, "headers");
    if (headersValue.isObject()) {
      facebook::jsi::Object headersObj = headersValue.asObject(runtime);
      facebook::jsi::Value getValue = headersObj.getProperty(runtime, "get");
      if (getValue.isObject() && getValue.asObject(runtime).isFunction(runtime)) {
        facebook::jsi::Function get = getValue.asObject(runtime).asFunction(runtime);
        facebook::jsi::Value contentTypeValue = get.call(runtime, facebook::jsi::String::createFromUtf8(runtime, "content-type"));
        if (contentTypeValue.isString()) {
          info.contentType = contentTypeValue.asString(runtime).utf8(runtime);
        }
        // Note: forEach callback would need to be implemented for all headers / 참고: 모든 헤더를 위해 forEach 콜백 구현 필요
      }
    }
  } catch (...) {
    // Failed to get response properties / 응답 속성 가져오기 실패
  }

  return info;
}

} // namespace network
} // namespace chrome_remote_devtools

