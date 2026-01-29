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
    android.util.Log.d("ChromeRemoteDevToolsInspectorPackage", "getModule called with name: $name")
    android.util.Log.d("ChromeRemoteDevToolsInspectorPackage", "Expected name: ${ChromeRemoteDevToolsInspectorModule.NAME}")

    return if (name == ChromeRemoteDevToolsInspectorModule.NAME) {
      try {
        android.util.Log.d("ChromeRemoteDevToolsInspectorPackage", "Creating ChromeRemoteDevToolsInspectorModule")
        val module = ChromeRemoteDevToolsInspectorModule(reactContext)
        android.util.Log.d("ChromeRemoteDevToolsInspectorPackage", "ChromeRemoteDevToolsInspectorModule created successfully")
        module
      } catch (e: Exception) {
        android.util.Log.e("ChromeRemoteDevToolsInspectorPackage", "Failed to create ChromeRemoteDevToolsInspectorModule", e)
        null
      }
    } else {
      android.util.Log.d("ChromeRemoteDevToolsInspectorPackage", "Module name mismatch, returning null")
      null
    }
  }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
    android.util.Log.d("ChromeRemoteDevToolsInspectorPackage", "getReactModuleInfoProvider called")
    return ReactModuleInfoProvider {
      val moduleInfo = mapOf(
        ChromeRemoteDevToolsInspectorModule.NAME to ReactModuleInfo(
          ChromeRemoteDevToolsInspectorModule.NAME,
          ChromeRemoteDevToolsInspectorModule::class.java.name,
          false, // canOverrideExistingModule / 기존 모듈을 덮어쓸 수 있는지
          true, // needsEagerInit / 즉시 초기화가 필요한지
          true, // hasConstants / 상수가 있는지
          false, // isCxxModule / C++ 모듈인지
          false, // isTurboModule / TurboModule인지 (Legacy Module로 사용)
        ),
      )
      android.util.Log.d("ChromeRemoteDevToolsInspectorPackage", "Module info: $moduleInfo")
      moduleInfo
    }
  }
}

