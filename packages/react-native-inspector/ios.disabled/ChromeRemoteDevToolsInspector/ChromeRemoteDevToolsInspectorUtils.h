/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Modified for Chrome Remote DevTools / Chrome Remote DevTools용으로 수정됨
 */

#import <Foundation/Foundation.h>

// This is a subset of jsinspector_modern::HostTargetMetadata with ObjC types,
// containing the members implemented by getHostMetadata.
// 이것은 ObjC 타입을 가진 jsinspector_modern::HostTargetMetadata의 하위 집합으로,
// getHostMetadata에 의해 구현된 멤버를 포함합니다.
// Renamed to avoid conflict with React Native's CommonHostMetadata / React Native의 CommonHostMetadata와 충돌을 피하기 위해 이름 변경
@interface ChromeRemoteDevToolsHostMetadata : NSObject

@property (nonatomic, strong) NSString *appDisplayName;
@property (nonatomic, strong) NSString *appIdentifier;
@property (nonatomic, strong) NSString *deviceName;
@property (nonatomic, strong) NSString *platform;
@property (nonatomic, strong) NSString *reactNativeVersion;

@end

/**
 * Chrome Remote DevTools Inspector Utils / Chrome Remote DevTools Inspector 유틸리티
 */
@interface ChromeRemoteDevToolsInspectorUtils : NSObject

+ (ChromeRemoteDevToolsHostMetadata *)getHostMetadata;

@end

