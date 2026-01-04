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

// Include common C++ network hook / 공통 C++ network 훅 포함
#if __has_include("NetworkHook.h")
#include "NetworkHook.h"
#define NETWORK_HOOK_AVAILABLE
#endif

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

  // Handle CDP requests (messages with id field) / CDP 요청 처리 (id 필드가 있는 메시지)
  // Check if this is Page.getResourceTree request / Page.getResourceTree 요청인지 확인
  NSError *error = nil;
  NSData *jsonData = [message dataUsingEncoding:NSUTF8StringEncoding];
  NSDictionary *messageDict = [NSJSONSerialization JSONObjectWithData:jsonData options:0 error:&error];

  if (!error && messageDict[@"id"] && messageDict[@"method"]) {
    NSString *method = messageDict[@"method"];

    // Handle Page.getResourceTree request / Page.getResourceTree 요청 처리
    if ([method isEqualToString:@"Page.getResourceTree"]) {
      NSNumber *requestId = messageDict[@"id"];
      RCTLogInfo(@"[ChromeRemoteDevTools] Page.getResourceTree detected! / Page.getResourceTree 감지됨!");

      // Create minimal frame tree for React Native / React Native를 위한 최소한의 프레임 트리 생성
      NSDictionary *frame = @{
        @"id": @"1",
        @"mimeType": @"application/javascript",
        @"securityOrigin": @"react-native://",
        @"url": @"react-native://"
      };

      NSDictionary *frameTree = @{
        @"frame": frame,
        @"resources": @[] // Empty resources array / 빈 리소스 배열
      };

      NSDictionary *response = @{
        @"id": requestId,
        @"result": @{
          @"frameTree": frameTree
        }
      };

      NSError *responseError = nil;
      NSData *responseJsonData = [NSJSONSerialization dataWithJSONObject:response options:0 error:&responseError];
      if (!responseError && responseJsonData) {
        NSString *responseStr = [[NSString alloc] initWithData:responseJsonData encoding:NSUTF8StringEncoding];
        if (responseStr) {
          RCTLogInfo(@"[ChromeRemoteDevTools] Sending Page.getResourceTree response / Page.getResourceTree 응답 전송: %@", responseStr);
          [self send:[responseStr UTF8String]];
          return; // Don't forward the original message / 원본 메시지를 전달하지 않음
        }
      }
    }

    // Handle Network.getResponseBody request / Network.getResponseBody 요청 처리
    if ([method isEqualToString:@"Network.getResponseBody"]) {
      NSNumber *requestId = messageDict[@"id"];
      NSDictionary *params = messageDict[@"params"];
      NSString *networkRequestId = params[@"requestId"] ?: @"";
      RCTLogInfo(@"[ChromeRemoteDevTools] Network.getResponseBody detected! / Network.getResponseBody 감지됨: requestId=%@", networkRequestId);

#ifdef NETWORK_HOOK_AVAILABLE
      // Get response body from C++ network hook / C++ network 훅에서 응답 본문 가져오기
      std::string requestIdCpp = [networkRequestId UTF8String];
      std::string responseBody = chrome_remote_devtools::getNetworkResponseBody(requestIdCpp);

      NSString *responseBodyStr = @"";
      BOOL base64Encoded = NO;

      if (!responseBody.empty()) {
        // Try to interpret the response body as UTF-8 text first / 먼저 응답 본문을 UTF-8 텍스트로 해석 시도
        NSString *utf8String = [[NSString alloc] initWithBytes:responseBody.data()
                                                        length:responseBody.size()
                                                      encoding:NSUTF8StringEncoding];
        if (utf8String) {
          responseBodyStr = utf8String;
          RCTLogInfo(@"[ChromeRemoteDevTools] Network response body retrieved / 네트워크 응답 본문 가져옴: requestId=%@, length=%zu", networkRequestId, responseBody.length());
        } else {
          // Fallback: treat as binary and base64-encode / 폴백: 바이너리로 간주하고 base64 인코딩
          NSData *responseData = [NSData dataWithBytes:responseBody.data() length:responseBody.size()];
          responseBodyStr = [responseData base64EncodedStringWithOptions:0];
          base64Encoded = YES;
          RCTLogWarn(@"[ChromeRemoteDevTools] Network response body is not valid UTF-8, using base64-encoded body / 네트워크 응답 본문이 유효한 UTF-8이 아니므로 base64 인코딩된 본문을 사용합니다: requestId=%@", networkRequestId);
        }
      } else {
        RCTLogInfo(@"[ChromeRemoteDevTools] Network response body not found / 네트워크 응답 본문을 찾을 수 없음: requestId=%@", networkRequestId);
      }
#else
      // Network hook not available, return empty body / 네트워크 훅을 사용할 수 없으므로 빈 본문 반환
      NSString *responseBodyStr = @"";
      BOOL base64Encoded = NO;
      RCTLogWarn(@"[ChromeRemoteDevTools] Network hook not available, returning empty body / 네트워크 훅을 사용할 수 없어 빈 본문 반환");
#endif

      NSDictionary *response = @{
        @"id": requestId,
        @"result": @{
          @"body": responseBodyStr,
          @"base64Encoded": @(base64Encoded)
        }
      };

      NSError *responseError = nil;
      NSData *responseJsonData = [NSJSONSerialization dataWithJSONObject:response options:0 error:&responseError];
      if (!responseError && responseJsonData) {
        NSString *responseStr = [[NSString alloc] initWithData:responseJsonData encoding:NSUTF8StringEncoding];
        if (responseStr) {
          RCTLogInfo(@"[ChromeRemoteDevTools] Sending Network.getResponseBody response / Network.getResponseBody 응답 전송: %@", [responseStr substringToIndex:MIN(200, responseStr.length)]);
          [self send:[responseStr UTF8String]];
          return; // Don't forward the original message / 원본 메시지를 전달하지 않음
        } else {
          // Failed to encode response as UTF-8 string / 응답을 UTF-8 문자열로 인코딩 실패
          RCTLogError(@"[ChromeRemoteDevTools] Failed to encode Network.getResponseBody response as UTF-8 string / Network.getResponseBody 응답을 UTF-8 문자열로 인코딩 실패");
        }
      } else {
        // Failed to serialize response / 응답 직렬화 실패
        RCTLogError(@"[ChromeRemoteDevTools] Failed to serialize Network.getResponseBody response: %@ / Network.getResponseBody 응답 직렬화 실패: %@", responseError, response);
      }

      // Send error response if serialization failed / 직렬화 실패 시 오류 응답 전송
      NSDictionary *errorResponse = @{
        @"id": requestId,
        @"error": @{
          @"code": @(-32000),
          @"message": @"Failed to serialize Network.getResponseBody response"
        }
      };
      NSError *errorSerializationError = nil;
      NSData *errorJsonData = [NSJSONSerialization dataWithJSONObject:errorResponse options:0 error:&errorSerializationError];
      if (!errorSerializationError && errorJsonData) {
        NSString *errorStr = [[NSString alloc] initWithData:errorJsonData encoding:NSUTF8StringEncoding];
        if (errorStr) {
          RCTLogInfo(@"[ChromeRemoteDevTools] Sending Network.getResponseBody error response / Network.getResponseBody 오류 응답 전송: %@", [errorStr substringToIndex:MIN(200, errorStr.length)]);
          [self send:[errorStr UTF8String]];
          return; // Don't forward the original message / 원본 메시지를 전달하지 않음
        }
      }
      // If we reach here, even the error response serialization failed. Log and avoid forwarding.
      RCTLogError(@"[ChromeRemoteDevTools] Failed to serialize Network.getResponseBody error response / Network.getResponseBody 오류 응답 직렬화 실패");
      return; // Don't forward the original message / 원본 메시지를 전달하지 않음
    }
  }

  // Forward other messages to delegate / 다른 메시지는 delegate로 전달
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

