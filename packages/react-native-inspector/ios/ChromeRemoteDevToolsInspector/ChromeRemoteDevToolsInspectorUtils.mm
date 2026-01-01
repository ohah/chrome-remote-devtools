/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Modified for Chrome Remote DevTools / Chrome Remote DevTools용으로 수정됨
 */

#import "ChromeRemoteDevToolsInspectorUtils.h"

#import <React/RCTConstants.h>
#import <React/RCTVersion.h>
#import <UIKit/UIKit.h>

@implementation ChromeRemoteDevToolsHostMetadata
@end

@implementation ChromeRemoteDevToolsInspectorUtils

+ (ChromeRemoteDevToolsHostMetadata *)getHostMetadata
{
#if TARGET_OS_IPHONE
  UIDevice *device = [UIDevice currentDevice];
  NSString *deviceName = [device name];
#else
  // macOS does not support UIDevice. Use System Configuration. This API
  // returns a nullable value, but is non-blocking (compared with
  // `[NSHost currentHost]`) and is ideal since deviceName is optional.
  // macOS는 UIDevice를 지원하지 않습니다. System Configuration을 사용합니다.
  // 이 API는 nullable 값을 반환하지만 비차단적이며(compared with `[NSHost currentHost]`),
  // deviceName이 선택적이므로 이상적입니다.
  NSString *deviceName = (__bridge NSString *)SCDynamicStoreCopyComputerName(nil, nil);
#endif // TARGET_OS_IPHONE

  auto version = RCTGetReactNativeVersion();

  ChromeRemoteDevToolsHostMetadata *metadata = [[ChromeRemoteDevToolsHostMetadata alloc] init];

  metadata.appDisplayName = [[[NSBundle mainBundle] infoDictionary] objectForKey:(NSString *)kCFBundleNameKey];
  metadata.appIdentifier = [[NSBundle mainBundle] bundleIdentifier];
  metadata.platform = RCTPlatformName;
  metadata.deviceName = deviceName;
  metadata.reactNativeVersion = [NSString stringWithFormat:@"%i.%i.%i%@",
                                                           [version[@"major"] intValue],
                                                           [version[@"minor"] intValue],
                                                           [version[@"patch"] intValue],
                                                           [version[@"prerelease"] isKindOfClass:[NSNull class]]
                                                               ? @""
                                                               : [@"-" stringByAppendingString:version[@"prerelease"]]];

  return metadata;
}

@end

