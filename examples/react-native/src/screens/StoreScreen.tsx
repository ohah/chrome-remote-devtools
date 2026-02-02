// Store Screen with top tabs Redux | Zustand / Store 화면 (상단 탭 Redux | Zustand)
import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import ReduxNavigator from '../navigation/ReduxNavigator';
import ZustandNavigator from '../navigation/ZustandNavigator';

const Tab = createMaterialTopTabNavigator();

export default function StoreScreen() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Redux" component={ReduxNavigator} options={{ title: 'Redux' }} />
      <Tab.Screen name="Zustand" component={ZustandNavigator} options={{ title: 'Zustand' }} />
    </Tab.Navigator>
  );
}
