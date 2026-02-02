// Console Screen / 콘솔 화면
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ConsoleTestTab } from '../components/ConsoleTestTab';

export default function ConsoleScreen() {
  return (
    <View style={styles.container}>
      <ConsoleTestTab />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
