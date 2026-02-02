// App Navigator / 앱 네비게이터
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ConsoleScreen from '../screens/ConsoleScreen';
import NetworkScreen from '../screens/NetworkScreen';
import StoreScreen from '../screens/StoreScreen';
import StorageScreen from '../screens/StorageScreen';

const BottomTab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Console Stack Navigator / Console 스택 네비게이터
function ConsoleStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="ConsoleMain" component={ConsoleScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

// Network Stack Navigator / Network 스택 네비게이터
function NetworkStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="NetworkMain" component={NetworkScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

// Store Stack Navigator / Store 스택 네비게이터
function StoreStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="StoreMain" component={StoreScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

// Storage Stack Navigator / Storage 스택 네비게이터
function StorageStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="StorageMain" component={StorageScreen} options={{ headerShown: false }} />
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
        name="Console"
        component={ConsoleStack}
        options={{
          title: 'Console',
          tabBarButtonTestID: 'tab-console',
          tabBarAccessibilityLabel: 'Console',
          tabBarIcon: ({ color, size = 24 }) => (
            <Icon name="bug-report" size={size} color={color} />
          ),
        }}
      />
      <BottomTab.Screen
        name="Network"
        component={NetworkStack}
        options={{
          title: 'Network',
          tabBarButtonTestID: 'tab-network',
          tabBarAccessibilityLabel: 'Network',
          tabBarIcon: ({ color, size = 24 }) => (
            <Icon name="network-check" size={size} color={color} />
          ),
        }}
      />
      <BottomTab.Screen
        name="Store"
        component={StoreStack}
        options={{
          title: 'Store',
          tabBarButtonTestID: 'tab-store',
          tabBarAccessibilityLabel: 'Store',
          tabBarIcon: ({ color, size = 24 }) => <Icon name="inventory" size={size} color={color} />,
        }}
      />
      <BottomTab.Screen
        name="Storage"
        component={StorageStack}
        options={{
          title: 'Storage',
          tabBarButtonTestID: 'tab-storage',
          tabBarAccessibilityLabel: 'Storage',
          tabBarIcon: ({ color, size = 24 }) => <Icon name="storage" size={size} color={color} />,
        }}
      />
    </BottomTab.Navigator>
  );
}
