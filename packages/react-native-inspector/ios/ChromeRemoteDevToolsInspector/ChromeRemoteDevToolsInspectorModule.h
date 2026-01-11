/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Modified for Chrome Remote DevTools / Chrome Remote DevTools용으로 수정됨
 */

#import <React/RCTBridgeModule.h>

#if RCT_DEV || RCT_REMOTE_PROFILE

// Import TurboModule protocols for JSI Runtime access / JSI Runtime 접근을 위한 TurboModule 프로토콜 import
#import <ReactCommon/RCTTurboModule.h>
#import <ReactCommon/RCTTurboModuleWithJSIBindings.h>

/**
 * TurboModule for Chrome Remote DevTools Inspector / Chrome Remote DevTools Inspector용 TurboModule
 * This allows JavaScript to call native Inspector methods / JavaScript에서 네이티브 Inspector 메서드를 호출할 수 있게 합니다
 *
 * Note: This module uses RCT_EXPORT_MODULE for backward compatibility / 참고: 이 모듈은 하위 호환성을 위해 RCT_EXPORT_MODULE을 사용합니다
 * React Native 0.83+ automatically converts Legacy Modules to TurboModules / React Native 0.83+는 Legacy Module을 자동으로 TurboModule로 변환합니다
 *
 * By implementing RCTTurboModule and RCTTurboModuleWithJSIBindings, we can access JSI Runtime / RCTTurboModule과 RCTTurboModuleWithJSIBindings를 구현하여 JSI Runtime에 접근할 수 있습니다
 * This allows us to use common C++ code for console and network hooking / 이를 통해 console과 network hooking을 위한 공통 C++ 코드를 사용할 수 있습니다
 */
@interface ChromeRemoteDevToolsInspectorModule : NSObject <RCTBridgeModule, RCTTurboModule, RCTTurboModuleWithJSIBindings>

/**
 * Handle CDP message from WebSocket / WebSocket으로부터 CDP 메시지 처리
 * Routes to JavaScript handler based on method name / 메서드 이름을 기준으로 JavaScript 핸들러로 라우팅
 * @param messageJson CDP message as JSON string / JSON 문자열로 된 CDP 메시지
 */
+ (void)handleCDPMessage:(NSString *)messageJson;

/**
 * Set module instance / 모듈 인스턴스 설정
 * @param instance Module instance / 모듈 인스턴스
 */
+ (void)setModuleInstance:(ChromeRemoteDevToolsInspectorModule *)instance;

@end

#endif

