// Storage Screen with top tabs MMKV | AsyncStorage / Storage 화면 (상단 탭 MMKV | AsyncStorage)
import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import MMKVNavigator from '../navigation/MMKVNavigator';
import AsyncStorageNavigator from '../navigation/AsyncStorageNavigator';

const Tab = createMaterialTopTabNavigator();

export default function StorageScreen() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="MMKV" component={MMKVNavigator} options={{ title: 'MMKV' }} />
      <Tab.Screen
        name="AsyncStorage"
        component={AsyncStorageNavigator}
        options={{ title: 'AsyncStorage' }}
      />
    </Tab.Navigator>
  );
}
