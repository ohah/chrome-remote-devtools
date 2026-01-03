/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Modified for Chrome Remote DevTools / Chrome Remote DevTools용으로 수정됨
 */

#import "ChromeRemoteDevToolsNetworkHook.h"

#if RCT_DEV || RCT_REMOTE_PROFILE

#import <Foundation/Foundation.h>
#import "ChromeRemoteDevToolsInspector.h"

// Network hook state / 네트워크 훅 상태
static BOOL g_networkHookEnabled = NO;
static NSString *g_serverHost = nil;
static NSInteger g_serverPort = 0;
static NSUInteger g_requestIdCounter = 0;
static NSMutableDictionary<NSString *, NSDictionary *> *g_requestMetadata = nil;

// Protocol property key for marking requests / 요청을 표시하기 위한 프로토콜 속성 키
static NSString * const kChromeRemoteDevToolsProtocolKey = @"ChromeRemoteDevToolsProtocol";

/**
 * Get timestamp in seconds / 초 단위 타임스탬프 가져오기
 */
static double getTimestamp() {
  return [[NSDate date] timeIntervalSince1970];
}

/**
 * Format headers dictionary to CDP format / 헤더 딕셔너리를 CDP 형식으로 포맷팅
 * Use original header name (CDP accepts any case) / 원본 헤더 이름 사용 (CDP는 모든 대소문자 허용)
 * Note: Some CDP implementations expect Title-Case, but we keep original for compatibility / 참고: 일부 CDP 구현은 Title-Case를 기대하지만 호환성을 위해 원본 유지
 */
static NSDictionary<NSString *, NSString *> *formatHeaders(NSDictionary<NSString *, NSString *> *headers) {
  NSMutableDictionary<NSString *, NSString *> *formatted = [NSMutableDictionary dictionary];
  for (NSString *key in headers) {
    // Use original header name as-is / 원본 헤더 이름을 그대로 사용
    // CDP accepts headers in any case format / CDP는 모든 대소문자 형식의 헤더를 허용합니다
    formatted[key] = headers[key];
  }
  return formatted;
}

/**
 * Format response headers to CDP format / 응답 헤더를 CDP 형식으로 포맷팅
 */
static NSDictionary<NSString *, NSString *> *formatResponseHeaders(NSHTTPURLResponse *response) {
  NSMutableDictionary<NSString *, NSString *> *headers = [NSMutableDictionary dictionary];

  // Extract all header fields from response / 응답에서 모든 헤더 필드 추출
  // Note: NSHTTPURLResponse.allHeaderFields returns a dictionary where keys are case-insensitive / 참고: NSHTTPURLResponse.allHeaderFields는 대소문자를 구분하지 않는 딕셔너리를 반환합니다
  NSDictionary *allHeaderFields = response.allHeaderFields;

  // Extract headers from allHeaderFields / allHeaderFields에서 헤더 추출
  if (allHeaderFields && allHeaderFields.count > 0) {
    [allHeaderFields enumerateKeysAndObjectsUsingBlock:^(id key, id obj, BOOL *stop) {
      // Convert key to string / 키를 문자열로 변환
      NSString *headerKey = nil;
      if ([key isKindOfClass:[NSString class]]) {
        headerKey = (NSString *)key;
      } else {
        headerKey = [key description];
      }

      // Skip if key is empty / 키가 비어있으면 건너뛰기
      if (!headerKey || headerKey.length == 0) {
        return;
      }

      // Convert value to string / 값을 문자열로 변환
      NSString *headerValue = nil;
      if ([obj isKindOfClass:[NSString class]]) {
        headerValue = (NSString *)obj;
      } else if ([obj isKindOfClass:[NSArray class]]) {
        // Some headers can be arrays (e.g., Set-Cookie) / 일부 헤더는 배열일 수 있음 (예: Set-Cookie)
        NSArray *valueArray = (NSArray *)obj;
        if (valueArray.count > 0) {
          NSMutableArray<NSString *> *stringValues = [NSMutableArray array];
          for (id item in valueArray) {
            if ([item isKindOfClass:[NSString class]]) {
              [stringValues addObject:(NSString *)item];
            } else {
              [stringValues addObject:[item description]];
            }
          }
          headerValue = [stringValues componentsJoinedByString:@", "];
        } else {
          headerValue = @"";
        }
      } else if (obj) {
        headerValue = [obj description];
      } else {
        headerValue = @"";
      }

      // Add header if both key and value are valid / 키와 값이 모두 유효하면 헤더 추가
      // Note: We include headers even if value is empty string, as some headers might have empty values / 참고: 값이 빈 문자열이어도 헤더를 포함합니다 (일부 헤더는 빈 값을 가질 수 있음)
      if (headerKey) {
        headers[headerKey] = headerValue ?: @"";
      }
    }];
  }

  // Format headers (keep original names as-is) / 헤더 포맷팅 (원본 이름 그대로 유지)
  NSDictionary<NSString *, NSString *> *formatted = formatHeaders(headers);

  // Always return a dictionary, never nil / 항상 딕셔너리를 반환하고 nil을 반환하지 않음
  return formatted ?: @{};
}

/**
 * Send CDP network event / CDP 네트워크 이벤트 전송
 */
static void sendCDPNetworkEvent(NSDictionary *event) {
  if (!g_networkHookEnabled || !g_serverHost) {
    return;
  }

  NSError *error = nil;
  NSData *jsonData = [NSJSONSerialization dataWithJSONObject:event options:0 error:&error];
  if (jsonData && !error) {
    NSString *jsonString = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
    if (jsonString) {
      [ChromeRemoteDevToolsInspectorObjC sendCDPMessageWithServerHost:g_serverHost
                                                            serverPort:g_serverPort
                                                               message:jsonString];
    }
  } else if (error) {
    // Log JSON serialization error for debugging / 디버깅을 위해 JSON 직렬화 오류 로그
    // Note: This helps identify issues with header serialization / 참고: 헤더 직렬화 문제를 식별하는 데 도움이 됩니다
    // NSLog(@"JSON serialization error: %@", error.localizedDescription);
  }
}

/**
 * Send Network.requestWillBeSent event / Network.requestWillBeSent 이벤트 전송
 */
static void sendRequestWillBeSent(NSURLRequest *request, NSString *requestId) {
  // Get request headers / 요청 헤더 가져오기
  NSDictionary<NSString *, NSString *> *headers = formatHeaders(request.allHTTPHeaderFields ?: @{});

  // Get request body / 요청 본문 가져오기
  NSString *postData = nil;
  if (request.HTTPBody) {
    postData = [[NSString alloc] initWithData:request.HTTPBody encoding:NSUTF8StringEncoding];
  } else if (request.HTTPBodyStream) {
    // For stream-based body, we can't easily read it without consuming it / 스트림 기반 본문의 경우 소비하지 않고는 쉽게 읽을 수 없음
    postData = nil;
  }

  NSDictionary *event = @{
    @"method": @"Network.requestWillBeSent",
    @"params": @{
      @"requestId": requestId,
      @"loaderId": requestId,
      @"documentURL": request.URL.absoluteString ?: @"",
      @"request": @{
        @"url": request.URL.absoluteString ?: @"",
        @"method": request.HTTPMethod ?: @"GET",
        @"headers": headers,
        @"postData": postData ?: [NSNull null]
      },
      @"timestamp": @(getTimestamp()),
      @"type": @"Other"
    }
  };

  // Store request metadata / 요청 메타데이터 저장
  if (!g_requestMetadata) {
    g_requestMetadata = [NSMutableDictionary dictionary];
  }
  g_requestMetadata[requestId] = @{
    @"url": request.URL.absoluteString ?: @"",
    @"method": request.HTTPMethod ?: @"GET"
  };

  sendCDPNetworkEvent(event);
}

/**
 * Send Network.responseReceived event / Network.responseReceived 이벤트 전송
 * @param request Original request / 원본 요청
 * @param response HTTP response / HTTP 응답
 * @param requestId Request ID / 요청 ID
 * @param data Response data (optional) / 응답 데이터 (선택사항)
 */
static void sendResponseReceived(NSURLRequest *request, NSHTTPURLResponse *response, NSString *requestId, NSData *data) {
  // Format response headers / 응답 헤더 포맷팅
  NSDictionary<NSString *, NSString *> *headers = formatResponseHeaders(response);

  // Ensure headers is not nil and is a valid dictionary / 헤더가 nil이 아니고 유효한 딕셔너리인지 확인
  if (!headers || ![headers isKindOfClass:[NSDictionary class]]) {
    headers = @{};
  }

  // Get Content-Type header / Content-Type 헤더 가져오기
  NSString *contentType = nil;
  NSDictionary *allHeaderFields = response.allHeaderFields;
  if (allHeaderFields && allHeaderFields.count > 0) {
    for (id key in allHeaderFields) {
      NSString *keyString = [key isKindOfClass:[NSString class]] ? key : [key description];
      if (keyString && [keyString caseInsensitiveCompare:@"Content-Type"] == NSOrderedSame) {
        id value = allHeaderFields[key];
        if ([value isKindOfClass:[NSString class]]) {
          contentType = (NSString *)value;
        } else if ([value isKindOfClass:[NSArray class]]) {
          NSArray *valueArray = (NSArray *)value;
          if (valueArray.count > 0) {
            contentType = [valueArray.firstObject isKindOfClass:[NSString class]]
              ? (NSString *)valueArray.firstObject
              : [valueArray.firstObject description];
          }
        } else if (value) {
          contentType = [value description];
        }
        break;
      }
    }
  }

  // Extract MIME type from Content-Type header (e.g., "text/html; charset=utf-8" -> "text/html") / Content-Type 헤더에서 MIME 타입 추출 (예: "text/html; charset=utf-8" -> "text/html")
  NSString *mimeType = @"text/plain";
  if (contentType) {
    NSArray<NSString *> *mimeTypeParts = [contentType componentsSeparatedByString:@";"];
    mimeType = [mimeTypeParts.firstObject stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceCharacterSet]];
  }

  // Build response object with all required fields / 모든 필수 필드가 포함된 응답 객체 생성
  // Ensure headers is always a dictionary, never nil / 헤더가 항상 딕셔너리이고 nil이 아닌지 확인
  NSDictionary<NSString *, NSString *> *safeHeaders = headers ?: @{};

  // Verify headers is a valid dictionary for JSON serialization / JSON 직렬화를 위해 헤더가 유효한 딕셔너리인지 확인
  if (![safeHeaders isKindOfClass:[NSDictionary class]]) {
    safeHeaders = @{};
  }

  // Create response object with headers / 헤더가 포함된 응답 객체 생성
  NSMutableDictionary *responseObj = [NSMutableDictionary dictionary];
  responseObj[@"url"] = request.URL.absoluteString ?: @"";
  responseObj[@"status"] = @(response.statusCode);
  responseObj[@"statusText"] = [NSHTTPURLResponse localizedStringForStatusCode:response.statusCode];
  responseObj[@"headers"] = safeHeaders;
  responseObj[@"mimeType"] = mimeType;

  // Include response body for preview (only for text-based content types) / 프리뷰를 위해 응답 본문 포함 (텍스트 기반 콘텐츠 타입만)
  if (data && data.length > 0) {
    NSString *mimeTypeLower = mimeType.lowercaseString;
    // Only include body for text-based content types / 텍스트 기반 콘텐츠 타입만 본문 포함
    if ([mimeTypeLower hasPrefix:@"text/"] ||
        [mimeTypeLower containsString:@"json"] ||
        [mimeTypeLower containsString:@"xml"] ||
        [mimeTypeLower containsString:@"javascript"] ||
        [mimeTypeLower isEqualToString:@"application/json"] ||
        [mimeTypeLower isEqualToString:@"application/xml"]) {
      NSString *responseBody = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
      if (responseBody) {
        responseObj[@"body"] = responseBody;
      } else {
        // Try with different encodings if UTF-8 fails / UTF-8이 실패하면 다른 인코딩 시도
        responseBody = [[NSString alloc] initWithData:data encoding:NSASCIIStringEncoding];
        if (responseBody) {
          responseObj[@"body"] = responseBody;
        } else {
          responseObj[@"body"] = [NSNull null];
        }
      }
    } else {
      responseObj[@"body"] = [NSNull null];
    }
  } else {
    responseObj[@"body"] = [NSNull null];
  }

  NSDictionary *event = @{
    @"method": @"Network.responseReceived",
    @"params": @{
      @"requestId": requestId,
      @"loaderId": requestId,
      @"timestamp": @(getTimestamp()),
      @"type": @"Other",
      @"response": responseObj
    }
  };

  sendCDPNetworkEvent(event);
}

/**
 * Send Network.loadingFinished event / Network.loadingFinished 이벤트 전송
 */
static void sendLoadingFinished(NSString *requestId, NSInteger dataLength) {
  NSDictionary *event = @{
    @"method": @"Network.loadingFinished",
    @"params": @{
      @"requestId": requestId,
      @"timestamp": @(getTimestamp()),
      @"encodedDataLength": @(dataLength)
    }
  };

  sendCDPNetworkEvent(event);

  // Clean up request metadata / 요청 메타데이터 정리
  if (g_requestMetadata) {
    [g_requestMetadata removeObjectForKey:requestId];
  }
}

/**
 * Send Network.loadingFailed event / Network.loadingFailed 이벤트 전송
 */
static void sendLoadingFailed(NSString *requestId, NSError *error) {
  NSDictionary *event = @{
    @"method": @"Network.loadingFailed",
    @"params": @{
      @"requestId": requestId,
      @"timestamp": @(getTimestamp()),
      @"errorText": error.localizedDescription ?: @"Network error",
      @"canceled": @NO
    }
  };

  sendCDPNetworkEvent(event);

  // Clean up request metadata / 요청 메타데이터 정리
  if (g_requestMetadata) {
    [g_requestMetadata removeObjectForKey:requestId];
  }
}

/**
 * NSURLProtocol implementation for intercepting network requests / 네트워크 요청을 가로채기 위한 NSURLProtocol 구현
 */
@interface ChromeRemoteDevToolsURLProtocol : NSURLProtocol

@end

@implementation ChromeRemoteDevToolsURLProtocol

+ (BOOL)canInitWithRequest:(NSURLRequest *)request {
  // Only intercept if enabled and not already marked / 활성화되어 있고 아직 표시되지 않은 경우에만 가로채기
  if (!g_networkHookEnabled) {
    return NO;
  }

  // Don't intercept our own protocol requests / 우리 자신의 프로토콜 요청은 가로채지 않음
  if ([self propertyForKey:kChromeRemoteDevToolsProtocolKey inRequest:request] != nil) {
    return NO;
  }

  // Intercept HTTP and HTTPS requests / HTTP 및 HTTPS 요청 가로채기
  NSString *scheme = request.URL.scheme.lowercaseString;
  return [scheme isEqualToString:@"http"] || [scheme isEqualToString:@"https"];
}

+ (NSURLRequest *)canonicalRequestForRequest:(NSURLRequest *)request {
  return request;
}

+ (BOOL)requestIsCacheEquivalent:(NSURLRequest *)a toRequest:(NSURLRequest *)b {
  return [super requestIsCacheEquivalent:a toRequest:b];
}

- (void)startLoading {
  NSURLRequest *request = self.request;

  // Generate unique request ID / 고유 요청 ID 생성
  NSString *requestId = [NSString stringWithFormat:@"%lu", (unsigned long)++g_requestIdCounter];

  // Mark request to avoid infinite loop / 무한 루프를 피하기 위해 요청 표시
  NSMutableURLRequest *mutableRequest = [request mutableCopy];
  [NSURLProtocol setProperty:@YES forKey:kChromeRemoteDevToolsProtocolKey inRequest:mutableRequest];

  // Send requestWillBeSent event / requestWillBeSent 이벤트 전송
  sendRequestWillBeSent(mutableRequest, requestId);

  // Create session configuration / 세션 구성 생성
  NSURLSessionConfiguration *config = [NSURLSessionConfiguration defaultSessionConfiguration];
  NSURLSession *session = [NSURLSession sessionWithConfiguration:config];

  // Create data task / 데이터 작업 생성
  NSURLSessionDataTask *task = [session dataTaskWithRequest:mutableRequest
                                            completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
    if (error) {
      // Send loadingFailed event / loadingFailed 이벤트 전송
      sendLoadingFailed(requestId, error);

      // Notify client of error / 클라이언트에 오류 알림
      [self.client URLProtocol:self didFailWithError:error];
    } else if ([response isKindOfClass:[NSHTTPURLResponse class]]) {
      NSHTTPURLResponse *httpResponse = (NSHTTPURLResponse *)response;

      // Send responseReceived event with response data / 응답 데이터와 함께 responseReceived 이벤트 전송
      sendResponseReceived(mutableRequest, httpResponse, requestId, data);

      // Send loadingFinished event / loadingFinished 이벤트 전송
      NSInteger dataLength = data ? data.length : 0;
      sendLoadingFinished(requestId, dataLength);

      // Notify client of response / 클라이언트에 응답 알림
      [self.client URLProtocol:self didReceiveResponse:httpResponse cacheStoragePolicy:NSURLCacheStorageNotAllowed];

      if (data && data.length > 0) {
        [self.client URLProtocol:self didLoadData:data];
      }

      [self.client URLProtocolDidFinishLoading:self];
    } else {
      // Non-HTTP response / 비-HTTP 응답
      [self.client URLProtocol:self didReceiveResponse:response cacheStoragePolicy:NSURLCacheStorageNotAllowed];

      if (data && data.length > 0) {
        [self.client URLProtocol:self didLoadData:data];
      }

      [self.client URLProtocolDidFinishLoading:self];
    }
  }];

  [task resume];
}

- (void)stopLoading {
  // Cancel any ongoing tasks / 진행 중인 작업 취소
  // Note: We don't store task reference, so we can't cancel it directly / 참고: 작업 참조를 저장하지 않으므로 직접 취소할 수 없음
  // This is acceptable as most requests complete quickly / 대부분의 요청이 빠르게 완료되므로 허용 가능합니다
}

@end

@implementation ChromeRemoteDevToolsNetworkHook

+ (void)enableWithServerHost:(NSString *)serverHost serverPort:(NSInteger)serverPort
{
  if (g_networkHookEnabled) {
    return; // Already enabled / 이미 활성화됨
  }

  g_serverHost = serverHost;
  g_serverPort = serverPort;
  g_requestIdCounter = 0;
  g_requestMetadata = [NSMutableDictionary dictionary];

  // Register NSURLProtocol / NSURLProtocol 등록
  [NSURLProtocol registerClass:[ChromeRemoteDevToolsURLProtocol class]];

  g_networkHookEnabled = YES;
}

+ (void)disable
{
  if (!g_networkHookEnabled) {
    return; // Already disabled / 이미 비활성화됨
  }

  // Unregister NSURLProtocol / NSURLProtocol 등록 해제
  [NSURLProtocol unregisterClass:[ChromeRemoteDevToolsURLProtocol class]];

  g_networkHookEnabled = NO;
  g_serverHost = nil;
  g_serverPort = 0;
  g_requestMetadata = nil;
}

+ (BOOL)isEnabled
{
  return g_networkHookEnabled;
}

@end

#endif
