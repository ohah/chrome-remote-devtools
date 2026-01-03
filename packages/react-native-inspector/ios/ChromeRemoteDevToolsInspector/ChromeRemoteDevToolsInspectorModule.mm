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
#import "ChromeRemoteDevToolsNetworkHook.h"
#import <React/RCTBridgeModule.h>
#import <React/RCTLog.h>

// Import TurboModule headers for JSI Runtime access / JSI Runtime 접근을 위한 TurboModule 헤더 import
#import <ReactCommon/RCTTurboModule.h>
#import <ReactCommon/RCTTurboModuleWithJSIBindings.h>
// Note: RCTInteropTurboModule is in ReactCommon/turbomodule/core pod / 참고: RCTInteropTurboModule은 ReactCommon/turbomodule/core pod에 있음
// Use #include for C++ header / C++ 헤더는 #include 사용
#include <ReactCommon/RCTInteropTurboModule.h>

// Include common C++ console hook / 공통 C++ console 훅 포함
#if __has_include("ConsoleHook.h")
#include "ConsoleHook.h"
#define CONSOLE_HOOK_AVAILABLE
#endif

// Include common C++ network hook / 공통 C++ network 훅 포함
#if __has_include("NetworkHook.h")
#include "NetworkHook.h"
#define NETWORK_HOOK_AVAILABLE
#endif

#if RCT_DEV || RCT_REMOTE_PROFILE

// Store original log function / 원본 로그 함수 저장
static RCTLogFunction originalLogFunction = nil;

// Store connection for sending CDP messages / CDP 메시지 전송을 위한 연결 저장
static id<ChromeRemoteDevToolsInspectorPackagerConnectionProtocol> g_connection = nil;

// Objective-C++ callback for sending CDP messages / CDP 메시지 전송을 위한 Objective-C++ 콜백
// Note: WebSocket execution is disabled for now, will be reconnected later / 참고: WebSocket 실행은 현재 비활성화되어 있으며, 나중에 다시 연결됩니다
#ifdef CONSOLE_HOOK_AVAILABLE
void sendCDPMessageIOS(const char* serverHost, int serverPort, const char* message) {
  @autoreleasepool {
    NSString* host = [NSString stringWithUTF8String:serverHost];
    NSString* msg = [NSString stringWithUTF8String:message];

    // WebSocket execution disabled - code preserved for later reconnection / WebSocket 실행 비활성화 - 나중에 재연결을 위해 코드 보존
    // TODO: Re-enable WebSocket connection / TODO: WebSocket 연결 재활성화
    /*
    if (g_connection && [g_connection respondsToSelector:@selector(sendCDPMessage:)]) {
      [g_connection sendCDPMessage:msg];
    } else {
      // Fallback: Use ChromeRemoteDevToolsInspector helper / 폴백: ChromeRemoteDevToolsInspector 헬퍼 사용
      [ChromeRemoteDevToolsInspectorObjC sendCDPMessageWithServerHost:host
                                                           serverPort:serverPort
                                                               message:msg];
    }
    */

    // Log for debugging (will be removed when WebSocket is reconnected) / 디버깅용 로그 (WebSocket 재연결 시 제거됨)
    NSLog(@"[ChromeRemoteDevToolsInspectorModule] sendCDPMessageIOS called (WebSocket disabled) / sendCDPMessageIOS 호출됨 (WebSocket 비활성화): %@:%d - %@", host, serverPort, [msg substringToIndex:MIN(100, msg.length)]);
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
  // WebSocket execution disabled - code preserved for later reconnection / WebSocket 실행 비활성화 - 나중에 재연결을 위해 코드 보존
  // TODO: Re-enable WebSocket connection check / TODO: WebSocket 연결 확인 재활성화
  /*
  if (!g_connection) {
    isProcessingLog = NO;
    return;
  }

  if (!g_connection.isConnected) {
    isProcessingLog = NO;
    return;
  }
  */

  // WebSocket disabled, skip CDP message sending / WebSocket 비활성화, CDP 메시지 전송 건너뛰기
  isProcessingLog = NO;
  return;

  // Skip CDP message sending - JavaScript layer hook handles this / CDP 메시지 전송 건너뛰기 - JavaScript 레이어 훅이 처리합니다
  // JavaScript layer hook provides better stack traces with source map support / JavaScript 레이어 훅은 소스맵 지원과 함께 더 나은 스택 트레이스를 제공합니다
  isProcessingLog = NO;
  return;

  // NOTE: The following code is disabled in favor of JavaScript layer hook / 참고: 다음 코드는 JavaScript 레이어 훅을 위해 비활성화됨
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

  // WebSocket execution disabled - code preserved for later reconnection / WebSocket 실행 비활성화 - 나중에 재연결을 위해 코드 보존
  // TODO: Re-enable WebSocket message sending / TODO: WebSocket 메시지 전송 재활성화
  /*
  if ([g_connection respondsToSelector:@selector(sendCDPMessage:)]) {
    [g_connection sendCDPMessage:jsonString];
  }
  */

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

#pragma mark - RCTTurboModule

/**
 * Create TurboModule instance / TurboModule 인스턴스 생성
 * Return ObjCInteropTurboModule to wrap Legacy Module / Legacy Module을 래핑하기 위해 ObjCInteropTurboModule 반환
 * This ensures installJSIBindingsWithRuntime is called / 이를 통해 installJSIBindingsWithRuntime이 호출됩니다
 */
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  NSLog(@"[ChromeRemoteDevToolsInspectorModule] getTurboModule: called / getTurboModule: 호출됨");
  NSLog(@"[ChromeRemoteDevToolsInspectorModule] Module name: %s", params.moduleName.c_str());
  NSLog(@"[ChromeRemoteDevToolsInspectorModule] Creating ObjCInteropTurboModule wrapper / ObjCInteropTurboModule 래퍼 생성");

  // Create ObjCInteropTurboModule to wrap Legacy Module / Legacy Module을 래핑하기 위해 ObjCInteropTurboModule 생성
  // This allows installJSIBindingsWithRuntime to be called / 이를 통해 installJSIBindingsWithRuntime이 호출됩니다
  auto turboModule = std::make_shared<facebook::react::ObjCInteropTurboModule>(params);

  if (turboModule) {
    NSLog(@"[ChromeRemoteDevToolsInspectorModule] ✅ ObjCInteropTurboModule created successfully / ObjCInteropTurboModule이 성공적으로 생성됨");
  } else {
    NSLog(@"[ChromeRemoteDevToolsInspectorModule] ❌ Failed to create ObjCInteropTurboModule / ObjCInteropTurboModule 생성 실패");
  }

  return turboModule;
}

#pragma mark - RCTTurboModuleWithJSIBindings

/**
 * Install JSI bindings when TurboModule is created / TurboModule이 생성될 때 JSI 바인딩 설치
 * This method is automatically called by React Native / 이 메서드는 React Native에 의해 자동으로 호출됩니다
 * This is where we can access JSI Runtime and install hooks / 여기서 JSI Runtime에 접근하여 훅을 설치할 수 있습니다
 */
- (void)installJSIBindingsWithRuntime:(facebook::jsi::Runtime &)runtime
                          callInvoker:(const std::shared_ptr<facebook::react::CallInvoker> &)callInvoker {
  NSLog(@"[ChromeRemoteDevToolsInspectorModule] ========================================");
  NSLog(@"[ChromeRemoteDevToolsInspectorModule] installJSIBindingsWithRuntime:callInvoker: called / installJSIBindingsWithRuntime:callInvoker: 호출됨");
  NSLog(@"[ChromeRemoteDevToolsInspectorModule] This is the key method for JSI Runtime access / 이것은 JSI Runtime 접근을 위한 핵심 메서드입니다");

  // Check if hooks are available / 훅이 사용 가능한지 확인
#ifdef CONSOLE_HOOK_AVAILABLE
  NSLog(@"[ChromeRemoteDevToolsInspectorModule] ✅ ConsoleHook.h is available / ConsoleHook.h를 사용할 수 있음");
#else
  NSLog(@"[ChromeRemoteDevToolsInspectorModule] ❌ ConsoleHook.h is NOT available / ConsoleHook.h를 사용할 수 없음");
#endif

#ifdef NETWORK_HOOK_AVAILABLE
  NSLog(@"[ChromeRemoteDevToolsInspectorModule] ✅ NetworkHook.h is available / NetworkHook.h를 사용할 수 있음");
#else
  NSLog(@"[ChromeRemoteDevToolsInspectorModule] ❌ NetworkHook.h is NOT available / NetworkHook.h를 사용할 수 없음");
#endif

  // Set platform callback for C++ code / C++ 코드를 위한 플랫폼 콜백 설정
  NSLog(@"[ChromeRemoteDevToolsInspectorModule] Setting platform callback for CDP message sending / CDP 메시지 전송을 위한 플랫폼 콜백 설정");
#ifdef CONSOLE_HOOK_AVAILABLE
  chrome_remote_devtools::setSendCDPMessageCallback(sendCDPMessageIOS);
  NSLog(@"[ChromeRemoteDevToolsInspectorModule] ✅ Platform callback set successfully / 플랫폼 콜백이 성공적으로 설정됨");
#else
  NSLog(@"[ChromeRemoteDevToolsInspectorModule] ⚠️ Cannot set platform callback - ConsoleHook.h not available / 플랫폼 콜백을 설정할 수 없음 - ConsoleHook.h를 사용할 수 없음");
#endif

  // Install console hook / console 훅 설치
  bool consoleSuccess = false;
#ifdef CONSOLE_HOOK_AVAILABLE
  NSLog(@"[ChromeRemoteDevToolsInspectorModule] Installing console hook... / console 훅 설치 중...");
  @try {
    consoleSuccess = chrome_remote_devtools::hookConsoleMethods(runtime);
    if (consoleSuccess) {
      NSLog(@"[ChromeRemoteDevToolsInspectorModule] ✅ Console hook installed successfully / console 훅이 성공적으로 설치됨");
    } else {
      NSLog(@"[ChromeRemoteDevToolsInspectorModule] ❌ Failed to install console hook / console 훅 설치 실패");
    }
  } @catch (NSException *exception) {
    NSLog(@"[ChromeRemoteDevToolsInspectorModule] ❌ Exception while installing console hook: %@ / console 훅 설치 중 예외 발생: %@", exception);
  }
#else
  NSLog(@"[ChromeRemoteDevToolsInspectorModule] ⚠️ Console hook not available - ConsoleHook.h not included / console 훅을 사용할 수 없음 - ConsoleHook.h가 포함되지 않음");
#endif

  // Install network hook / 네트워크 훅 설치
  bool networkSuccess = false;
#ifdef NETWORK_HOOK_AVAILABLE
  NSLog(@"[ChromeRemoteDevToolsInspectorModule] Installing network hook... / 네트워크 훅 설치 중...");
  @try {
    networkSuccess = chrome_remote_devtools::hookNetworkMethods(runtime);
    if (networkSuccess) {
      NSLog(@"[ChromeRemoteDevToolsInspectorModule] ✅ Network hook installed successfully / 네트워크 훅이 성공적으로 설치됨");
    } else {
      NSLog(@"[ChromeRemoteDevToolsInspectorModule] ❌ Failed to install network hook / 네트워크 훅 설치 실패");
    }
  } @catch (NSException *exception) {
    NSLog(@"[ChromeRemoteDevToolsInspectorModule] ❌ Exception while installing network hook: %@ / 네트워크 훅 설치 중 예외 발생: %@", exception);
  }
#else
  NSLog(@"[ChromeRemoteDevToolsInspectorModule] ⚠️ Network hook not available - NetworkHook.h not included / 네트워크 훅을 사용할 수 없음 - NetworkHook.h가 포함되지 않음");
#endif

  // Summary / 요약
  NSLog(@"[ChromeRemoteDevToolsInspectorModule] ========================================");
  NSLog(@"[ChromeRemoteDevToolsInspectorModule] JSI Hooks Installation Summary / JSI 훅 설치 요약:");
  NSLog(@"[ChromeRemoteDevToolsInspectorModule]   Console Hook: %@", consoleSuccess ? @"✅ Success" : @"❌ Failed");
  NSLog(@"[ChromeRemoteDevToolsInspectorModule]   Network Hook: %@", networkSuccess ? @"✅ Success" : @"❌ Failed");
  if (consoleSuccess && networkSuccess) {
    NSLog(@"[ChromeRemoteDevToolsInspectorModule] ✅ All JSI hooks installed successfully / 모든 JSI 훅이 성공적으로 설치됨");
  } else {
    NSLog(@"[ChromeRemoteDevToolsInspectorModule] ⚠️ Some JSI hooks failed to install / 일부 JSI 훅 설치 실패");
  }
  NSLog(@"[ChromeRemoteDevToolsInspectorModule] ========================================");
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
  NSLog(@"[ChromeRemoteDevToolsInspectorModule] connect: called / connect: 호출됨");
  NSLog(@"[ChromeRemoteDevToolsInspectorModule] Server: %@:%@", serverHost, serverPort);

  // WebSocket execution disabled - code preserved for later reconnection / WebSocket 실행 비활성화 - 나중에 재연결을 위해 코드 보존
  // TODO: Re-enable WebSocket connection / TODO: WebSocket 연결 재활성화
  /*
  // Call Objective-C++ implementation / Objective-C++ 구현 호출
  id<ChromeRemoteDevToolsInspectorPackagerConnectionProtocol> connection =
    [ChromeRemoteDevToolsInspectorObjC connectWithServerHost:serverHost serverPort:[serverPort integerValue]];

  if (connection) {
    // Store connection for log interception / 로그 가로채기를 위한 연결 저장
    g_connection = connection;
    NSLog(@"[ChromeRemoteDevToolsInspectorModule] Connection stored for CDP message sending / CDP 메시지 전송을 위한 연결 저장됨");
  */

  // Set platform callback for C++ code (even without WebSocket, hooks can be installed) / C++ 코드를 위한 플랫폼 콜백 설정 (WebSocket 없이도 훅은 설치 가능)
#ifdef CONSOLE_HOOK_AVAILABLE
  NSLog(@"[ChromeRemoteDevToolsInspectorModule] Setting platform callback for C++ hooks / C++ 훅을 위한 플랫폼 콜백 설정");
  chrome_remote_devtools::setSendCDPMessageCallback(sendCDPMessageIOS);
  NSLog(@"[ChromeRemoteDevToolsInspectorModule] ✅ Platform callback set / 플랫폼 콜백 설정됨");

  // Note: JSI hooks will be installed automatically via installJSIBindingsWithRuntime / 참고: JSI 훅은 installJSIBindingsWithRuntime을 통해 자동으로 설치됩니다
  // This method is called when TurboModule is created / 이 메서드는 TurboModule이 생성될 때 호출됩니다
  NSLog(@"[ChromeRemoteDevToolsInspectorModule] JSI hooks will be installed automatically when TurboModule is created / TurboModule이 생성될 때 JSI 훅이 자동으로 설치됩니다");
#else
  NSLog(@"[ChromeRemoteDevToolsInspectorModule] ⚠️ ConsoleHook.h not available - JSI hooks will not be installed / ConsoleHook.h를 사용할 수 없음 - JSI 훅이 설치되지 않습니다");
#endif

  // Hook RCTLog to intercept console messages at native level (fallback) / 네이티브 레벨에서 콘솔 메시지를 가로채기 위해 RCTLog 훅 (폴백)
  // This is a fallback in case JSI hooks are not available / JSI 훅을 사용할 수 없는 경우를 위한 폴백입니다
  // JSI hooks provide better stack traces with source map support / JSI 훅은 소스맵 지원과 함께 더 나은 스택 트레이스를 제공합니다
  NSLog(@"[ChromeRemoteDevToolsInspectorModule] Setting up RCTLogFunction as fallback / RCTLogFunction을 폴백으로 설정");
  if (!originalLogFunction) {
    originalLogFunction = RCTGetLogFunction();
    RCTSetLogFunction(ChromeRemoteDevToolsLogFunction);
    NSLog(@"[ChromeRemoteDevToolsInspectorModule] ✅ RCTLogFunction hook installed (fallback) / RCTLogFunction 훅 설치됨 (폴백)");
  } else {
    NSLog(@"[ChromeRemoteDevToolsInspectorModule] RCTLogFunction already hooked / RCTLogFunction이 이미 훅됨");
  }

  // Enable network interception at native level (NSURLProtocol) / 네이티브 레벨에서 네트워크 인터셉션 활성화 (NSURLProtocol)
  // Note: JSI network hook will also be installed via installJSIBindingsWithRuntime / 참고: JSI 네트워크 훅도 installJSIBindingsWithRuntime을 통해 설치됩니다
  // JSI hook provides better integration with JavaScript fetch/XMLHttpRequest / JSI 훅은 JavaScript fetch/XMLHttpRequest와 더 나은 통합을 제공합니다
  // WebSocket execution disabled - code preserved for later reconnection / WebSocket 실행 비활성화 - 나중에 재연결을 위해 코드 보존
  // TODO: Re-enable network interception when WebSocket is reconnected / TODO: WebSocket 재연결 시 네트워크 인터셉션 재활성화
  /*
  NSLog(@"[ChromeRemoteDevToolsInspectorModule] Enabling native network interception (NSURLProtocol) / 네이티브 네트워크 인터셉션 활성화 (NSURLProtocol)");
  [ChromeRemoteDevToolsNetworkHook enableWithServerHost:serverHost serverPort:[serverPort integerValue]];
  NSLog(@"[ChromeRemoteDevToolsInspectorModule] ✅ Native network interception enabled / 네이티브 네트워크 인터셉션 활성화됨");
  */

  // Return success (WebSocket connection will be implemented later) / 성공 반환 (WebSocket 연결은 나중에 구현됨)
  resolver(@{
    @"connected": @YES,
    @"host": serverHost,
    @"port": serverPort,
    @"websocketDisabled": @YES  // Indicate WebSocket is disabled / WebSocket이 비활성화되었음을 표시
  });

  /*
  } else {
    rejecter(@"CONNECTION_FAILED", @"Failed to connect to Chrome Remote DevTools server", nil);
  }
  */
}

/**
 * Disable debugger / 디버거 비활성화
 */
RCT_EXPORT_METHOD(disableDebugger:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter) {
  [ChromeRemoteDevToolsInspectorObjC disableDebugger];
  // Disable network interception / 네트워크 인터셉션 비활성화
  [ChromeRemoteDevToolsNetworkHook disable];
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

