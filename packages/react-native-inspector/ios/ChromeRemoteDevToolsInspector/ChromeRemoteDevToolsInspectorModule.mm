/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Modified for Chrome Remote DevTools / Chrome Remote DevTools용으로 수정됨
 */

#import "ChromeRemoteDevToolsInspectorModule.h"
#import "ChromeRemoteDevToolsInspector.h"
#import "ChromeRemoteDevToolsInspectorPackagerConnection.h"
#import <React/RCTBridgeModule.h>
#import <React/RCTLog.h>

// Include common C++ console hook / 공통 C++ console 훅 포함
#if __has_include("ConsoleHook.h")
#include "ConsoleHook.h"
#define CONSOLE_HOOK_AVAILABLE
#endif

#if RCT_DEV || RCT_REMOTE_PROFILE

// Store original log function / 원본 로그 함수 저장
static RCTLogFunction originalLogFunction = nil;

// Store connection for sending CDP messages / CDP 메시지 전송을 위한 연결 저장
static id<ChromeRemoteDevToolsInspectorPackagerConnectionProtocol> g_connection = nil;

// Objective-C++ callback for sending CDP messages / CDP 메시지 전송을 위한 Objective-C++ 콜백
#ifdef CONSOLE_HOOK_AVAILABLE
void sendCDPMessageIOS(const char* serverHost, int serverPort, const char* message) {
  @autoreleasepool {
    NSString* host = [NSString stringWithUTF8String:serverHost];
    NSString* msg = [NSString stringWithUTF8String:message];

    if (g_connection && [g_connection respondsToSelector:@selector(sendCDPMessage:)]) {
      [g_connection sendCDPMessage:msg];
    } else {
      // Fallback: Use ChromeRemoteDevToolsInspector helper / 폴백: ChromeRemoteDevToolsInspector 헬퍼 사용
      [ChromeRemoteDevToolsInspectorObjC sendCDPMessageWithServerHost:host
                                                           serverPort:serverPort
                                                               message:msg];
    }
  }
}
#endif

/**
 * Custom log function to intercept console messages and send as CDP events / 콘솔 메시지를 가로채서 CDP 이벤트로 전송하는 커스텀 로그 함수
 * Note: RCTLogFunction is a block type in React Native 0.83+ / 참고: RCTLogFunction은 React Native 0.83+에서 블록 타입입니다
 */
// Flag to prevent infinite recursion / 무한 재귀 방지를 위한 플래그
static BOOL isProcessingLog = NO;
// Counter to ensure unique timestamps / 고유한 타임스탬프를 보장하기 위한 카운터
static NSUInteger timestampCounter = 0;

static RCTLogFunction ChromeRemoteDevToolsLogFunction = ^(
    RCTLogLevel level,
    RCTLogSource source,
    NSString *fileName,
    NSNumber *lineNumber,
    NSString *message)
{
  // Prevent infinite recursion / 무한 재귀 방지
  if (isProcessingLog) {
    // If we're already processing a log, just call original and return / 이미 로그를 처리 중이면 원본만 호출하고 반환
    if (originalLogFunction) {
      originalLogFunction(level, source, fileName, lineNumber, message);
    }
    return;
  }

  isProcessingLog = YES;

  // Call original log function / 원본 로그 함수 호출
  if (originalLogFunction) {
    originalLogFunction(level, source, fileName, lineNumber, message);
  }

  // Filter out native logs (e.g., Objective-C/C++ files, or files starting with RCT)
  // 네이티브 로그 필터링 (예: Objective-C/C++ 파일, 또는 RCT로 시작하는 파일)
  // Only skip if fileName clearly indicates native code / fileName이 명확히 네이티브 코드를 나타낼 때만 건너뛰기
  if (fileName && ([fileName hasSuffix:@".m"] || [fileName hasSuffix:@".mm"] || [fileName hasSuffix:@".h"] || [fileName hasPrefix:@"RCT"])) {
    isProcessingLog = NO;
    return;
  }

  // Skip if message is empty / 메시지가 비어있으면 건너뛰기
  if (message == nil || message.length == 0) {
    isProcessingLog = NO;
    return;
  }

  // Skip our own debug messages to prevent recursion / 재귀 방지를 위해 우리 자신의 디버그 메시지 건너뛰기
  if ([message containsString:@"[ChromeRemoteDevTools]"]) {
    isProcessingLog = NO;
    return;
  }

  // Check connection status / 연결 상태 확인
  if (!g_connection) {
    isProcessingLog = NO;
    return;
  }

  if (!g_connection.isConnected) {
    isProcessingLog = NO;
    return;
  }

  // Convert to CDP Runtime.consoleAPICalled event / CDP Runtime.consoleAPICalled 이벤트로 변환
  // Map RCTLogLevel to CDP console type / RCTLogLevel을 CDP console type으로 매핑
  // Note: React Native console methods map to different log levels / 참고: React Native console 메서드는 다른 로그 레벨로 매핑됨
  // console.log() -> RCTLogLevelInfo -> "log"
  // console.info() -> RCTLogLevelInfo -> "info" (keep as info for console.info)
  // console.warn() -> RCTLogLevelWarning -> "warning"
  // console.error() -> RCTLogLevelError -> "error"
  NSString *type = @"log"; // Default for console.log() / console.log()의 기본값
  if (level == RCTLogLevelError) {
    type = @"error";
  } else if (level == RCTLogLevelWarning) {
    type = @"warning";
  } else if (level == RCTLogLevelInfo) {
    // For RCTLogLevelInfo, check if message contains console.info indicator / RCTLogLevelInfo의 경우 console.info 표시자 확인
    // Note: React Native doesn't distinguish between console.log and console.info at log level / 참고: React Native는 로그 레벨에서 console.log와 console.info를 구분하지 않음
    // So we default to "log" for compatibility / 호환성을 위해 기본값은 "log"
    type = @"log";
  }
  // Default and other levels map to "log" / 기본값 및 기타 레벨은 "log"로 매핑

  // Generate unique timestamp / 고유한 타임스탬프 생성
  // Use base time in milliseconds and add counter for uniqueness / 밀리초 단위 기본 시간을 사용하고 고유성을 위해 카운터 추가
  NSTimeInterval baseTime = [[NSDate date] timeIntervalSince1970];
  NSUInteger counter = ++timestampCounter;
  // Add counter value (modulo 1000) to ensure uniqueness within same millisecond / 같은 밀리초 내에서 고유성을 보장하기 위해 카운터 값(모듈로 1000) 추가
  // This ensures each message has a unique timestamp / 이를 통해 각 메시지가 고유한 타임스탬프를 가지게 됨
  long long timestamp = (long long)(baseTime * 1000) + (counter % 1000);

  // Format message as CDP Runtime.consoleAPICalled event / CDP Runtime.consoleAPICalled 이벤트로 메시지 포맷팅
  // Note: args should be formatted as RemoteObject array / 참고: args는 RemoteObject 배열로 포맷팅되어야 함
  // For string messages, use type "string" with value / 문자열 메시지의 경우 type "string"과 value 사용
  NSDictionary *cdpMessage = @{
    @"method": @"Runtime.consoleAPICalled",
    @"params": @{
      @"type": type,
      @"args": @[@{
        @"type": @"string",
        @"value": message ?: @""
      }],
      @"executionContextId": @1,
      @"timestamp": @(timestamp),
      @"stackTrace": @{
        @"callFrames": @[]
      }
    }
  };

  NSError *error = nil;
  NSData *jsonData = [NSJSONSerialization dataWithJSONObject:cdpMessage options:0 error:&error];
  if (!jsonData || error) {
    isProcessingLog = NO;
    return;
  }

  NSString *jsonString = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
  if (!jsonString) {
    isProcessingLog = NO;
    return;
  }

  if ([g_connection respondsToSelector:@selector(sendCDPMessage:)]) {
    [g_connection sendCDPMessage:jsonString];
  }

  isProcessingLog = NO;
};

/**
 * TurboModule implementation for Chrome Remote DevTools Inspector / Chrome Remote DevTools Inspector용 TurboModule 구현
 * This allows JavaScript to call native Inspector methods / JavaScript에서 네이티브 Inspector 메서드를 호출할 수 있게 합니다
 */
@implementation ChromeRemoteDevToolsInspectorModule

RCT_EXPORT_MODULE(ChromeRemoteDevToolsInspector)

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

/**
 * Connect to Chrome Remote DevTools server / Chrome Remote DevTools 서버에 연결
 * @param serverHost Server host / 서버 호스트
 * @param serverPort Server port / 서버 포트
 */
RCT_EXPORT_METHOD(connect:(NSString *)serverHost
                  serverPort:(NSNumber *)serverPort
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter) {
  // Call Objective-C++ implementation / Objective-C++ 구현 호출
  id<ChromeRemoteDevToolsInspectorPackagerConnectionProtocol> connection =
    [ChromeRemoteDevToolsInspectorObjC connectWithServerHost:serverHost serverPort:[serverPort integerValue]];

  if (connection) {
    // Store connection for log interception / 로그 가로채기를 위한 연결 저장
    g_connection = connection;

#ifdef CONSOLE_HOOK_AVAILABLE
    // Set platform callback for C++ code / C++ 코드를 위한 플랫폼 콜백 설정
    chrome_remote_devtools::setSendCDPMessageCallback(sendCDPMessageIOS);

    // Hook JSI console methods if available (same as Android) / 사용 가능한 경우 JSI console 메서드 훅 (Android와 동일)
    // Note: This requires accessing the runtime executor from bridge / 참고: 이것은 bridge에서 런타임 실행자에 접근해야 합니다
    // For now, we'll use RCTLogFunction as fallback / 지금은 RCTLogFunction을 폴백으로 사용합니다
    // TODO: Add JSI hooking support for iOS / TODO: iOS용 JSI 훅 지원 추가
#endif

    // Hook RCTLog to intercept console messages at native level / 네이티브 레벨에서 콘솔 메시지를 가로채기 위해 RCTLog 훅
    if (!originalLogFunction) {
      originalLogFunction = RCTGetLogFunction();
      RCTSetLogFunction(ChromeRemoteDevToolsLogFunction);
    }

    resolver(@{
      @"connected": @YES,
      @"host": serverHost,
      @"port": serverPort
    });
  } else {
    rejecter(@"CONNECTION_FAILED", @"Failed to connect to Chrome Remote DevTools server", nil);
  }
}

/**
 * Disable debugger / 디버거 비활성화
 */
RCT_EXPORT_METHOD(disableDebugger:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter) {
  [ChromeRemoteDevToolsInspectorObjC disableDebugger];
  resolver(nil);
}

/**
 * Check if packager is disconnected / Packager 연결이 끊어졌는지 확인
 */
RCT_EXPORT_METHOD(isPackagerDisconnected:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter) {
  BOOL disconnected = [ChromeRemoteDevToolsInspectorObjC isPackagerDisconnected];
  resolver(@(disconnected));
}

/**
 * Open debugger / 디버거 열기
 * @param serverHost Server host / 서버 호스트
 * @param serverPort Server port / 서버 포트
 * @param errorMessage Error message to show if failed / 실패 시 표시할 에러 메시지
 */
RCT_EXPORT_METHOD(openDebugger:(NSString *)serverHost
                  serverPort:(NSNumber *)serverPort
                  errorMessage:(NSString *)errorMessage
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter) {
  [ChromeRemoteDevToolsInspectorObjC openDebuggerWithServerHost:serverHost
                                                      serverPort:[serverPort integerValue]
                                                    errorMessage:errorMessage];
  resolver(nil);
}

/**
 * Send CDP message to Inspector WebSocket / Inspector WebSocket으로 CDP 메시지 전송
 * @param serverHost Server host / 서버 호스트
 * @param serverPort Server port / 서버 포트
 * @param message CDP message as JSON string / JSON 문자열로 된 CDP 메시지
 */
RCT_EXPORT_METHOD(sendCDPMessage:(NSString *)serverHost
                  serverPort:(NSNumber *)serverPort
                  message:(NSString *)message
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter) {
  [ChromeRemoteDevToolsInspectorObjC sendCDPMessageWithServerHost:serverHost
                                                         serverPort:[serverPort integerValue]
                                                            message:message];
  resolver(nil);
}

@end

#endif

