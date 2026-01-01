/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Modified for Chrome Remote DevTools / Chrome Remote DevTools용으로 수정됨
 */

#import <React/RCTDefines.h>

#if RCT_DEV || RCT_REMOTE_PROFILE

#import <jsinspector-modern/InspectorPackagerConnection.h>
#import <memory>
#import <string>

/**
 * Chrome Remote DevTools Inspector WebSocket Adapter / Chrome Remote DevTools Inspector WebSocket 어댑터
 * Adapter between C++ InspectorPackagerConnection and Objective-C WebSocket / C++ InspectorPackagerConnection과 Objective-C WebSocket 간의 어댑터
 */
@interface ChromeRemoteDevToolsInspectorWebSocketAdapter : NSObject
- (instancetype)initWithURL:(const std::string &)url
                   delegate:(std::weak_ptr<facebook::react::jsinspector_modern::IWebSocketDelegate>)delegate;
- (void)send:(std::string_view)message;
- (void)close;
@end

#endif

