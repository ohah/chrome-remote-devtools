/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Modified for Chrome Remote DevTools / Chrome Remote DevTools용으로 수정됨
 */

#include "NetworkUtils.h"
#include <chrono>
#include <sstream>
#include <string>

// Platform-specific log support / 플랫폼별 로그 지원
#ifdef __ANDROID__
#include <android/log.h>
#define LOG_TAG "NetworkUtils"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)
#define LOGW(...) __android_log_print(ANDROID_LOG_WARN, LOG_TAG, __VA_ARGS__)
#elif defined(__APPLE__)
#define LOG_TAG "NetworkUtils"
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

// Get timestamp in seconds / 초 단위 타임스탬프 가져오기
double getTimestamp() {
  return std::chrono::duration_cast<std::chrono::milliseconds>(
    std::chrono::system_clock::now().time_since_epoch()
  ).count() / 1000.0;
}

// Get server host and port from global / 전역에서 서버 호스트와 포트 가져오기
void getServerInfo(facebook::jsi::Runtime& runtime, std::string& serverHost, int& serverPort) {
  serverHost = "localhost";
  serverPort = 8080;
  try {
    facebook::jsi::Value hostValue = runtime.global().getProperty(runtime, "__ChromeRemoteDevToolsServerHost");
    if (hostValue.isString()) {
      serverHost = hostValue.asString(runtime).utf8(runtime);
    }
    facebook::jsi::Value portValue = runtime.global().getProperty(runtime, "__ChromeRemoteDevToolsServerPort");
    if (portValue.isNumber()) {
      serverPort = static_cast<int>(portValue.asNumber());
    }
  } catch (...) {
    // Use defaults / 기본값 사용
  }
}

// Get default headers / 기본 헤더 가져오기
folly::dynamic getDefaultHeaders(facebook::jsi::Runtime& runtime) {
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
folly::dynamic formatResponseHeaders(const std::string& headerString) {
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
size_t calculateEncodedDataLength(const std::string& contentLength, const std::string& body) {
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

} // namespace network
} // namespace chrome_remote_devtools

