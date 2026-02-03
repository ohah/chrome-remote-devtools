/**
 * Chrome Remote DevTools React Native Example
 * @format
 */

import 'react-native-gesture-handler';
// Note: Redux DevTools Extension is auto-initialized on import / 참고: Redux DevTools Extension은 import 시 자동 초기화됩니다
import '@ohah/chrome-remote-devtools-inspector-react-native';
import React, { useEffect, useState } from 'react';
import { StatusBar, useColorScheme, View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import {
  ChromeRemoteDevToolsInspectorProvider,
  registerMMKVDevTools,
  registerAsyncStorageDevTools,
  type AsyncStorageType,
} from '@ohah/chrome-remote-devtools-inspector-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUniqueId } from 'react-native-device-info';
import { store } from './store/redux/store';
import { userStorage, cacheStorage, defaultStorage, legacyStorage } from './store/mmkv/storage';
import AppNavigator from './navigation/AppNavigator';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [deviceId, setDeviceId] = useState<string | null>(null);

  // Stable device ID from react-native-device-info for Inspector list / Inspector 목록용 안정적 기기 ID
  useEffect(() => {
    getUniqueId()
      .then(setDeviceId)
      .catch((err) => {
        console.warn('[App] getUniqueId failed, Inspector will use random UUID:', err);
        setDeviceId('');
      });
  }, []);

  // Register MMKV DevTools / MMKV DevTools 등록
  // v4 is default, v3 is for legacy support / v4가 기본, v3는 하위 호환용
  useEffect(() => {
    try {
      registerMMKVDevTools({
        user: userStorage, // v4
        cache: cacheStorage, // v4
        default: defaultStorage, // v4
        legacy: legacyStorage, // v3 (legacy support)
      });
    } catch (error) {
      console.error('[App] Error registering MMKV DevTools:', error);
      // Don't block app startup / 앱 시작을 막지 않음
    }
  }, []);

  // Register AsyncStorage DevTools / AsyncStorage DevTools 등록
  useEffect(() => {
    try {
      registerAsyncStorageDevTools(AsyncStorage as unknown as AsyncStorageType);
    } catch (error) {
      console.error('[App] Error registering AsyncStorage DevTools:', error);
      // Don't block app startup / 앱 시작을 막지 않음
    }
  }, []);

  // Wait for deviceId so Inspector shows same device across reloads / 리로드 후에도 동일 기기로 표시되도록 deviceId 대기
  if (deviceId === null) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Use localhost; on Android emulator run once: adb reverse tcp:8080 tcp:8080 / localhost 사용; Android 에뮬에서는 한 번 실행: adb reverse tcp:8080 tcp:8080
  return (
    <ChromeRemoteDevToolsInspectorProvider
      serverHost="localhost"
      serverPort={8080}
      deviceId={deviceId || undefined}
    >
      <SafeAreaProvider>
        <View style={styles.container}>
          <Provider store={store}>
            <NavigationContainer>
              <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
              <AppNavigator />
            </NavigationContainer>
          </Provider>
        </View>
      </SafeAreaProvider>
    </ChromeRemoteDevToolsInspectorProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
  },
});

export default App;
