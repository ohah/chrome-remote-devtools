/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Modified for Chrome Remote DevTools / Chrome Remote DevTools용으로 수정됨
 */

#import <Foundation/Foundation.h>

#if RCT_DEV || RCT_REMOTE_PROFILE

NS_ASSUME_NONNULL_BEGIN

/**
 * Network hook for intercepting network requests / 네트워크 요청을 가로채기 위한 네트워크 훅
 */
@interface ChromeRemoteDevToolsNetworkHook : NSObject

/**
 * Enable network interception / 네트워크 인터셉션 활성화
 * @param serverHost Server host / 서버 호스트
 * @param serverPort Server port / 서버 포트
 */
+ (void)enableWithServerHost:(NSString *)serverHost serverPort:(NSInteger)serverPort;

/**
 * Disable network interception / 네트워크 인터셉션 비활성화
 */
+ (void)disable;

/**
 * Check if network interception is enabled / 네트워크 인터셉션이 활성화되었는지 확인
 * @return YES if enabled / 활성화되었으면 YES
 */
+ (BOOL)isEnabled;

@end

NS_ASSUME_NONNULL_END

#endif

