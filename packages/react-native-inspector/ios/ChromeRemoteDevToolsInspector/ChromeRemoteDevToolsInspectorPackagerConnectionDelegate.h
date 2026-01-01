/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Modified for Chrome Remote DevTools / Chrome Remote DevTools용으로 수정됨
 */

#import <React/RCTDefines.h>

#if RCT_DEV || RCT_REMOTE_PROFILE

#import "ChromeRemoteDevToolsInspectorWebSocketAdapter.h"

#import <jsinspector-modern/InspectorPackagerConnection.h>

#import <chrono>
#import <memory>
#import <string>

namespace facebook::react::jsinspector_modern {
/**
 * Glue between C++ and Objective-C for InspectorPackagerConnectionDelegate.
 * InspectorPackagerConnectionDelegate를 위한 C++와 Objective-C 간의 접착제
 */
class ChromeRemoteDevToolsInspectorPackagerConnectionDelegate : public InspectorPackagerConnectionDelegate {
  class WebSocket : public IWebSocket {
   public:
    WebSocket(ChromeRemoteDevToolsInspectorWebSocketAdapter *adapter);
    virtual void send(std::string_view message) override;
    virtual ~WebSocket() override;

    // Get adapter for direct access / 직접 접근을 위한 어댑터 가져오기
    ChromeRemoteDevToolsInspectorWebSocketAdapter *getAdapter() const { return _adapter; }

   private:
    ChromeRemoteDevToolsInspectorWebSocketAdapter *const _adapter;
  };

 public:
  virtual std::unique_ptr<IWebSocket> connectWebSocket(
      const std::string &url,
      std::weak_ptr<IWebSocketDelegate> delegate) override;

  virtual void scheduleCallback(std::function<void(void)> callback, std::chrono::milliseconds delayMs) override;

  // Store WebSocket adapter for direct CDP message sending / 직접 CDP 메시지 전송을 위한 WebSocket 어댑터 저장
  void setWebSocketAdapter(ChromeRemoteDevToolsInspectorWebSocketAdapter *adapter) { _webSocketAdapter = adapter; }
  ChromeRemoteDevToolsInspectorWebSocketAdapter *getWebSocketAdapter() const { return _webSocketAdapter; }

 private:
  ChromeRemoteDevToolsInspectorWebSocketAdapter *_webSocketAdapter = nullptr;
};
} // namespace facebook::react::jsinspector_modern

#endif

