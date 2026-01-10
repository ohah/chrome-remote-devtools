// MMKV Navigator / MMKV 네비게이터
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import MMKVTestScreen from '../screens/mmkv/MMKVTestScreen';

const Stack = createStackNavigator();

export default function MMKVNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MMKVTest"
        component={MMKVTestScreen}
        options={{
          title: 'MMKV Test',
          headerShown: true,
        }}
      />
    </Stack.Navigator>
  );
}
