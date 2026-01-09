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
#include <memory>
#include <string>
#include <unordered_map>

namespace chrome_remote_devtools {

/**
 * Redux DevTools Extension JSI HostObject / Redux DevTools Extension JSI HostObject
 * Provides __REDUX_DEVTOOLS_EXTENSION__ global object via JSI / JSI를 통해 __REDUX_DEVTOOLS_EXTENSION__ 전역 객체 제공
 */
class ReduxDevToolsExtensionHostObject : public facebook::jsi::HostObject {
 public:
  /**
   * Constructor / 생성자
   */
  ReduxDevToolsExtensionHostObject();

  /**
   * Destructor / 소멸자
   */
  ~ReduxDevToolsExtensionHostObject() override;

  /**
   * Get property from HostObject / HostObject에서 속성 가져오기
   * @param runtime JSI runtime instance / JSI 런타임 인스턴스
   * @param name Property name / 속성 이름
   * @return JSI value / JSI 값
   */
  facebook::jsi::Value get(facebook::jsi::Runtime& runtime, const facebook::jsi::PropNameID& name) override;

  /**
   * Set property on HostObject / HostObject에 속성 설정
   * @param runtime JSI runtime instance / JSI 런타임 인스턴스
   * @param name Property name / 속성 이름
   * @param value Value to set / 설정할 값
   */
  void set(facebook::jsi::Runtime& runtime, const facebook::jsi::PropNameID& name, const facebook::jsi::Value& value) override;

  /**
   * Get property names / 속성 이름 목록 가져오기
   * @param runtime JSI runtime instance / JSI 런타임 인스턴스
   * @return Array of property names / 속성 이름 배열
   */
  std::vector<facebook::jsi::PropNameID> getPropertyNames(facebook::jsi::Runtime& runtime) override;

 private:
  /**
   * Create connect function / connect 함수 생성
   * @param runtime JSI runtime instance / JSI 런타임 인스턴스
   * @return JSI function / JSI 함수
   */
  facebook::jsi::Function createConnectFunction(facebook::jsi::Runtime& runtime);

  /**
   * Create connect response object / connect 응답 객체 생성
   * @param runtime JSI runtime instance / JSI 런타임 인스턴스
   * @param instanceId Instance ID / 인스턴스 ID
   * @param name Instance name / 인스턴스 이름
   * @return JSI object / JSI 객체
   */
  facebook::jsi::Object createConnectResponse(facebook::jsi::Runtime& runtime, int instanceId, const std::string& name);

  /**
   * Send CDP message / CDP 메시지 전송
   * @param method CDP method / CDP 메서드
   * @param params CDP parameters / CDP 매개변수
   */
  void sendCDPMessage(const std::string& method, const std::string& params);

  /**
   * Get server info / 서버 정보 가져오기
   * @return Server info as JSON string / JSON 문자열로 된 서버 정보
   */
  std::string getServerInfo();

  // Store for connect instances / connect 인스턴스 저장소
  std::unordered_map<int, std::shared_ptr<facebook::jsi::Object>> connectInstances_;
  int nextInstanceId_;
};

/**
 * Install Redux DevTools Extension to global object / 전역 객체에 Redux DevTools Extension 설치
 * @param runtime JSI runtime instance / JSI 런타임 인스턴스
 * @return true if installation succeeded / 설치가 성공하면 true
 */
bool installReduxDevToolsExtension(facebook::jsi::Runtime& runtime);

/**
 * Set server info for Redux DevTools Extension / Redux DevTools Extension을 위한 서버 정보 설정
 * @param host Server host / 서버 호스트
 * @param port Server port / 서버 포트
 */
void setReduxDevToolsServerInfo(const std::string& host, int port);

} // namespace chrome_remote_devtools
