/**
 * Chrome Remote DevTools React Native Example
 * @format
 */

import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { store } from './store/redux/store';
import AppNavigator from './navigation/AppNavigator';
import { useConnection } from './hooks/useConnection';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  // Connect to Chrome Remote DevTools server / Chrome Remote DevTools 서버에 연결
  useConnection();

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
