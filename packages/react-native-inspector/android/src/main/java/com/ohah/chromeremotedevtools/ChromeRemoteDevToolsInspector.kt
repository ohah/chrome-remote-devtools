/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Modified for Chrome Remote DevTools / Chrome Remote DevTools용으로 수정됨
 */

package com.ohah.chromeremotedevtools

import android.content.Context
import android.provider.Settings
import java.security.MessageDigest
import java.util.concurrent.ConcurrentHashMap

/**
 * Chrome Remote DevTools Inspector Helper / Chrome Remote DevTools Inspector 헬퍼
 * Provides utility methods for Inspector connection / Inspector 연결을 위한 유틸리티 메서드 제공
 */
object ChromeRemoteDevToolsInspector {
  private val socketConnections = ConcurrentHashMap<String, ChromeRemoteDevToolsInspectorPackagerConnection>()

  /**
   * Get device ID / 디바이스 ID 가져오기
   */
  fun getDeviceId(context: Context): String {
    val androidId = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
    val packageName = context.packageName
    val rawDeviceId = "android-$androidId-$packageName"
    return sha256(rawDeviceId)
  }

  /**
   * Get Inspector device URL / Inspector 디바이스 URL 가져오기
   */
  fun getInspectorDeviceUrl(
    serverHost: String,
    serverPort: Int,
    deviceName: String,
    appName: String,
    deviceId: String
  ): String {
    val encodedDeviceName = java.net.URLEncoder.encode(deviceName, "UTF-8")
    val encodedAppName = java.net.URLEncoder.encode(appName, "UTF-8")
    val encodedDeviceId = java.net.URLEncoder.encode(deviceId, "UTF-8")

    return "ws://$serverHost:$serverPort/inspector/device?name=$encodedDeviceName&app=$encodedAppName&device=$encodedDeviceId&profiling=false"
  }

  /**
   * Normalize server host for Android / Android용 서버 호스트 정규화
   * Android emulator uses 10.0.2.2 to access host machine's localhost / Android 에뮬레이터는 호스트 머신의 localhost에 접근하기 위해 10.0.2.2를 사용합니다
   */
  private fun normalizeServerHost(serverHost: String): String {
    // Check if running on emulator / 에뮬레이터에서 실행 중인지 확인
    val isEmulator = android.os.Build.FINGERPRINT.startsWith("generic") ||
        android.os.Build.FINGERPRINT.startsWith("unknown") ||
        android.os.Build.MODEL.contains("google_sdk") ||
        android.os.Build.MODEL.contains("Emulator") ||
        android.os.Build.MODEL.contains("Android SDK built for x86") ||
        android.os.Build.MODEL.startsWith("sdk_") || // Google emulator models start with sdk_ / Google 에뮬레이터 모델은 sdk_로 시작
        android.os.Build.MANUFACTURER.contains("Genymotion") ||
        (android.os.Build.BRAND.startsWith("generic") && android.os.Build.DEVICE.startsWith("generic")) ||
        "google_sdk" == android.os.Build.PRODUCT

    android.util.Log.d("ChromeRemoteDevToolsInspector", "Emulator check / 에뮬레이터 확인: isEmulator=$isEmulator, MODEL=${android.os.Build.MODEL}, FINGERPRINT=${android.os.Build.FINGERPRINT}")

    // If localhost or 127.0.0.1 and running on emulator, use 10.0.2.2 / localhost 또는 127.0.0.1이고 에뮬레이터에서 실행 중이면 10.0.2.2 사용
    if (isEmulator && (serverHost == "localhost" || serverHost == "127.0.0.1")) {
      android.util.Log.d("ChromeRemoteDevToolsInspector", "Detected emulator, converting localhost to 10.0.2.2 / 에뮬레이터 감지, localhost를 10.0.2.2로 변환")
      return "10.0.2.2"
    }

    return serverHost
  }

  /**
   * Connect to Chrome Remote DevTools server / Chrome Remote DevTools 서버에 연결
   */
  fun connect(
    context: Context,
    serverHost: String,
    serverPort: Int
  ): ChromeRemoteDevToolsInspectorPackagerConnection? {
    // Normalize server host for Android emulator / Android 에뮬레이터용 서버 호스트 정규화
    val normalizedHost = normalizeServerHost(serverHost)

    val deviceName = android.os.Build.MODEL
    val appName = context.packageName
    val deviceId = getDeviceId(context)
    val url = getInspectorDeviceUrl(normalizedHost, serverPort, deviceName, appName, deviceId)

    android.util.Log.d("ChromeRemoteDevToolsInspector", "Connecting to Inspector / Inspector 연결 중")
    android.util.Log.d("ChromeRemoteDevToolsInspector", "Original server: $serverHost:$serverPort")
    android.util.Log.d("ChromeRemoteDevToolsInspector", "Normalized server: $normalizedHost:$serverPort")
    android.util.Log.d("ChromeRemoteDevToolsInspector", "Device: $deviceName")
    android.util.Log.d("ChromeRemoteDevToolsInspector", "App: $appName")
    android.util.Log.d("ChromeRemoteDevToolsInspector", "Device ID: $deviceId")
    android.util.Log.d("ChromeRemoteDevToolsInspector", "URL: $url")

    val connection = socketConnections[url]
    if (connection != null && connection.isConnected()) {
      android.util.Log.d("ChromeRemoteDevToolsInspector", "Using existing connection / 기존 연결 사용")
      return connection
    }

    val newConnection = ChromeRemoteDevToolsInspectorPackagerConnection(
      url = url,
      deviceName = deviceName,
      appName = appName,
      deviceId = deviceId
    )

    socketConnections[url] = newConnection
    newConnection.connect()

    android.util.Log.d("ChromeRemoteDevToolsInspector", "Connection initiated / 연결 시작됨")

    return newConnection
  }

  /**
   * Check if packager is disconnected / Packager 연결이 끊어졌는지 확인
   */
  fun isPackagerDisconnected(): Boolean {
    return socketConnections.values.none { it.isConnected() }
  }

  /**
   * Send CDP message / CDP 메시지 전송
   */
  fun sendCDPMessage(
    context: Context,
    serverHost: String,
    serverPort: Int,
    message: String
  ) {
    // Normalize server host for Android emulator / Android 에뮬레이터용 서버 호스트 정규화
    val normalizedHost = normalizeServerHost(serverHost)

    val deviceName = android.os.Build.MODEL
    val appName = context.packageName
    val deviceId = getDeviceId(context)
    val url = getInspectorDeviceUrl(normalizedHost, serverPort, deviceName, appName, deviceId)

    val connection = socketConnections[url]
    if (connection != null && connection.isConnected()) {
      connection.sendCDPMessage(message)
    }
  }

  /**
   * Calculate SHA256 hash / SHA256 해시 계산
   */
  private fun sha256(input: String): String {
    val digest = MessageDigest.getInstance("SHA-256")
    val hash = digest.digest(input.toByteArray())
    return hash.joinToString("") { "%02x".format(it) }
  }
}

