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

    // Try to get responseText first / 먼저 responseText 시도
    // Note: responseText may throw if responseType is not '' or 'text' / 참고: responseType이 '' 또는 'text'가 아니면 responseText가 에러를 던질 수 있음
    try {
      facebook::jsi::Value responseTextValue = xhrObj.getProperty(runtime, "responseText");
      if (responseTextValue.isString()) {
        info.responseText = responseTextValue.asString(runtime).utf8(runtime);
      }
    } catch (...) {
      // responseText failed, try response instead / responseText 실패, 대신 response 시도
      try {
        facebook::jsi::Value responseValue = xhrObj.getProperty(runtime, "response");
        if (responseValue.isString()) {
          info.responseText = responseValue.asString(runtime).utf8(runtime);
        } else if (responseValue.isObject()) {
          // Try to stringify if it's an object / 객체인 경우 문자열화 시도
          facebook::jsi::Value jsonValue = runtime.global().getPropertyAsObject(runtime, "JSON")
            .getPropertyAsFunction(runtime, "stringify")
            .call(runtime, responseValue);
          if (jsonValue.isString()) {
            info.responseText = jsonValue.asString(runtime).utf8(runtime);
          }
        }
      } catch (...) {
        // Failed to get response / response 가져오기 실패
      }
    }

    // Get headers / 헤더 가져오기
    std::string allHeaders;
    facebook::jsi::Value getAllResponseHeadersValue = xhrObj.getProperty(runtime, "getAllResponseHeaders");
    if (getAllResponseHeadersValue.isObject() && getAllResponseHeadersValue.asObject(runtime).isFunction(runtime)) {
      facebook::jsi::Function getAllResponseHeaders = getAllResponseHeadersValue.asObject(runtime).asFunction(runtime);
      facebook::jsi::Value headersValue = getAllResponseHeaders.call(runtime);
      if (headersValue.isString()) {
        allHeaders = headersValue.asString(runtime).utf8(runtime);
      }
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

