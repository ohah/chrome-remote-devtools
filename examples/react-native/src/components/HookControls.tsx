/**
 * Hook controls component / 훅 제어 컴포넌트
 * @format
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import ChromeRemoteDevToolsInspector from '@ohah/chrome-remote-devtools-inspector-react-native';

interface HookControlsProps {
  consoleHookEnabled: boolean;
  networkHookEnabled: boolean;
  onConsoleHookToggle: (enabled: boolean) => void;
  onNetworkHookToggle: (enabled: boolean) => void;
}

export const HookControls: React.FC<HookControlsProps> = ({
  consoleHookEnabled,
  networkHookEnabled,
  onConsoleHookToggle,
  onNetworkHookToggle,
}) => {
  // Toggle console hook / console 훅 토글
  const handleToggleConsoleHook = async () => {
    try {
      if (consoleHookEnabled) {
        const success = await ChromeRemoteDevToolsInspector.disableConsoleHook();
        if (success) {
          onConsoleHookToggle(false);
        }
      } else {
        const success = await ChromeRemoteDevToolsInspector.enableConsoleHook();
        if (success) {
          onConsoleHookToggle(true);
        }
      }
    } catch (error) {
      console.error('Failed to toggle console hook / console 훅 토글 실패:', error);
    }
  };

  // Toggle network hook / network 훅 토글
  const handleToggleNetworkHook = async () => {
    try {
      if (networkHookEnabled) {
        const success = await ChromeRemoteDevToolsInspector.disableNetworkHook();
        if (success) {
          onNetworkHookToggle(false);
        }
      } else {
        const success = await ChromeRemoteDevToolsInspector.enableNetworkHook();
        if (success) {
          onNetworkHookToggle(true);
        }
      }
    } catch (error) {
      console.error('Failed to toggle network hook / network 훅 토글 실패:', error);
    }
  };

  return (
    <View style={styles.floatingButtonsContainer}>
      <TouchableOpacity
        style={[
          styles.floatingButton,
          consoleHookEnabled ? styles.floatingButtonEnabled : styles.floatingButtonDisabled,
        ]}
        onPress={handleToggleConsoleHook}
      >
        <Text style={styles.floatingButtonText}>
          {consoleHookEnabled ? 'Console ON' : 'Console OFF'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.floatingButton,
          networkHookEnabled ? styles.floatingButtonEnabled : styles.floatingButtonDisabled,
        ]}
        onPress={handleToggleNetworkHook}
      >
        <Text style={styles.floatingButtonText}>
          {networkHookEnabled ? 'Network ON' : 'Network OFF'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingButtonsContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'column',
    gap: 12,
    zIndex: 1000,
  },
  floatingButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingButtonEnabled: {
    backgroundColor: '#4CAF50',
  },
  floatingButtonDisabled: {
    backgroundColor: '#9E9E9E',
  },
  floatingButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
