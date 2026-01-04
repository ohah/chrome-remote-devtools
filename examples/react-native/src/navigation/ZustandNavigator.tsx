// Zustand Navigator / Zustand 네비게이터
import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import ZustandCounterScreen from '../screens/zustand/ZustandCounterScreen';
import ZustandTodoScreen from '../screens/zustand/ZustandTodoScreen';
import ZustandCartScreen from '../screens/zustand/ZustandCartScreen';

const Tab = createMaterialTopTabNavigator();

export default function ZustandNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="Counter"
        component={ZustandCounterScreen}
        options={{ title: 'Counter' }}
      />
      <Tab.Screen
        name="Todo"
        component={ZustandTodoScreen}
        options={{ title: 'Todo' }}
      />
      <Tab.Screen
        name="Cart"
        component={ZustandCartScreen}
        options={{ title: 'Cart' }}
      />
    </Tab.Navigator>
  );
}


