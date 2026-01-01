/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Modified for Chrome Remote DevTools / Chrome Remote DevTools용으로 수정됨
 */

#import "ChromeRemoteDevToolsInspectorPackagerConnection.h"

#if RCT_DEV || RCT_REMOTE_PROFILE

#import <React/RCTDefines.h>
#import <React/RCTInspector.h>
#import <React/RCTLog.h>
#import <React/RCTUtils.h>
#import <SocketRocket/SRWebSocket.h>
#import <jsinspector-modern/InspectorPackagerConnection.h>

#import <chrono>
#import <memory>

#import "ChromeRemoteDevToolsInspectorPackagerConnectionDelegate.h"
#import "ChromeRemoteDevToolsInspectorWebSocketAdapter.h"
#import "ChromeRemoteDevToolsInspectorUtils.h"

using namespace facebook::react::jsinspector_modern;
@interface ChromeRemoteDevToolsInspectorPackagerConnection () {
  std::unique_ptr<InspectorPackagerConnection> _cxxImpl;
  // Store raw pointer to delegate for accessing WebSocket adapter / WebSocket 어댑터 접근을 위한 delegate의 raw pointer 저장
  // Note: The delegate is owned by _cxxImpl, so we keep a raw pointer for access / 참고: delegate는 _cxxImpl이 소유하므로 접근을 위해 raw pointer 유지
  ChromeRemoteDevToolsInspectorPackagerConnectionDelegate *_delegate;
}
@end

@implementation ChromeRemoteDevToolsInspectorPackagerConnection

RCT_NOT_IMPLEMENTED(-(instancetype)init)

- (instancetype)initWithURL:(NSURL *)url
{
  if (self = [super init]) {
    auto metadata = [ChromeRemoteDevToolsInspectorUtils getHostMetadata];
    // Create unique_ptr for delegate and store raw pointer for access / delegate를 위한 unique_ptr 생성 및 접근을 위한 raw pointer 저장
    auto delegate = std::make_unique<ChromeRemoteDevToolsInspectorPackagerConnectionDelegate>();
    _delegate = delegate.get(); // Store raw pointer before moving / 이동하기 전에 raw pointer 저장
    _cxxImpl = std::make_unique<InspectorPackagerConnection>(
        [url absoluteString].UTF8String,
        metadata.deviceName.UTF8String,
        [[NSBundle mainBundle] bundleIdentifier].UTF8String,
        std::move(delegate)); // Move unique_ptr to InspectorPackagerConnection / unique_ptr를 InspectorPackagerConnection으로 이동
    // Note: WebSocket adapter will be stored in delegate when WebSocket connects / 참고: WebSocket 어댑터는 WebSocket 연결 시 delegate에 저장됨
  }
  return self;
}

- (void)sendEventToAllConnections:(NSString *)event
{
  _cxxImpl->sendEventToAllConnections(event.UTF8String);
}

- (bool)isConnected
{
  return _cxxImpl->isConnected();
}

- (void)connect
{
  _cxxImpl->connect();

  // Send Runtime.executionContextCreated after a short delay to ensure WebSocket is connected / WebSocket이 연결되었는지 확인하기 위해 짧은 지연 후 Runtime.executionContextCreated 전송
  // This allows DevTools to register the execution context before console messages arrive / 이를 통해 DevTools가 콘솔 메시지가 도착하기 전에 execution context를 등록할 수 있음
  dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.1 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
    if ([self isConnected]) {
      [self sendExecutionContextCreated];
    }
  });
}

- (void)closeQuietly
{
  _cxxImpl->closeQuietly();
}

- (void)sendCDPMessage:(NSString *)message
{
  // Get WebSocket adapter from delegate / delegate에서 WebSocket 어댑터 가져오기
  if (_delegate) {
    ChromeRemoteDevToolsInspectorWebSocketAdapter *adapter = _delegate->getWebSocketAdapter();
    if (adapter) {
      // Send CDP message directly through WebSocket adapter / WebSocket 어댑터를 통해 CDP 메시지 직접 전송
      std::string messageStr = [message UTF8String];
      [adapter send:std::string_view(messageStr)];
      return;
    }
  }

  // Fallback: use sendEventToAllConnections (may not work for CDP) / 폴백: sendEventToAllConnections 사용 (CDP에 작동하지 않을 수 있음)
  [self sendEventToAllConnections:message];
}

- (void)sendExecutionContextCreated
{
  // Create execution context for React Native / React Native용 execution context 생성
  NSDictionary *executionContext = @{
    @"id": @1,
    @"origin": @"react-native://",
    @"name": @"React Native",
    @"auxData": @{
      @"isDefault": @YES
    }
  };

  NSDictionary *cdpMessage = @{
    @"method": @"Runtime.executionContextCreated",
    @"params": @{
      @"context": executionContext
    }
  };

  NSError *error = nil;
  NSData *jsonData = [NSJSONSerialization dataWithJSONObject:cdpMessage options:0 error:&error];
  if (jsonData && !error) {
    NSString *jsonString = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
    [self sendCDPMessage:jsonString];
  }
}

@end

#endif

