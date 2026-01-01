/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Modified for Chrome Remote DevTools / Chrome Remote DevTools용으로 수정됨
 */

#import "ChromeRemoteDevToolsInspectorWebSocketAdapter.h"

#if RCT_DEV || RCT_REMOTE_PROFILE

#import <React/RCTInspector.h>
#import <React/RCTInspectorPackagerConnection.h>
#import <React/RCTLog.h>
#import <React/RCTUtils.h>
#import <SocketRocket/SRWebSocket.h>
#import <jsinspector-modern/InspectorPackagerConnection.h>
#import <memory>

using namespace facebook::react::jsinspector_modern;

namespace {
NSString *NSStringFromUTF8StringView(std::string_view view)
{
  return [[NSString alloc] initWithBytes:(const char *)view.data() length:view.size() encoding:NSUTF8StringEncoding];
}
} // namespace
@interface ChromeRemoteDevToolsInspectorWebSocketAdapter () <SRWebSocketDelegate> {
  std::weak_ptr<IWebSocketDelegate> _delegate;
  SRWebSocket *_webSocket;
}
@end

@implementation ChromeRemoteDevToolsInspectorWebSocketAdapter
- (instancetype)initWithURL:(const std::string &)url delegate:(std::weak_ptr<IWebSocketDelegate>)delegate
{
  if ((self = [super init]) != nullptr) {
    _delegate = delegate;
    _webSocket = [[SRWebSocket alloc] initWithURL:[NSURL URLWithString:NSStringFromUTF8StringView(url)]];
    _webSocket.delegate = self;
    [_webSocket open];
  }
  return self;
}

- (void)send:(std::string_view)message
{
  __weak ChromeRemoteDevToolsInspectorWebSocketAdapter *weakSelf = self;
  NSString *messageStr = NSStringFromUTF8StringView(message);
  if (messageStr == nil) {
    RCTLogError(@"Failed to convert CDP message string to NSString, message will be dropped!");
  }
  dispatch_async(dispatch_get_main_queue(), ^{
    ChromeRemoteDevToolsInspectorWebSocketAdapter *strongSelf = weakSelf;
    if (strongSelf != nullptr) {
      [strongSelf->_webSocket sendString:messageStr error:NULL];
    }
  });
}

- (void)close
{
  [_webSocket closeWithCode:1000 reason:@"End of session"];
}

- (void)webSocketDidOpen:(__unused SRWebSocket *)webSocket
{
  // NOTE: We are on the main queue here, per SRWebSocket's defaults.
  if (auto delegate = _delegate.lock()) {
    delegate->didOpen();
  }

  // Send Runtime.executionContextCreated event after WebSocket opens / WebSocket이 열린 후 Runtime.executionContextCreated 이벤트 전송
  // This allows DevTools to register the execution context before console messages arrive / 이를 통해 DevTools가 콘솔 메시지가 도착하기 전에 execution context를 등록할 수 있음
  // We need to get the connection instance to send the event / 이벤트를 전송하기 위해 connection 인스턴스가 필요함
  // Note: This will be handled by ChromeRemoteDevToolsInspectorPackagerConnection / 참고: 이것은 ChromeRemoteDevToolsInspectorPackagerConnection에서 처리됨
}

- (void)webSocket:(__unused SRWebSocket *)webSocket didFailWithError:(NSError *)error
{
  // NOTE: We are on the main queue here, per SRWebSocket's defaults.
  if (auto delegate = _delegate.lock()) {
    delegate->didFailWithError([error code], [error description].UTF8String);
  }
}

- (void)webSocket:(__unused SRWebSocket *)webSocket didReceiveMessageWithString:(NSString *)message
{
  // NOTE: We are on the main queue here, per SRWebSocket's defaults.
  if (auto delegate = _delegate.lock()) {
    delegate->didReceiveMessage([message UTF8String]);
  }
}

- (void)webSocket:(__unused SRWebSocket *)webSocket
    didCloseWithCode:(__unused NSInteger)code
              reason:(__unused NSString *)reason
            wasClean:(__unused BOOL)wasClean
{
  // NOTE: We are on the main queue here, per SRWebSocket's defaults.
  if (auto delegate = _delegate.lock()) {
    delegate->didClose();
  }
}

@end

#endif

