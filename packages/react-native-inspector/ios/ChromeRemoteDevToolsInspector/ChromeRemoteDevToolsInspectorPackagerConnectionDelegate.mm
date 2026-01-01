/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Modified for Chrome Remote DevTools / Chrome Remote DevTools용으로 수정됨
 */

#import "ChromeRemoteDevToolsInspectorPackagerConnectionDelegate.h"

#if RCT_DEV || RCT_REMOTE_PROFILE

#import <React/RCTLog.h>
#import <dispatch/dispatch.h>

namespace facebook::react::jsinspector_modern {
ChromeRemoteDevToolsInspectorPackagerConnectionDelegate::WebSocket::WebSocket(ChromeRemoteDevToolsInspectorWebSocketAdapter *adapter)
    : _adapter(adapter)
{
}

void ChromeRemoteDevToolsInspectorPackagerConnectionDelegate::WebSocket::send(std::string_view message)
{
  [_adapter send:message];
}

ChromeRemoteDevToolsInspectorPackagerConnectionDelegate::WebSocket::~WebSocket()
{
  [_adapter close];
}

std::unique_ptr<IWebSocket> ChromeRemoteDevToolsInspectorPackagerConnectionDelegate::connectWebSocket(
    const std::string &url,
    std::weak_ptr<IWebSocketDelegate> delegate)
{
  auto *adapter = [[ChromeRemoteDevToolsInspectorWebSocketAdapter alloc] initWithURL:url delegate:delegate];
  if (adapter == nullptr) {
    return nullptr;
  }

  // Store adapter for direct CDP message sending / 직접 CDP 메시지 전송을 위한 어댑터 저장
  _webSocketAdapter = adapter;

  return std::make_unique<WebSocket>(adapter);
}

void ChromeRemoteDevToolsInspectorPackagerConnectionDelegate::scheduleCallback(
    std::function<void(void)> callback,
    std::chrono::milliseconds delayMs)
{
  dispatch_after(dispatch_time(DISPATCH_TIME_NOW, delayMs.count() * NSEC_PER_MSEC), dispatch_get_main_queue(), ^{
    callback();
  });
}
} // namespace facebook::react::jsinspector_modern

#endif

