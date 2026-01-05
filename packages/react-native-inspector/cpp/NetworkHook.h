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
 * Hook network methods (XMLHttpRequest) in JSI runtime / JSI 런타임에서 네트워크 메서드 (XMLHttpRequest) 훅
 * Note: React Native internally wraps fetch with XMLHttpRequest, so XHR hook handles both fetch and XHR requests / 참고: React Native는 내부적으로 fetch를 XMLHttpRequest로 래핑하므로 XHR 훅이 fetch와 XHR 요청을 모두 처리함
 * @param runtime JSI runtime instance / JSI 런타임 인스턴스
 * @return true if hooking succeeded / 훅이 성공하면 true
 */
bool hookNetworkMethods(facebook::jsi::Runtime& runtime);

/**
 * Enable network hook / 네트워크 훅 활성화
 * @param runtime JSI runtime instance / JSI 런타임 인스턴스
 * @return true if enabling succeeded / 활성화가 성공하면 true
 */
bool enableNetworkHook(facebook::jsi::Runtime& runtime);

/**
 * Disable network hook / 네트워크 훅 비활성화
 * @param runtime JSI runtime instance / JSI 런타임 인스턴스
 * @return true if disabling succeeded / 비활성화가 성공하면 true
 */
bool disableNetworkHook(facebook::jsi::Runtime& runtime);

/**
 * Check if network hook is enabled / 네트워크 훅이 활성화되어 있는지 확인
 * @return true if network hook is enabled / 네트워크 훅이 활성화되어 있으면 true
 */
bool isNetworkHookEnabled();

/**
 * Check if network hook is enabled by checking runtime state / 런타임 상태를 확인하여 네트워크 훅이 활성화되어 있는지 확인
 * @param runtime JSI runtime instance / JSI 런타임 인스턴스
 * @return true if network hook is enabled / 네트워크 훅이 활성화되어 있으면 true
 */
bool isNetworkHookEnabled(facebook::jsi::Runtime& runtime);

/**
 * Get network response body by request ID / 요청 ID로 네트워크 응답 본문 가져오기
 * @param requestId Network request ID / 네트워크 요청 ID
 * @return Response body as string, or empty string if not found / 응답 본문 문자열, 없으면 빈 문자열
 */
std::string getNetworkResponseBody(const std::string& requestId);

} // namespace chrome_remote_devtools

