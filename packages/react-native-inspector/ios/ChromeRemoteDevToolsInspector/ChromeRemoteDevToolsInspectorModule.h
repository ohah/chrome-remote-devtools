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

/**
 * TurboModule for Chrome Remote DevTools Inspector / Chrome Remote DevTools Inspector용 TurboModule
 * This allows JavaScript to call native Inspector methods / JavaScript에서 네이티브 Inspector 메서드를 호출할 수 있게 합니다
 *
 * Note: This module uses RCT_EXPORT_MODULE for backward compatibility / 참고: 이 모듈은 하위 호환성을 위해 RCT_EXPORT_MODULE을 사용합니다
 * React Native 0.83+ automatically converts Legacy Modules to TurboModules / React Native 0.83+는 Legacy Module을 자동으로 TurboModule로 변환합니다
 */
@interface ChromeRemoteDevToolsInspectorModule : NSObject <RCTBridgeModule>

@end

#endif

