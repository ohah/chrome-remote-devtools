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
#include "NetworkTypes.h"

namespace chrome_remote_devtools {
namespace network {

// Collect XHR request info from metadata / 메타데이터에서 XHR 요청 정보 수집
RequestInfo collectXHRRequestInfo(facebook::jsi::Runtime& runtime,
                                  facebook::jsi::Object& metadata,
                                  const facebook::jsi::Value* args,
                                  size_t count);

// Collect XHR response info / XHR 응답 정보 수집
ResponseInfo collectXHRResponseInfo(facebook::jsi::Runtime& runtime,
                                     facebook::jsi::Object& xhrObj);

// Collect fetch request info from arguments / 인자에서 fetch 요청 정보 수집
RequestInfo collectFetchRequestInfo(facebook::jsi::Runtime& runtime,
                                    const facebook::jsi::Value* args,
                                    size_t count);

// Collect fetch response info / fetch 응답 정보 수집
ResponseInfo collectFetchResponseInfo(facebook::jsi::Runtime& runtime,
                                       facebook::jsi::Object& response);

} // namespace network
} // namespace chrome_remote_devtools

