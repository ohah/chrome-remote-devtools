/**
 * Chrome Remote DevTools React Native Example
 * @format
 */

import 'react-native-gesture-handler';
// Note: Redux DevTools Extension is auto-initialized on import / 참고: Redux DevTools Extension은 import 시 자동 초기화됩니다
import '@ohah/chrome-remote-devtools-react-native';
import React, { useEffect } from 'react';
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
