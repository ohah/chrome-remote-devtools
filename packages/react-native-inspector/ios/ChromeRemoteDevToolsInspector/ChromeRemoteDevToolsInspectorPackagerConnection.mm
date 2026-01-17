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
#import <cmath>

#import "ChromeRemoteDevToolsInspectorPackagerConnectionDelegate.h"
#import "ChromeRemoteDevToolsInspectorWebSocketAdapter.h"
#import "ChromeRemoteDevToolsInspectorUtils.h"

using namespace facebook::react::jsinspector_modern;

// Reconnection constants / 재연결 상수
static const NSInteger MAX_RECONNECT_ATTEMPTS = 10; // Maximum reconnection attempts / 최대 재연결 시도 횟수
static const NSTimeInterval INITIAL_RECONNECT_DELAY = 1.0; // Initial delay: 1 second / 초기 지연: 1초
static const NSTimeInterval MAX_RECONNECT_DELAY = 30.0; // Maximum delay: 30 seconds / 최대 지연: 30초

@interface ChromeRemoteDevToolsInspectorPackagerConnection () {
  std::unique_ptr<InspectorPackagerConnection> _cxxImpl;
  // Store raw pointer to delegate for accessing WebSocket adapter / WebSocket 어댑터 접근을 위한 delegate의 raw pointer 저장
  // Note: The delegate is owned by _cxxImpl, so we keep a raw pointer for access / 참고: delegate는 _cxxImpl이 소유하므로 접근을 위해 raw pointer 유지
  ChromeRemoteDevToolsInspectorPackagerConnectionDelegate *_delegate;
  NSURL *_url; // Store URL for reconnection / 재연결을 위해 URL 저장
  NSInteger _reconnectAttempts; // Reconnection attempt counter / 재연결 시도 카운터
  NSTimer *_reconnectTimer; // Reconnection timer / 재연결 타이머
  BOOL _isReconnecting; // Flag to prevent multiple simultaneous reconnection attempts / 동시 재연결 시도를 방지하는 플래그
  BOOL _shouldReconnect; // Flag to control reconnection / 재연결을 제어하는 플래그
}

@end

@implementation ChromeRemoteDevToolsInspectorPackagerConnection

RCT_NOT_IMPLEMENTED(-(instancetype)init)

- (instancetype)initWithURL:(NSURL *)url
{
  if (self = [super init]) {
    _url = url; // Store URL for reconnection / 재연결을 위해 URL 저장
    _reconnectAttempts = 0;
    _isReconnecting = NO;
    _shouldReconnect = YES; // Enable reconnection by default / 기본적으로 재연결 활성화
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

    // Register for WebSocket notifications / WebSocket 알림 등록
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(handleWebSocketDidOpen:)
                                                 name:@"ChromeRemoteDevToolsWebSocketDidOpen"
                                               object:nil];
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(handleWebSocketDidFail:)
                                                 name:@"ChromeRemoteDevToolsWebSocketDidFail"
                                               object:nil];
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(handleWebSocketDidClose:)
                                                 name:@"ChromeRemoteDevToolsWebSocketDidClose"
                                               object:nil];
  }
  return self;
}

- (void)dealloc
{
  // Unregister from notifications / 알림 등록 해제
  [[NSNotificationCenter defaultCenter] removeObserver:self];
  [self cancelReconnect];
}

- (void)handleWebSocketDidOpen:(NSNotification *)notification
{
  // Reset reconnect attempts on successful connection / 성공적인 연결 시 재연결 시도 횟수 초기화
  _reconnectAttempts = 0;
  _isReconnecting = NO;
  [self cancelReconnect];
}

- (void)handleWebSocketDidFail:(NSNotification *)notification
{
  // Schedule reconnection if enabled / 재연결이 활성화된 경우 재연결 예약
  if (_shouldReconnect) {
    [self scheduleReconnect];
  }
}

- (void)handleWebSocketDidClose:(NSNotification *)notification
{
  NSDictionary *userInfo = notification.userInfo;
  NSNumber *code = userInfo[@"code"];
  // Don't reconnect if code is 1000 (normal closure) / 코드가 1000(정상 종료)이면 재연결하지 않음
  if (code && [code integerValue] != 1000 && _shouldReconnect) {
    [self scheduleReconnect];
  }
}

- (void)sendEventToAllConnections:(NSString *)event
{
  _cxxImpl->sendEventToAllConnections(event.UTF8String);
}

- (bool)isConnected
{
  return _cxxImpl->isConnected();
}

- (void)scheduleReconnect
{
  if (_isReconnecting || !_shouldReconnect) {
    return;
  }

  if (_reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    RCTLogWarn(@"[ChromeRemoteDevTools] Max reconnection attempts reached, stopping reconnection / 최대 재연결 시도 횟수에 도달, 재연결 중지");
    _isReconnecting = NO;
    return;
  }

  _isReconnecting = YES;
  // Calculate delay with exponential backoff / 지수 백오프로 지연 시간 계산
  NSTimeInterval delay = MIN(
    INITIAL_RECONNECT_DELAY * std::pow(2.0, _reconnectAttempts), // Exponential backoff / 지수 백오프
    MAX_RECONNECT_DELAY // Cap at maximum delay / 최대 지연 시간으로 제한
  );

  RCTLogInfo(@"[ChromeRemoteDevTools] Scheduling reconnection attempt %ld/%ld in %.1fs / 재연결 시도 %ld/%ld를 %.1fs 후에 예약",
             (long)(_reconnectAttempts + 1), (long)MAX_RECONNECT_ATTEMPTS, delay);

  __weak ChromeRemoteDevToolsInspectorPackagerConnection *weakSelf = self;
  _reconnectTimer = [NSTimer scheduledTimerWithTimeInterval:delay
                                                      repeats:NO
                                                        block:^(NSTimer *timer) {
    __strong ChromeRemoteDevToolsInspectorPackagerConnection *strongSelf = weakSelf;
    if (strongSelf && !strongSelf.isConnected && strongSelf->_shouldReconnect) {
      RCTLogInfo(@"[ChromeRemoteDevTools] Attempting reconnection %ld/%ld / 재연결 시도 %ld/%ld",
                 (long)(strongSelf->_reconnectAttempts + 1), (long)MAX_RECONNECT_ATTEMPTS);
      strongSelf->_reconnectAttempts++;
      strongSelf->_isReconnecting = NO;
      [strongSelf connect]; // Retry connection / 연결 재시도
    } else {
      RCTLogInfo(@"[ChromeRemoteDevTools] Skipping reconnection (isConnected=%d, shouldReconnect=%d) / 재연결 건너뜀 (isConnected=%d, shouldReconnect=%d)",
                 strongSelf.isConnected, strongSelf->_shouldReconnect);
      strongSelf->_isReconnecting = NO;
    }
    strongSelf->_reconnectTimer = nil;
  }];
}

- (void)cancelReconnect
{
  if (_reconnectTimer) {
    [_reconnectTimer invalidate];
    _reconnectTimer = nil;
  }
  _isReconnecting = NO;
}

- (void)connect
{
  // Cancel any pending reconnection attempts / 대기 중인 재연결 시도 취소
  [self cancelReconnect];

  _cxxImpl->connect();

  // Send Runtime.executionContextCreated after a short delay to ensure WebSocket is connected / WebSocket이 연결되었는지 확인하기 위해 짧은 지연 후 Runtime.executionContextCreated 전송
  // This allows DevTools to register the execution context before console messages arrive / 이를 통해 DevTools가 콘솔 메시지가 도착하기 전에 execution context를 등록할 수 있음
  dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.1 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
    if ([self isConnected]) {
      _reconnectAttempts = 0; // Reset reconnect attempts on successful connection / 성공적인 연결 시 재연결 시도 횟수 초기화
      [self sendExecutionContextCreated];
    }
  });
}

- (void)enableReconnection
{
  _shouldReconnect = YES;
  RCTLogInfo(@"[ChromeRemoteDevTools] Reconnection enabled / 재연결 활성화됨");
}

- (void)disableReconnection
{
  _shouldReconnect = NO;
  [self cancelReconnect];
  RCTLogInfo(@"[ChromeRemoteDevTools] Reconnection disabled / 재연결 비활성화됨");
}

- (void)reconnect
{
  if ([self isConnected]) {
    RCTLogInfo(@"[ChromeRemoteDevTools] Already connected, no need to reconnect / 이미 연결되어 있어 재연결 불필요");
    return;
  }
  _reconnectAttempts = 0; // Reset attempts for manual reconnection / 수동 재연결을 위해 시도 횟수 초기화
  [self cancelReconnect];
  [self connect];
}

- (void)closeQuietly
{
  _shouldReconnect = NO; // Disable reconnection when closing quietly / 조용히 종료할 때 재연결 비활성화
  [self cancelReconnect]; // Cancel any pending reconnection attempts / 대기 중인 재연결 시도 취소
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

