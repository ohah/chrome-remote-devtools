/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Modified for Chrome Remote DevTools / Chrome Remote DevTools용으로 수정됨
 */

#pragma once

#include <jsi/jsi.h>
#include <vector>
#include <string>

namespace chrome_remote_devtools {

/**
 * Platform-specific callback for sending CDP messages / CDP 메시지 전송을 위한 플랫폼별 콜백
 * Android: JNI를 통해 Kotlin 함수 호출 / Android: JNI를 통해 Kotlin 함수 호출
 * iOS: Objective-C++를 통해 Objective-C 함수 호출 / iOS: Objective-C++를 통해 Objective-C 함수 호출
 * @param serverHost Server host / 서버 호스트
 * @param serverPort Server port / 서버 포트
 * @param message CDP message JSON string / CDP 메시지 JSON 문자열
 */
typedef void (*SendCDPMessageCallback)(const char* serverHost, int serverPort, const char* message);

/**
 * RemoteObject structure for CDP / CDP용 RemoteObject 구조
 */
struct RemoteObject {
  std::string type;
  std::string subtype;  // Optional: "array", "null", "error", etc. / 선택사항: "array", "null", "error" 등
  std::string value;    // For primitive types / 기본 타입용
  std::string description;  // For objects, contains JSON stringified value / 객체의 경우 JSON 문자열화된 값 포함
};

/**
 * Set platform-specific callback for sending CDP messages / CDP 메시지 전송을 위한 플랫폼별 콜백 설정
 * @param callback Callback function / 콜백 함수
 */
void setSendCDPMessageCallback(SendCDPMessageCallback callback);

/**
 * Hook console methods in JSI runtime / JSI 런타임에서 console 메서드 훅
 * @param runtime JSI runtime instance / JSI 런타임 인스턴스
 * @return true if hooking succeeded / 훅이 성공하면 true
 */
bool hookConsoleMethods(facebook::jsi::Runtime& runtime);

/**
 * Enable console hook / console 훅 활성화
 * @param runtime JSI runtime instance / JSI 런타임 인스턴스
 * @return true if enabling succeeded / 활성화가 성공하면 true
 */
bool enableConsoleHook(facebook::jsi::Runtime& runtime);

/**
 * Disable console hook / console 훅 비활성화
 * @param runtime JSI runtime instance / JSI 런타임 인스턴스
 * @return true if disabling succeeded / 비활성화가 성공하면 true
 */
bool disableConsoleHook(facebook::jsi::Runtime& runtime);

/**
 * Check if console hook is enabled / console 훅이 활성화되어 있는지 확인
 * @return true if console hook is enabled / console 훅이 활성화되어 있으면 true
 */
bool isConsoleHookEnabled();

/**
 * Check if console hook is enabled by checking runtime state / 런타임 상태를 확인하여 console 훅이 활성화되어 있는지 확인
 * @param runtime JSI runtime instance / JSI 런타임 인스턴스
 * @return true if console hook is enabled / console 훅이 활성화되어 있으면 true
 */
bool isConsoleHookEnabled(facebook::jsi::Runtime& runtime);

/**
 * Convert JSI value to RemoteObject / JSI 값을 RemoteObject로 변환
 * @param runtime JSI runtime instance / JSI 런타임 인스턴스
 * @param value JSI value to convert / 변환할 JSI 값
 * @return RemoteObject representation of the value / 값의 RemoteObject 표현
 */
RemoteObject jsiValueToRemoteObject(facebook::jsi::Runtime& runtime, const facebook::jsi::Value& value);

/**
 * Find object by __cdpObjectId in runtime / 런타임에서 __cdpObjectId로 객체 찾기
 * @param runtime JSI runtime instance / JSI 런타임 인스턴스
 * @param objectId Object ID to find / 찾을 객체 ID
 * @return JSI Value of the object, or undefined if not found / 객체의 JSI Value, 찾지 못하면 undefined
 */
facebook::jsi::Value findObjectById(facebook::jsi::Runtime& runtime, const std::string& objectId);

/**
 * Get object properties for Runtime.getProperties / Runtime.getProperties를 위한 객체 속성 가져오기
 * @param runtime JSI runtime instance / JSI 런타임 인스턴스
 * @param objectId Object ID / 객체 ID
 * @param ownProperties Whether to return only own properties / 자신의 속성만 반환할지 여부
 * @return CDP formatted properties response / CDP 형식의 속성 응답
 */
std::string getObjectProperties(facebook::jsi::Runtime& runtime, const std::string& objectId, bool ownProperties = false);

} // namespace chrome_remote_devtools

