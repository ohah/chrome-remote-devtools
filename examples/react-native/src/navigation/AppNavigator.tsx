// App Navigator / 앱 네비게이터
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import HomeScreen from '../screens/HomeScreen';
import ReduxNavigator from './ReduxNavigator';
import ZustandNavigator from './ZustandNavigator';
import MMKVNavigator from './MMKVNavigator';
import AsyncStorageNavigator from './AsyncStorageNavigator';

const BottomTab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Home Stack Navigator / Home 스택 네비게이터
function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="HomeMain" component={HomeScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

// Redux Stack Navigator / Redux 스택 네비게이터
function ReduxStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="ReduxMain" component={ReduxNavigator} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

// Zustand Stack Navigator / Zustand 스택 네비게이터
function ZustandStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ZustandMain"
        component={ZustandNavigator}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

// MMKV Stack Navigator / MMKV 스택 네비게이터
function MMKVStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="MMKVMain" component={MMKVNavigator} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

// AsyncStorage Stack Navigator / AsyncStorage 스택 네비게이터
function AsyncStorageStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="AsyncStorageMain"
        component={AsyncStorageNavigator}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <BottomTab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: '#757575',
        headerShown: false,
      }}
    >
      <BottomTab.Screen
        name="Home"
        component={HomeStack}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size = 24 }) => <Icon name="home" size={size} color={color} />,
        }}
      />
      <BottomTab.Screen
        name="Redux"
        component={ReduxStack}
        options={{
          title: 'Redux',
          tabBarIcon: ({ color, size = 24 }) => <Icon name="storage" size={size} color={color} />,
        }}
      />
      <BottomTab.Screen
        name="Zustand"
        component={ZustandStack}
        options={{
          title: 'Zustand',
          tabBarIcon: ({ color, size = 24 }) => <Icon name="inventory" size={size} color={color} />,
        }}
      />
      <BottomTab.Screen
        name="MMKV"
        component={MMKVStack}
        options={{
          title: 'MMKV',
          tabBarIcon: ({ color, size = 24 }) => <Icon name="storage" size={size} color={color} />,
        }}
      />
      <BottomTab.Screen
        name="AsyncStorage"
        component={AsyncStorageStack}
        options={{
          title: 'AsyncStorage',
          tabBarIcon: ({ color, size = 24 }) => <Icon name="storage" size={size} color={color} />,
        }}
      />
    </BottomTab.Navigator>
  );
}
