// AsyncStorage Test Screen / AsyncStorage 테스트 화면
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Random key prefixes / 랜덤 키 접두사
const KEY_PREFIXES = ['user', 'item', 'data', 'config', 'setting', 'cache', 'temp', 'test'];

// Random string values / 랜덤 문자열 값
const STRING_VALUES = [
  'Hello World',
  'React Native',
  'AsyncStorage',
  'Test Value',
  'Random Data',
  'Sample Text',
  'DevTools Test',
  'Storage Test',
];

// Generate random key-value pair / 랜덤 키-값 쌍 생성
const generateRandomEntry = () => {
  const prefix = KEY_PREFIXES[Math.floor(Math.random() * KEY_PREFIXES.length)];
  const randomId = Math.floor(Math.random() * 10000);
  const key = `${prefix}_${randomId}`;
  const value = STRING_VALUES[Math.floor(Math.random() * STRING_VALUES.length)];

  return { key, value };
};

function AsyncStorageTestScreen() {
  const [entries, setEntries] = useState<Array<{ key: string; value: string }>>([]);

  const refreshEntries = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const items = await AsyncStorage.multiGet(keys);
      const newEntries = items
        .filter(([_, value]) => value !== null)
        .map(([key, value]) => ({
          key,
          value: value ? `"${value}" (string)` : '',
        }));
      setEntries(newEntries);
    } catch (error) {
      console.error('[AsyncStorageTest] Error refreshing entries:', error);
    }
  };

  useEffect(() => {
    refreshEntries();
  }, []);

  const handleDelete = async (deleteKey: string) => {
    try {
      await AsyncStorage.removeItem(deleteKey);
      await refreshEntries();
    } catch (error) {
      console.error('[AsyncStorageTest] Error deleting entry:', error);
    }
  };

  const handleClear = async () => {
    try {
      await AsyncStorage.clear();
      await refreshEntries();
    } catch (error) {
      console.error('[AsyncStorageTest] Error clearing entries:', error);
    }
  };

  const handleSetRandom = async () => {
    try {
      const { key, value } = generateRandomEntry();
      await AsyncStorage.setItem(key, value);
      await refreshEntries();
    } catch (error) {
      console.error('[AsyncStorageTest] Error setting random entry:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <TouchableOpacity style={styles.randomButton} onPress={handleSetRandom}>
          <Text style={styles.randomButtonText}>Add Random Entry</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.entriesCount}>Entries ({entries.length})</Text>
          <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        </View>
        {entries.length === 0 ? (
          <Text style={styles.emptyText}>No entries</Text>
        ) : (
          entries.map((entry) => (
            <View key={entry.key} style={styles.entry}>
              <View style={styles.entryContent}>
                <Text style={styles.entryKey}>{entry.key}</Text>
                <Text style={styles.entryValue}>{entry.value}</Text>
              </View>
              <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(entry.key)}>
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  entriesCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  randomButton: {
    padding: 14,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    alignItems: 'center',
  },
  randomButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    padding: 8,
    backgroundColor: '#F44336',
    borderRadius: 6,
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  entry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    marginBottom: 8,
  },
  entryContent: {
    flex: 1,
    marginRight: 12,
  },
  entryKey: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 4,
  },
  entryValue: {
    fontSize: 14,
    color: '#757575',
  },
  deleteButton: {
    padding: 8,
    backgroundColor: '#F44336',
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    color: '#9E9E9E',
    fontSize: 14,
    padding: 20,
  },
});

export default AsyncStorageTestScreen;
