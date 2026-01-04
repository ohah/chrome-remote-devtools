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
#include "NetworkTypes.h"

namespace chrome_remote_devtools {
namespace network {

// Send CDP network event / CDP 네트워크 이벤트 전송
void sendCDPNetworkEvent(facebook::jsi::Runtime& runtime, const folly::dynamic& event);

// Send requestWillBeSent event / requestWillBeSent 이벤트 전송
void sendRequestWillBeSent(facebook::jsi::Runtime& runtime,
                           const std::string& requestId,
                           const RequestInfo& requestInfo,
                           const std::string& type);

// Send responseReceived event / responseReceived 이벤트 전송
void sendResponseReceived(facebook::jsi::Runtime& runtime,
                         const std::string& requestId,
                         const std::string& url,
                         const ResponseInfo& responseInfo,
                         const std::string& type);

// Send loadingFinished event / loadingFinished 이벤트 전송
void sendLoadingFinished(facebook::jsi::Runtime& runtime,
                         const std::string& requestId,
                         const std::string& responseText);

// Send loadingFailed event / loadingFailed 이벤트 전송
void sendLoadingFailed(facebook::jsi::Runtime& runtime,
                       const std::string& requestId,
                       const std::string& errorText,
                       const std::string& type);

} // namespace network
} // namespace chrome_remote_devtools

