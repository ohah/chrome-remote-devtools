/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Modified for Chrome Remote DevTools / Chrome Remote DevTools용으로 수정됨
 */

package com.ohah.chromeremotedevtools

import com.facebook.react.TurboReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

/**
 * React Native Package for Chrome Remote DevTools Inspector / Chrome Remote DevTools Inspector용 React Native Package
 * This package registers the TurboModule with React Native / 이 패키지는 TurboModule을 React Native에 등록합니다
 */
class ChromeRemoteDevToolsInspectorPackage : TurboReactPackage() {
  override fun getModule(
    name: String,
    reactContext: ReactApplicationContext,
  ): NativeModule? {
    return if (name == ChromeRemoteDevToolsInspectorModule.NAME) {
      ChromeRemoteDevToolsInspectorModule(reactContext)
    } else {
      null
    }
  }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
    return ReactModuleInfoProvider {
      mapOf(
        ChromeRemoteDevToolsInspectorModule.NAME to ReactModuleInfo(
          ChromeRemoteDevToolsInspectorModule.NAME,
          ChromeRemoteDevToolsInspectorModule::class.java.name,
          false, // canOverrideExistingModule / 기존 모듈을 덮어쓸 수 있는지
          true, // needsEagerInit / 즉시 초기화가 필요한지
          true, // hasConstants / 상수가 있는지
          false, // isCxxModule / C++ 모듈인지
          true, // isTurboModule / TurboModule인지
        ),
      )
    }
  }
}

