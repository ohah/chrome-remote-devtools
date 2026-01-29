/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Modified for Chrome Remote DevTools / Chrome Remote DevTools용으로 수정됨
 */

#import <Foundation/Foundation.h>
#import <React/RCTDefines.h>

#if RCT_DEV || RCT_REMOTE_PROFILE

/**
 * Inspector Packager Connection Protocol / Inspector Packager 연결 프로토콜
 */
@protocol ChromeRemoteDevToolsInspectorPackagerConnectionProtocol <NSObject>
- (instancetype)initWithURL:(NSURL *)url;

- (bool)isConnected;
- (void)connect;
- (void)closeQuietly;
- (void)sendEventToAllConnections:(NSString *)event;
- (void)sendCDPMessage:(NSString *)message;

@optional
- (void)enableReconnection;
- (void)disableReconnection;
- (void)reconnect;
@end

/**
 * Chrome Remote DevTools Inspector Packager Connection / Chrome Remote DevTools Inspector Packager 연결
 */
@interface ChromeRemoteDevToolsInspectorPackagerConnection : NSObject <ChromeRemoteDevToolsInspectorPackagerConnectionProtocol>
@end

#endif

