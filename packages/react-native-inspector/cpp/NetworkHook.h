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

} // namespace chrome_remote_devtools

