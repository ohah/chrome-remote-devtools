// Redux Navigator / Redux 네비게이터
import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import ReduxCounterScreen from '../screens/redux/ReduxCounterScreen';
import ReduxTodoScreen from '../screens/redux/ReduxTodoScreen';
import ReduxCartScreen from '../screens/redux/ReduxCartScreen';

const Tab = createMaterialTopTabNavigator();

export default function ReduxNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Counter" component={ReduxCounterScreen} options={{ title: 'Counter' }} />
      <Tab.Screen name="Todo" component={ReduxTodoScreen} options={{ title: 'Todo' }} />
      <Tab.Screen name="Cart" component={ReduxCartScreen} options={{ title: 'Cart' }} />
    </Tab.Navigator>
  );
}
