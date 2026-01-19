/**
 * Chrome Remote DevTools React Native Example
 * @format
 */

import 'react-native-gesture-handler';
// Note: Redux DevTools Extension is auto-initialized on import / 참고: Redux DevTools Extension은 import 시 자동 초기화됩니다
import '@ohah/chrome-remote-devtools-inspector-react-native';
import React, { useEffect } from 'react';
import { StatusBar, useColorScheme, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import {
  ChromeRemoteDevToolsInspectorProvider,
  registerMMKVDevTools,
  registerAsyncStorageDevTools,
} from '@ohah/chrome-remote-devtools-inspector-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { store } from './store/redux/store';
import { userStorage, cacheStorage, defaultStorage, legacyStorage } from './store/mmkv/storage';
import AppNavigator from './navigation/AppNavigator';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

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
      registerAsyncStorageDevTools(AsyncStorage);
    } catch (error) {
      console.error('[App] Error registering AsyncStorage DevTools:', error);
      // Don't block app startup / 앱 시작을 막지 않음
    }
  }, []);

  return (
    <ChromeRemoteDevToolsInspectorProvider serverHost="localhost" serverPort={8080}>
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
});

export default App;
