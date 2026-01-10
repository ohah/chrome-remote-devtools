// MMKV Test Screen / MMKV 테스트 화면
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { userStorage, cacheStorage, defaultStorage, legacyStorage } from '../../store/mmkv/storage';

type StorageType = 'user' | 'cache' | 'default' | 'legacy';

// Random key prefixes / 랜덤 키 접두사
const KEY_PREFIXES = ['user', 'item', 'data', 'config', 'setting', 'cache', 'temp', 'test'];

// Random string values / 랜덤 문자열 값
const STRING_VALUES = [
  'Hello World',
  'React Native',
  'MMKV Storage',
  'Test Value',
  'Random Data',
  'Sample Text',
  'DevTools Test',
  'Storage Test',
];

// Generate random key-value pair by type / 타입별 랜덤 키-값 쌍 생성
const generateRandomEntry = (type: 'string' | 'number' | 'boolean') => {
  const prefix = KEY_PREFIXES[Math.floor(Math.random() * KEY_PREFIXES.length)];
  const randomId = Math.floor(Math.random() * 10000);
  const key = `${prefix}_${randomId}`;

  let value: string | number | boolean;
  if (type === 'string') {
    value = STRING_VALUES[Math.floor(Math.random() * STRING_VALUES.length)];
  } else if (type === 'number') {
    value = Math.floor(Math.random() * 1000);
  } else {
    value = Math.random() > 0.5;
  }

  return { key, value };
};

function MMKVTestScreen() {
  const [selectedStorage, setSelectedStorage] = useState<StorageType>('user');
  const [entries, setEntries] = useState<Array<{ key: string; value: string }>>([]);

  const getStorage = () => {
    switch (selectedStorage) {
      case 'user':
        return userStorage; // v4
      case 'cache':
        return cacheStorage; // v4
      case 'default':
        return defaultStorage; // v4
      case 'legacy':
        return legacyStorage; // v3 (legacy support)
    }
  };

  const refreshEntries = () => {
    const storage = getStorage();
    const keys = storage.getAllKeys();
    const newEntries = keys.map((k: string) => {
      // Check types in order: number, boolean, string (with length check), buffer
      // MMKV stores types separately, but we check number and boolean first to avoid string conversion
      // 타입을 순서대로 확인: number, boolean, string (길이 체크 포함), buffer
      // MMKV는 타입을 별도로 저장하지만, string 변환을 피하기 위해 number와 boolean을 먼저 확인
      const numberValue = storage.getNumber(k);
      const booleanValue = storage.getBoolean(k);
      const stringValue = storage.getString(k);
      const bufferValue = storage.getBuffer(k);

      let valueStr = '';
      // Check number first (MMKV stores numbers separately from strings)
      // number를 먼저 확인 (MMKV는 숫자를 문자열과 별도로 저장)
      if (numberValue !== undefined) {
        valueStr = `${numberValue} (number)`;
      } else if (booleanValue !== undefined) {
        valueStr = `${booleanValue} (boolean)`;
      } else if (stringValue !== undefined && stringValue.length > 0) {
        // Check string only if it has content (MMKV may return empty string for non-string types)
        // string은 내용이 있을 때만 확인 (MMKV는 비-string 타입에 대해 빈 문자열을 반환할 수 있음)
        valueStr = `"${stringValue}" (string)`;
      } else if (bufferValue !== undefined) {
        valueStr = `[Buffer ${bufferValue.byteLength} bytes]`;
      }

      return { key: k, value: valueStr };
    });
    setEntries(newEntries);
  };

  useEffect(() => {
    refreshEntries();
  }, [selectedStorage]);

  const handleDelete = (deleteKey: string) => {
    const storage = getStorage();
    try {
      // MMKV v4 uses remove(), v3 uses delete() / MMKV v4는 remove() 사용, v3는 delete() 사용
      if ('remove' in storage && typeof storage.remove === 'function') {
        storage.remove(deleteKey);
      } else if ('delete' in storage && typeof storage.delete === 'function') {
        storage.delete(deleteKey);
      }
      refreshEntries();
      Alert.alert('Success', 'Key deleted successfully');
    } catch (error) {
      Alert.alert('Error', String(error));
    }
  };

  const handleClear = () => {
    Alert.alert('Confirm', 'Clear all entries?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          const storage = getStorage();
          storage.clearAll();
          refreshEntries();
          Alert.alert('Success', 'All entries cleared');
        },
      },
    ]);
  };

  const handleSetRandom = (type: 'string' | 'number' | 'boolean') => {
    const storage = getStorage();
    try {
      const { key, value } = generateRandomEntry(type);
      // Store the value / 값 저장
      storage.set(key, value);

      // Verify the stored value / 저장된 값 확인
      if (type === 'number') {
        const storedNumber = storage.getNumber(key);
        const storedString = storage.getString(key);
        console.log(
          `[MMKVTest] Stored number: key=${key}, value=${value}, getNumber=${storedNumber}, getString=${storedString}`
        );
      }

      refreshEntries();
    } catch (error) {
      Alert.alert('Error', String(error));
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <View style={styles.storageButtons}>
          <TouchableOpacity
            style={[styles.storageButton, selectedStorage === 'user' && styles.storageButtonActive]}
            onPress={() => setSelectedStorage('user')}
          >
            <Text style={styles.storageButtonText}>User (v4)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.storageButton,
              selectedStorage === 'cache' && styles.storageButtonActive,
            ]}
            onPress={() => setSelectedStorage('cache')}
          >
            <Text style={styles.storageButtonText}>Cache (v4)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.storageButton,
              selectedStorage === 'default' && styles.storageButtonActive,
            ]}
            onPress={() => setSelectedStorage('default')}
          >
            <Text style={styles.storageButtonText}>Default (v4)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.storageButton,
              selectedStorage === 'legacy' && styles.storageButtonActive,
            ]}
            onPress={() => setSelectedStorage('legacy')}
          >
            <Text style={styles.storageButtonText}>Legacy (v3)</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.randomButtons}>
          <TouchableOpacity
            style={[styles.randomButton, styles.randomButtonString]}
            onPress={() => handleSetRandom('string')}
          >
            <Text style={styles.randomButtonText}>String</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.randomButton, styles.randomButtonNumber]}
            onPress={() => handleSetRandom('number')}
          >
            <Text style={styles.randomButtonText}>Number</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.randomButton, styles.randomButtonBoolean]}
            onPress={() => handleSetRandom('boolean')}
          >
            <Text style={styles.randomButtonText}>Boolean</Text>
          </TouchableOpacity>
        </View>
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
  storageButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  storageButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    alignItems: 'center',
  },
  storageButtonActive: {
    backgroundColor: '#2196F3',
  },
  storageButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212121',
  },
  randomButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  randomButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  randomButtonString: {
    backgroundColor: '#2196F3',
  },
  randomButtonNumber: {
    backgroundColor: '#FF9800',
  },
  randomButtonBoolean: {
    backgroundColor: '#4CAF50',
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

export default MMKVTestScreen;
