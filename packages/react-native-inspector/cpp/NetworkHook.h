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

namespace chrome_remote_devtools {

/**
 * Hook network methods (XMLHttpRequest and fetch) in JSI runtime / JSI 런타임에서 네트워크 메서드 (XMLHttpRequest 및 fetch) 훅
 * @param runtime JSI runtime instance / JSI 런타임 인스턴스
 * @return true if hooking succeeded / 훅이 성공하면 true
 */
bool hookNetworkMethods(facebook::jsi::Runtime& runtime);

/**
 * Get network response body by request ID / 요청 ID로 네트워크 응답 본문 가져오기
 * @param requestId Network request ID / 네트워크 요청 ID
 * @return Response body as string, or empty string if not found / 응답 본문 문자열, 없으면 빈 문자열
 */
std::string getNetworkResponseBody(const std::string& requestId);

} // namespace chrome_remote_devtools

