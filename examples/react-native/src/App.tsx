/**
 * Chrome Remote DevTools React Native Example
 * @format
 */

import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { setupReduxDevToolsExtension } from '@ohah/chrome-remote-devtools-react-native';
import { store } from './store/redux/store';
import AppNavigator from './navigation/AppNavigator';
import { useConnection } from './hooks/useConnection';

// Setup Redux DevTools Extension BEFORE importing stores / store import 전에 Redux DevTools Extension 설정
// This is critical because Zustand/Redux stores check for extension during module initialization / 이것은 중요합니다. Zustand/Redux store가 모듈 초기화 중에 extension을 확인하기 때문입니다
console.log('[App] Setting up Redux DevTools Extension at module level...');
setupReduxDevToolsExtension('localhost', 8080);

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  // Connect to Chrome Remote DevTools server / Chrome Remote DevTools 서버에 연결
  useConnection();

  // Debug: Check if extension is available after stores are created / 디버그: store 생성 후 extension 사용 가능 여부 확인
  useEffect(() => {
    const checkExtension = () => {
      const globalObj =
        typeof global !== 'undefined'
          ? global
          : typeof window !== 'undefined'
            ? window
            : {};
      const extension = (globalObj as any).__REDUX_DEVTOOLS_EXTENSION__;
      console.log('[App] Checking __REDUX_DEVTOOLS_EXTENSION__:', {
        exists: !!extension,
        hasConnect: typeof extension?.connect === 'function',
        global: typeof global !== 'undefined',
        window: typeof window !== 'undefined',
      });
    };

    // Check immediately and after a delay / 즉시 확인 및 지연 후 확인
    checkExtension();
    setTimeout(checkExtension, 1000);
    setTimeout(checkExtension, 3000);
  }, []);

  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <NavigationContainer>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
          <AppNavigator />
        </NavigationContainer>
      </Provider>
    </SafeAreaProvider>
  );
}

export default App;
