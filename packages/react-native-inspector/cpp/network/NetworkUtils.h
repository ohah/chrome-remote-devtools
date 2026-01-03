/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Modified for Chrome Remote DevTools / Chrome Remote DevTools용으로 수정됨
 */

#pragma once

#include <jsi/jsi.h>
#include <string>
#include <folly/dynamic.h>

namespace chrome_remote_devtools {
namespace network {

// Get timestamp in seconds / 초 단위 타임스탬프 가져오기
double getTimestamp();

// Get server host and port from global / 전역에서 서버 호스트와 포트 가져오기
void getServerInfo(facebook::jsi::Runtime& runtime, std::string& serverHost, int& serverPort);

// Get default headers / 기본 헤더 가져오기
folly::dynamic getDefaultHeaders(facebook::jsi::Runtime& runtime);

// Format response headers / 응답 헤더 포맷팅
folly::dynamic formatResponseHeaders(const std::string& headerString);

// Calculate encoded data length / 인코딩된 데이터 길이 계산
size_t calculateEncodedDataLength(const std::string& contentLength, const std::string& body);

} // namespace network
} // namespace chrome_remote_devtools

