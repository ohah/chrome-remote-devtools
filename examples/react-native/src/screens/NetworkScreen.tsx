// Network Screen with top tabs XHR | Fetch / 네트워크 화면 (상단 탭 XHR | Fetch)
import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { XHRTestTab } from '../components/XHRTestTab';
import { FetchTestTab } from '../components/FetchTestTab';

const Tab = createMaterialTopTabNavigator();

export default function NetworkScreen() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="XHR" component={XHRTestTab} options={{ title: 'XHR' }} />
      <Tab.Screen name="Fetch" component={FetchTestTab} options={{ title: 'Fetch' }} />
    </Tab.Navigator>
  );
}
