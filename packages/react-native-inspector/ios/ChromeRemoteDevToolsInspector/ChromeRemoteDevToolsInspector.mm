/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Modified for Chrome Remote DevTools / Chrome Remote DevTools용으로 수정됨
 */

#import "ChromeRemoteDevToolsInspector.h"

#if RCT_DEV || RCT_REMOTE_PROFILE

#import <React/RCTLog.h>
#import <UIKit/UIKit.h>

#import "ChromeRemoteDevToolsInspectorPackagerConnection.h"
#import <React/RCTDefines.h>

#import <CommonCrypto/CommonCrypto.h>
#import <jsinspector-modern/InspectorFlags.h>

static NSString *const kDebuggerMsgDisable = @"{ \"id\":1,\"method\":\"Debugger.disable\" }";

/**
 * Get server host and port from custom configuration / 커스텀 설정에서 서버 호스트와 포트 가져오기
 * @param serverHost Server host / 서버 호스트
 * @param serverPort Server port / 서버 포트
 * @return Server host:port string / 서버 호스트:포트 문자열
 */
static NSString *getServerHost(NSString *serverHost, NSInteger serverPort)
{
  // Use provided server host and port / 제공된 서버 호스트와 포트 사용
  return [NSString stringWithFormat:@"%@:%ld", serverHost, (long)serverPort];
}

/**
 * Get SHA256 hash of string / 문자열의 SHA256 해시 가져오기
 * @param string Input string / 입력 문자열
 * @return SHA256 hash string / SHA256 해시 문자열
 */
static NSString *getSHA256(NSString *string)
{
  const char *str = string.UTF8String;
  unsigned char result[CC_SHA256_DIGEST_LENGTH];
  CC_SHA256(str, (CC_LONG)strlen(str), result);

  return [NSString stringWithFormat:@"%02x%02x%02x%02x%02x%02x%02x%02x%02x%02x%02x%02x%02x%02x%02x%02x%02x%02x%02x%02x",
                                    result[0],
                                    result[1],
                                    result[2],
                                    result[3],
                                    result[4],
                                    result[5],
                                    result[6],
                                    result[7],
                                    result[8],
                                    result[9],
                                    result[10],
                                    result[11],
                                    result[12],
                                    result[13],
                                    result[14],
                                    result[15],
                                    result[16],
                                    result[17],
                                    result[18],
                                    result[19]];
}

/**
 * Get Inspector device ID / Inspector 디바이스 ID 가져오기
 * Returns an opaque ID which is stable for the current combination of device and app / 디바이스와 앱의 현재 조합에 대해 안정적인 불투명 ID 반환
 * @return Device ID string / 디바이스 ID 문자열
 */
static NSString *getInspectorDeviceId()
{
  // A bundle ID uniquely identifies a single app throughout the system / 번들 ID는 시스템 전체에서 단일 앱을 고유하게 식별합니다
  NSString *bundleId = [[NSBundle mainBundle] bundleIdentifier];

#if TARGET_OS_IPHONE
  // An alphanumeric string that uniquely identifies a device to the app's vendor / 앱 공급업체에 디바이스를 고유하게 식별하는 영숫자 문자열
  NSString *identifierForVendor = [[UIDevice currentDevice] identifierForVendor].UUIDString;
#else
  // macOS does not support UIDevice. Use an empty string / macOS는 UIDevice를 지원하지 않습니다. 빈 문자열 사용
  NSString *identifierForVendor = @"";
#endif

  auto &inspectorFlags = facebook::react::jsinspector_modern::InspectorFlags::getInstance();

  NSString *rawDeviceId = [NSString stringWithFormat:@"apple-%@-%@-%s",
                                                     identifierForVendor,
                                                     bundleId,
                                                     inspectorFlags.getFuseboxEnabled() ? "fusebox" : "legacy"];

  return getSHA256(rawDeviceId);
}

/**
 * Get Inspector device URL / Inspector 디바이스 URL 가져오기
 * @param serverHost Server host / 서버 호스트
 * @param serverPort Server port / 서버 포트
 * @return Inspector device URL / Inspector 디바이스 URL
 */
static NSURL *getInspectorDeviceUrl(NSString *serverHost, NSInteger serverPort)
{
  NSString *escapedDeviceName = [[[UIDevice currentDevice] name]
      stringByAddingPercentEncodingWithAllowedCharacters:NSCharacterSet.URLQueryAllowedCharacterSet];
  NSString *escapedAppName = [[[NSBundle mainBundle] bundleIdentifier]
      stringByAddingPercentEncodingWithAllowedCharacters:NSCharacterSet.URLQueryAllowedCharacterSet];

  NSString *escapedInspectorDeviceId = [getInspectorDeviceId()
      stringByAddingPercentEncodingWithAllowedCharacters:NSCharacterSet.URLQueryAllowedCharacterSet];

  // Use WebSocket URL (ws://) instead of HTTP / HTTP 대신 WebSocket URL (ws://) 사용
  return [NSURL
      URLWithString:[NSString stringWithFormat:@"ws://%@/remote/debug/inspector/device?name=%@&app=%@&device=%@",
                                               getServerHost(serverHost, serverPort),
                                               escapedDeviceName,
                                               escapedAppName,
                                               escapedInspectorDeviceId]];
}

@implementation ChromeRemoteDevToolsInspectorObjC

RCT_NOT_IMPLEMENTED(-(instancetype)init)

static NSMutableDictionary<NSString *, id<ChromeRemoteDevToolsInspectorPackagerConnectionProtocol>> *socketConnections = nil;

static void sendEventToAllConnections(NSString *event)
{
  for (NSString *socketId in socketConnections) {
    [socketConnections[socketId] sendEventToAllConnections:event];
  }
}

+ (BOOL)isPackagerDisconnected
{
  for (NSString *socketId in socketConnections) {
    if ([socketConnections[socketId] isConnected]) {
      return false;
    }
  }

  return true;
}

+ (void)openDebuggerWithServerHost:(NSString *)serverHost
                         serverPort:(NSInteger)serverPort
                       errorMessage:(NSString *)errorMessage
{
  NSString *escapedInspectorDeviceId = [getInspectorDeviceId()
      stringByAddingPercentEncodingWithAllowedCharacters:NSCharacterSet.URLQueryAllowedCharacterSet];

  // Use HTTP URL for open-debugger endpoint / open-debugger 엔드포인트에는 HTTP URL 사용
  NSURL *url = [NSURL URLWithString:[NSString stringWithFormat:@"http://%@/open-debugger?device=%@",
                                                               getServerHost(serverHost, serverPort),
                                                               escapedInspectorDeviceId]];
  NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:url];
  [request setHTTPMethod:@"POST"];

  [[[NSURLSession sharedSession]
      dataTaskWithRequest:request
        completionHandler:^(
            __unused NSData *_Nullable data, __unused NSURLResponse *_Nullable response, NSError *_Nullable error) {
          if (error != nullptr) {
            RCTLogWarn(@"%@", errorMessage);
          }
        }] resume];
}

+ (void)disableDebugger
{
  auto &inspectorFlags = facebook::react::jsinspector_modern::InspectorFlags::getInstance();
  if (!inspectorFlags.getFuseboxEnabled()) {
    sendEventToAllConnections(kDebuggerMsgDisable);
  }
}

+ (id<ChromeRemoteDevToolsInspectorPackagerConnectionProtocol>)connectWithServerHost:(NSString *)serverHost
                                                                           serverPort:(NSInteger)serverPort
{
  NSURL *inspectorURL = getInspectorDeviceUrl(serverHost, serverPort);

  // Note, using a static dictionary isn't really the greatest design, but
  // the packager connection does the same thing, so it's at least consistent.
  // This is a static map that holds different inspector clients per the inspectorURL
  // 참고: 정적 딕셔너리를 사용하는 것은 최선의 디자인은 아니지만,
  // packager connection도 동일한 방식을 사용하므로 일관성은 있습니다.
  // 이것은 inspectorURL별로 다른 inspector 클라이언트를 보관하는 정적 맵입니다
  if (socketConnections == nil) {
    socketConnections = [NSMutableDictionary new];
  }

 NSString *key = [inspectorURL absoluteString];
  id<ChromeRemoteDevToolsInspectorPackagerConnectionProtocol> connection = socketConnections[key];
  if ((connection == nullptr) || !connection.isConnected) {
    connection = [[ChromeRemoteDevToolsInspectorPackagerConnection alloc] initWithURL:inspectorURL];

    socketConnections[key] = connection;
    // Enable automatic reconnection / 자동 재연결 활성화
    if ([connection respondsToSelector:@selector(enableReconnection)]) {
      [connection enableReconnection];
    }
    [connection connect];
  }

  return connection;
}

+ (void)reconnectAllWithServerHost:(NSString *)serverHost serverPort:(NSInteger)serverPort
{
  RCTLogInfo(@"[ChromeRemoteDevTools] Reconnecting all connections / 모든 연결 재연결 중");
  NSURL *inspectorURL = getInspectorDeviceUrl(serverHost, serverPort);
  NSString *key = [inspectorURL absoluteString];
  id<ChromeRemoteDevToolsInspectorPackagerConnectionProtocol> connection = socketConnections[key];

  if (connection && !connection.isConnected) {
    RCTLogInfo(@"[ChromeRemoteDevTools] Reconnecting to %@ / %@에 재연결 중", key);
    if ([connection respondsToSelector:@selector(reconnect)]) {
      [connection reconnect];
    } else {
      [connection connect];
    }
  } else if (connection == nullptr) {
    // Connection doesn't exist, create new one / 연결이 존재하지 않으면 새로 생성
    RCTLogInfo(@"[ChromeRemoteDevTools] Connection not found, creating new connection / 연결을 찾을 수 없어 새 연결 생성");
    [self connectWithServerHost:serverHost serverPort:serverPort];
  }
}

+ (void)sendCDPMessageWithServerHost:(NSString *)serverHost
                           serverPort:(NSInteger)serverPort
                              message:(NSString *)message
{
  NSURL *inspectorURL = getInspectorDeviceUrl(serverHost, serverPort);
  NSString *key = [inspectorURL absoluteString];
  id<ChromeRemoteDevToolsInspectorPackagerConnectionProtocol> connection = socketConnections[key];

  if (connection && connection.isConnected) {
    // Send CDP message through InspectorPackagerConnection / InspectorPackagerConnection을 통해 CDP 메시지 전송
    if ([connection respondsToSelector:@selector(sendCDPMessage:)]) {
      [connection sendCDPMessage:message];
    } else {
      // Fallback: use sendEventToAllConnections (may not work for CDP) / 폴백: sendEventToAllConnections 사용 (CDP에 작동하지 않을 수 있음)
      [connection sendEventToAllConnections:message];
    }
  }
}

@end

#endif

