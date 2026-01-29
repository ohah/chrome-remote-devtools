/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Modified for Chrome Remote DevTools / Chrome Remote DevTools용으로 수정됨
 */

#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>

#if RCT_DEV || RCT_REMOTE_PROFILE

#import "ChromeRemoteDevToolsInspectorPackagerConnection.h"

NS_ASSUME_NONNULL_BEGIN

/**
 * Chrome Remote DevTools Inspector Helper (Objective-C++ implementation) / Chrome Remote DevTools Inspector 헬퍼 (Objective-C++ 구현)
 * Custom Inspector connection that connects to Chrome Remote DevTools server / Chrome Remote DevTools 서버에 연결하는 커스텀 Inspector 연결
 *
 * Note: Use ChromeRemoteDevToolsInspector Swift class for Swift code / 참고: Swift 코드에서는 ChromeRemoteDevToolsInspector Swift 클래스를 사용하세요
 */
@interface ChromeRemoteDevToolsInspectorObjC : NSObject

/**
 * Connect to Chrome Remote DevTools server / Chrome Remote DevTools 서버에 연결
 * @param serverHost Server host (e.g., "localhost" or "192.168.1.100") / 서버 호스트 (예: "localhost" 또는 "192.168.1.100")
 * @param serverPort Server port (e.g., 8080) / 서버 포트 (예: 8080)
 * @return Inspector packager connection / Inspector packager 연결
 */
+ (id<ChromeRemoteDevToolsInspectorPackagerConnectionProtocol>)connectWithServerHost:(NSString *)serverHost
                                                                           serverPort:(NSInteger)serverPort;

/**
 * Disable debugger / 디버거 비활성화
 */
+ (void)disableDebugger;

/**
 * Check if packager is disconnected / Packager 연결이 끊어졌는지 확인
 * @return YES if disconnected / 연결이 끊어졌으면 YES
 */
+ (BOOL)isPackagerDisconnected;

/**
 * Open debugger / 디버거 열기
 * @param serverHost Server host / 서버 호스트
 * @param serverPort Server port / 서버 포트
 * @param errorMessage Error message to show if failed / 실패 시 표시할 에러 메시지
 */
+ (void)openDebuggerWithServerHost:(NSString *)serverHost
                         serverPort:(NSInteger)serverPort
                       errorMessage:(NSString *)errorMessage;

/**
 * Send CDP message to Inspector WebSocket / Inspector WebSocket으로 CDP 메시지 전송
 * @param serverHost Server host / 서버 호스트
 * @param serverPort Server port / 서버 포트
 * @param message CDP message as JSON string / JSON 문자열로 된 CDP 메시지
 */
+ (void)sendCDPMessageWithServerHost:(NSString *)serverHost
                           serverPort:(NSInteger)serverPort
                              message:(NSString *)message;

/**
 * Reconnect all disconnected connections / 모든 끊어진 연결 재연결
 * @param serverHost Server host / 서버 호스트
 * @param serverPort Server port / 서버 포트
 */
+ (void)reconnectAllWithServerHost:(NSString *)serverHost serverPort:(NSInteger)serverPort;

@end

NS_ASSUME_NONNULL_END

#endif

