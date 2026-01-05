/**
 * Chrome Remote DevTools React Native Example
 * @format
 */

import 'react-native-gesture-handler';
// Note: Redux DevTools Extension is auto-initialized on import / 참고: Redux DevTools Extension은 import 시 자동 초기화됩니다
import '@ohah/chrome-remote-devtools-react-native';
import React, { useEffect } from 'react';

// Type declarations for React Native environment / React Native 환경용 타입 선언
declare const global: typeof globalThis;
import { StatusBar, useColorScheme, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import ChromeRemoteDevToolsInspector from '@ohah/chrome-remote-devtools-react-native';
import { store } from './store/redux/store';
import AppNavigator from './navigation/AppNavigator';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  // Connect to Chrome Remote DevTools server / Chrome Remote DevTools 서버에 연결
  useEffect(() => {
    if (ChromeRemoteDevToolsInspector) {
      ChromeRemoteDevToolsInspector.connect('localhost', 8080)
        .then(() => {
          console.log('[App] Chrome Remote DevTools connected');
        })
        .catch((error: unknown) => {
          console.error(
            '[App] Failed to connect to Chrome Remote DevTools:',
            error instanceof Error ? error.message : String(error)
          );
        });
    }
  }, []);

  // Debug: Check if extension is available after stores are created / 디버그: store 생성 후 extension 사용 가능 여부 확인
  useEffect(() => {
    const checkExtension = () => {
      const globalObj =
        typeof global !== 'undefined'
          ? (global as any)
          : typeof window !== 'undefined'
            ? window
            : {};
      const extension = (globalObj as any).__REDUX_DEVTOOLS_EXTENSION__;
      const compose = (globalObj as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__;

      const extensionInfo = {
        exists: !!extension,
        hasConnect: typeof extension?.connect === 'function',
        isFunction: typeof extension === 'function',
        hasCompose: !!compose,
        global: typeof global !== 'undefined',
        window: typeof window !== 'undefined',
        extensionType: typeof extension,
        extensionKeys: extension ? Object.keys(extension) : [],
        timestamp: new Date().toISOString(),
      };

      console.log('[App] Checking __REDUX_DEVTOOLS_EXTENSION__:', extensionInfo);

      // Also log to global for debugging / 디버깅을 위해 전역에도 저장
      if (typeof global !== 'undefined') {
        (global as any).__ReduxDevToolsExtensionDebugInfo = extensionInfo;
      }
    };

    // Check immediately and after delays / 즉시 확인 및 지연 후 확인
    checkExtension();
    setTimeout(checkExtension, 100);
    setTimeout(checkExtension, 500);
    setTimeout(checkExtension, 1000);
    setTimeout(checkExtension, 3000);
  }, []);

  return (
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
