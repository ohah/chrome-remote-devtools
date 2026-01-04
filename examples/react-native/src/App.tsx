/**
 * Chrome Remote DevTools React Native Example
 * @format
 */

import {
  StatusBar,
  StyleSheet,
  useColorScheme,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { ConsoleTestTab } from './components/ConsoleTestTab';
import { NetworkTestTab } from './components/NetworkTestTab';
import { HookControls } from './components/HookControls';
import { useConnection } from './hooks/useConnection';

type TabType = 'console' | 'network';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [activeTab, setActiveTab] = useState<TabType>('network');
  const [consoleHookEnabled, setConsoleHookEnabled] = useState<boolean>(true);
  const [networkHookEnabled, setNetworkHookEnabled] = useState<boolean>(true);

  // Connect to Chrome Remote DevTools server / Chrome Remote DevTools 서버에 연결
  useConnection();

  // Run initial console tests / 초기 콘솔 테스트 실행
  useEffect(() => {
    setTimeout(() => {
      console.log('✅ React Native Native Inspector Ready');
      console.log('Platform:', Platform.OS, Platform.Version);
      console.log('Ready for debugging!');
    }, 1000);
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'console':
        return <ConsoleTestTab />;
      case 'network':
        return <NetworkTestTab />;
      default:
        return <ConsoleTestTab />;
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <View style={styles.container}>
        {/* Header / 헤더 */}
        <View style={styles.header}>
          <Text style={styles.title}>Chrome Remote DevTools</Text>
          <Text style={styles.subtitle}>React Native Native Inspector</Text>
        </View>

        {/* Tabs / 탭 */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'console' && styles.tabActive]}
            onPress={() => setActiveTab('console')}
          >
            <Text style={[styles.tabText, activeTab === 'console' && styles.tabTextActive]}>
              Console
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'network' && styles.tabActive]}
            onPress={() => setActiveTab('network')}
          >
            <Text style={[styles.tabText, activeTab === 'network' && styles.tabTextActive]}>
              Network
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content / 탭 내용 */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {renderTabContent()}

          {/* Instructions / 사용 방법 */}
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>Instructions:</Text>
            <Text style={styles.instructionsText}>
              1. Start the Chrome Remote DevTools server:{'\n'}
              {'   '}bun run dev:server{'\n\n'}
              2. iOS: bundleURL in AppDelegate.swift is configured to use{'\n'}
              {'   '}localhost:8080 (change for physical devices){'\n\n'}
              3. Android: Native inspector uses Metro bundler host{'\n'}
              {'   '}(may need additional configuration){'\n\n'}
              4. Native Inspector will automatically connect{'\n\n'}
              5. Open Chrome Remote DevTools Inspector to view the session
            </Text>
          </View>
        </ScrollView>

        {/* Floating Hook Control Buttons / 플로팅 훅 제어 버튼 */}
        <HookControls
          consoleHookEnabled={consoleHookEnabled}
          networkHookEnabled={networkHookEnabled}
          onConsoleHookToggle={setConsoleHookEnabled}
          onNetworkHookToggle={setNetworkHookEnabled}
        />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000000',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 8,
    color: '#666666',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#2196F3',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666666',
  },
  tabTextActive: {
    color: '#2196F3',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  instructionsContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 16,
    margin: 20,
    marginTop: 8,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#000000',
  },
  instructionsText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333333',
  },
});

export default App;
