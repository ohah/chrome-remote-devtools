// AsyncStorage Navigator / AsyncStorage 네비게이터
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorageTestScreen from '../screens/async-storage/AsyncStorageTestScreen';

const Stack = createStackNavigator();

export default function AsyncStorageNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="AsyncStorageTest"
        component={AsyncStorageTestScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}
