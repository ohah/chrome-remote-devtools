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

// Store CallInvoker and runtime accessor for safe JSI runtime access / 안전한 JSI 런타임 접근을 위한 CallInvoker 및 런타임 접근자 저장
static std::shared_ptr<facebook::react::CallInvoker> g_callInvoker = nullptr;
static std::function<void(std::function<void(facebook::jsi::Runtime&)>)> g_runtimeExecutor = nullptr;

// Objective-C++ callback for sending CDP messages / CDP 메시지 전송을 위한 Objective-C++ 콜백
#ifdef CONSOLE_HOOK_AVAILABLE
void sendCDPMessageIOS(const char* serverHost, int serverPort, const char* message) {
  @autoreleasepool {
    NSString* host = [NSString stringWithUTF8String:serverHost];
    NSString* msg = [NSString stringWithUTF8String:message];

    // Try to send via stored connection first / 먼저 저장된 연결을 통해 전송 시도
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
 * Custom log function to intercept console messages at native level (fallback) / 네이티브 레벨에서 콘솔 메시지를 가로채는 커스텀 로그 함수 (폴백)
 * Note: RCTLogFunction is a block type in React Native 0.83+ / 참고: RCTLogFunction은 React Native 0.83+에서 블록 타입입니다
 * This is a fallback in case C++ console hook (JSI level) is not available / C++ console 훅(JSI 레벨)을 사용할 수 없는 경우를 위한 폴백입니다
 * When C++ hook is installed, it handles CDP message sending, so this function skips sending to avoid duplicates / C++ 훅이 설치되면 CDP 메시지 전송을 처리하므로, 이 함수는 중복을 방지하기 위해 전송을 건너뜁니다
 */
// Flag to prevent infinite recursion / 무한 재귀 방지를 위한 플래그
static BOOL isProcessingLog = NO;

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

  // Skip CDP message sending - C++ console hook (JSI level) handles this / CDP 메시지 전송 건너뛰기 - C++ console 훅(JSI 레벨)이 처리합니다
  // C++ console hook provides better stack traces with source map support / C++ console 훅은 소스맵 지원과 함께 더 나은 스택 트레이스를 제공합니다
  // C++ hook sends CDP messages directly, so we skip here to avoid duplicates / C++ 훅이 CDP 메시지를 직접 전송하므로 중복을 방지하기 위해 여기서 건너뜁니다
  isProcessingLog = NO;
  return;
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

  // Store CallInvoker for safe JSI runtime access in enable/disable methods / enable/disable 메서드에서 안전한 JSI 런타임 접근을 위해 CallInvoker 저장
  g_callInvoker = callInvoker;

  // Create runtime executor that captures runtime reference / 런타임 참조를 캡처하는 런타임 executor 생성
  // Capture runtime by reference in lambda / 람다에서 런타임을 참조로 캡처
  facebook::jsi::Runtime* runtimePtr = &runtime;
  g_runtimeExecutor = [callInvoker, runtimePtr](std::function<void(facebook::jsi::Runtime&)> callback) {
    if (callInvoker && runtimePtr) {
      callInvoker->invokeAsync([callback, runtimePtr]() {
        if (runtimePtr) {
          callback(*runtimePtr);
        }
      });
    }
  };

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

  // Call Objective-C++ implementation / Objective-C++ 구현 호출
  id<ChromeRemoteDevToolsInspectorPackagerConnectionProtocol> connection =
    [ChromeRemoteDevToolsInspectorObjC connectWithServerHost:serverHost serverPort:[serverPort integerValue]];

  if (connection) {
    // Store connection for log interception / 로그 가로채기를 위한 연결 저장
    g_connection = connection;
    NSLog(@"[ChromeRemoteDevToolsInspectorModule] ✅ Connection stored for CDP message sending / CDP 메시지 전송을 위한 연결 저장됨");
  } else {
    NSLog(@"[ChromeRemoteDevToolsInspectorModule] ❌ Failed to create connection / 연결 생성 실패");
    rejecter(@"CONNECTION_FAILED", @"Failed to connect to Chrome Remote DevTools server", nil);
    return;
  }

  // Set platform callback for C++ code / C++ 코드를 위한 플랫폼 콜백 설정
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

  // Note: Network hooking is handled at JSI level (C++ hook) via installJSIBindingsWithRuntime / 참고: 네트워크 훅은 installJSIBindingsWithRuntime을 통해 JSI 레벨(C++ 훅)에서 처리됩니다
  // JSI hook provides better integration with JavaScript fetch/XMLHttpRequest / JSI 훅은 JavaScript fetch/XMLHttpRequest와 더 나은 통합을 제공합니다
  NSLog(@"[ChromeRemoteDevToolsInspectorModule] Network hooking is handled at JSI level (C++ hook) / 네트워크 훅은 JSI 레벨(C++ 훅)에서 처리됩니다");

  // Return success / 성공 반환
  resolver(@{
    @"connected": @YES,
    @"host": serverHost,
    @"port": serverPort
  });
}

/**
 * Disable debugger / 디버거 비활성화
 */
RCT_EXPORT_METHOD(disableDebugger:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter) {
  [ChromeRemoteDevToolsInspectorObjC disableDebugger];
  // Note: Network hooking is handled at JSI level, no need to disable separately / 참고: 네트워크 훅은 JSI 레벨에서 처리되므로 별도로 비활성화할 필요 없음
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

/**
 * Enable console hook / console 훅 활성화
 */
RCT_EXPORT_METHOD(enableConsoleHook:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter) {
#ifdef CONSOLE_HOOK_AVAILABLE
  if (g_runtimeExecutor) {
    g_runtimeExecutor([resolver, rejecter](facebook::jsi::Runtime& runtime) {
      @try {
        bool success = chrome_remote_devtools::enableConsoleHook(runtime);
        resolver(@(success));
      } @catch (NSException *exception) {
        rejecter(@"ENABLE_CONSOLE_HOOK_ERROR", exception.reason, nil);
      } @catch (...) {
        rejecter(@"ENABLE_CONSOLE_HOOK_ERROR", @"Unknown error / 알 수 없는 오류", nil);
      }
    });
  } else {
    rejecter(@"NO_RUNTIME_EXECUTOR", @"Runtime executor is not available / Runtime executor를 사용할 수 없습니다", nil);
  }
#else
  rejecter(@"NOT_AVAILABLE", @"Console hook is not available / Console 훅을 사용할 수 없습니다", nil);
#endif
}

/**
 * Disable console hook / console 훅 비활성화
 */
RCT_EXPORT_METHOD(disableConsoleHook:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter) {
#ifdef CONSOLE_HOOK_AVAILABLE
  if (g_runtimeExecutor) {
    g_runtimeExecutor([resolver, rejecter](facebook::jsi::Runtime& runtime) {
      @try {
        bool success = chrome_remote_devtools::disableConsoleHook(runtime);
        resolver(@(success));
      } @catch (NSException *exception) {
        rejecter(@"DISABLE_CONSOLE_HOOK_ERROR", exception.reason, nil);
      } @catch (...) {
        rejecter(@"DISABLE_CONSOLE_HOOK_ERROR", @"Unknown error / 알 수 없는 오류", nil);
      }
    });
  } else {
    rejecter(@"NO_RUNTIME_EXECUTOR", @"Runtime executor is not available / Runtime executor를 사용할 수 없습니다", nil);
  }
#else
  rejecter(@"NOT_AVAILABLE", @"Console hook is not available / Console 훅을 사용할 수 없습니다", nil);
#endif
}

/**
 * Enable network hook / 네트워크 훅 활성화
 */
RCT_EXPORT_METHOD(enableNetworkHook:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter) {
#ifdef NETWORK_HOOK_AVAILABLE
  if (g_runtimeExecutor) {
    g_runtimeExecutor([resolver, rejecter](facebook::jsi::Runtime& runtime) {
      @try {
        bool success = chrome_remote_devtools::enableNetworkHook(runtime);
        resolver(@(success));
      } @catch (NSException *exception) {
        rejecter(@"ENABLE_NETWORK_HOOK_ERROR", exception.reason, nil);
      } @catch (...) {
        rejecter(@"ENABLE_NETWORK_HOOK_ERROR", @"Unknown error / 알 수 없는 오류", nil);
      }
    });
  } else {
    rejecter(@"NO_RUNTIME_EXECUTOR", @"Runtime executor is not available / Runtime executor를 사용할 수 없습니다", nil);
  }
#else
  rejecter(@"NOT_AVAILABLE", @"Network hook is not available / 네트워크 훅을 사용할 수 없습니다", nil);
#endif
}

/**
 * Disable network hook / 네트워크 훅 비활성화
 */
RCT_EXPORT_METHOD(disableNetworkHook:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter) {
#ifdef NETWORK_HOOK_AVAILABLE
  if (g_runtimeExecutor) {
    g_runtimeExecutor([resolver, rejecter](facebook::jsi::Runtime& runtime) {
      @try {
        bool success = chrome_remote_devtools::disableNetworkHook(runtime);
        resolver(@(success));
      } @catch (NSException *exception) {
        rejecter(@"DISABLE_NETWORK_HOOK_ERROR", exception.reason, nil);
      } @catch (...) {
        rejecter(@"DISABLE_NETWORK_HOOK_ERROR", @"Unknown error / 알 수 없는 오류", nil);
      }
    });
  } else {
    rejecter(@"NO_RUNTIME_EXECUTOR", @"Runtime executor is not available / Runtime executor를 사용할 수 없습니다", nil);
  }
#else
  rejecter(@"NOT_AVAILABLE", @"Network hook is not available / 네트워크 훅을 사용할 수 없습니다", nil);
#endif
}

/**
 * Check if console hook is enabled / console 훅이 활성화되어 있는지 확인
 */
RCT_EXPORT_METHOD(isConsoleHookEnabled:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter) {
#ifdef CONSOLE_HOOK_AVAILABLE
  bool enabled = chrome_remote_devtools::isConsoleHookEnabled();
  resolver(@(enabled));
#else
  resolver(@(false));
#endif
}

/**
 * Check if network hook is enabled / 네트워크 훅이 활성화되어 있는지 확인
 */
RCT_EXPORT_METHOD(isNetworkHookEnabled:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter) {
#ifdef NETWORK_HOOK_AVAILABLE
  bool enabled = chrome_remote_devtools::isNetworkHookEnabled();
  resolver(@(enabled));
#else
  resolver(@(false));
#endif
}

@end

#endif

