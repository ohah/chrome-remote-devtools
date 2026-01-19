// Home Screen / 홈 화면
import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { ConsoleTestTab } from '../components/ConsoleTestTab';
import { NetworkTestTab } from '../components/NetworkTestTab';
import { HookControls } from '../components/HookControls';
import ChromeRemoteDevToolsInspector from '@ohah/chrome-remote-devtools-inspector-react-native';

const Tab = createMaterialTopTabNavigator();

function HomeTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Console" component={ConsoleTestTab} options={{ title: 'Console Test' }} />
      <Tab.Screen name="Network" component={NetworkTestTab} options={{ title: 'Network Test' }} />
    </Tab.Navigator>
  );
}

function HomeContent() {
  const [consoleHookEnabled, setConsoleHookEnabled] = useState(false);
  const [networkHookEnabled, setNetworkHookEnabled] = useState(false);

  // Check initial hook status / 초기 훅 상태 확인
  useEffect(() => {
    const checkInitialStatus = async () => {
      try {
        const consoleEnabled = await ChromeRemoteDevToolsInspector.isConsoleHookEnabled();
        const networkEnabled = await ChromeRemoteDevToolsInspector.isNetworkHookEnabled();
        setConsoleHookEnabled(consoleEnabled);
        setNetworkHookEnabled(networkEnabled);
      } catch (error) {
        console.error('Failed to check hook status / 훅 상태 확인 실패:', error);
      }
    };

    checkInitialStatus();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.tabsContainer}>
        <HomeTabs />
      </View>
      <HookControls
        consoleHookEnabled={consoleHookEnabled}
        networkHookEnabled={networkHookEnabled}
        onConsoleHookToggle={setConsoleHookEnabled}
        onNetworkHookToggle={setNetworkHookEnabled}
      />
    </View>
  );
}

export default HomeContent;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  tabsContainer: {
    flex: 1,
  },
});
