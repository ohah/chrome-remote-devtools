/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Modified for Chrome Remote DevTools / Chrome Remote DevTools용으로 수정됨
 */

#pragma once

#include <string>
#include <folly/dynamic.h>

namespace chrome_remote_devtools {
namespace network {

// Request info structure / 요청 정보 구조체
struct RequestInfo {
  std::string method;
  std::string url;
  folly::dynamic headers;
  std::string postData;
};

// Response info structure / 응답 정보 구조체
struct ResponseInfo {
  int status;
  std::string statusText;
  std::string responseText;
  folly::dynamic headers;
  std::string contentType;
};

} // namespace network
} // namespace chrome_remote_devtools

