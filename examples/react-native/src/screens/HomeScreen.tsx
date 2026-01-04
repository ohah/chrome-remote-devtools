// Home Screen / 홈 화면
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { ConsoleTestTab } from '../components/ConsoleTestTab';
import { NetworkTestTab } from '../components/NetworkTestTab';
import { HookControls } from '../components/HookControls';

const Tab = createMaterialTopTabNavigator();

function HomeTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="Console"
        component={ConsoleTestTab}
        options={{ title: 'Console Test' }}
      />
      <Tab.Screen
        name="Network"
        component={NetworkTestTab}
        options={{ title: 'Network Test' }}
      />
    </Tab.Navigator>
  );
}

function HomeContent() {
  const [consoleHookEnabled, setConsoleHookEnabled] = useState(false);
  const [networkHookEnabled, setNetworkHookEnabled] = useState(false);

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

