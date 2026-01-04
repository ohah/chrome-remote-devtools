/**
 * Payload view component / 페이로드 뷰 컴포넌트
 * @format
 */

import React from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, Platform } from 'react-native';

interface PayloadData {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string | any;
  status?: number;
  statusText?: string;
}

interface PayloadViewProps {
  title: string;
  data?: PayloadData;
}

// Format JSON for display / 표시용 JSON 포맷팅
const formatJSON = (obj: any): string => {
  try {
    if (typeof obj === 'string') {
      // Try to parse if it's a JSON string / JSON 문자열이면 파싱 시도
      try {
        return JSON.stringify(JSON.parse(obj), null, 2);
      } catch {
        return obj;
      }
    }
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
};

export const PayloadView: React.FC<PayloadViewProps> = ({ title, data }: PayloadViewProps) => {
  if (!data) return null;

  return (
    <View style={styles.payloadContainer}>
      <Text style={styles.payloadTitle}>{title}</Text>
      {data.url && (
        <View style={styles.payloadSection}>
          <Text style={styles.payloadLabel}>URL:</Text>
          <Text style={styles.payloadValue}>{data.url}</Text>
        </View>
      )}
      {data.method && (
        <View style={styles.payloadSection}>
          <Text style={styles.payloadLabel}>Method:</Text>
          <Text style={styles.payloadValue}>{data.method}</Text>
        </View>
      )}
      {data.status !== undefined && (
        <View style={styles.payloadSection}>
          <Text style={styles.payloadLabel}>Status:</Text>
          <Text style={styles.payloadValue}>
            {data.status} {data.statusText || ''}
          </Text>
        </View>
      )}
      {data.headers && Object.keys(data.headers).length > 0 && (
        <View style={styles.payloadSection}>
          <Text style={styles.payloadLabel}>Headers:</Text>
          <View style={styles.headersContainer}>
            {Object.entries(data.headers).map(([key, value], index) => {
              const uniqueKey = `${key}-${index}`;
              return (
                <View key={uniqueKey} style={styles.headerRow} {...({} as any)}>
                  <Text style={styles.headerKey}>{key}:</Text>
                  <Text style={styles.headerValue}>{String(value)}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
      {data.body !== undefined && (
        <View style={styles.payloadSection}>
          <Text style={styles.payloadLabel}>Body:</Text>
          <ScrollView style={styles.payloadScrollView} nestedScrollEnabled>
            <TextInput
              style={styles.payloadText}
              value={formatJSON(data.body)}
              multiline
              editable={false}
            />
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  payloadContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  payloadTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000000',
  },
  payloadSection: {
    marginBottom: 12,
  },
  payloadLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: '#666666',
  },
  payloadValue: {
    fontSize: 12,
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  payloadScrollView: {
    maxHeight: 200,
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    padding: 8,
  },
  payloadText: {
    fontSize: 11,
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    padding: 0,
  },
  headersContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    padding: 8,
    marginTop: 4,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerKey: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976D2',
    marginRight: 8,
    minWidth: 120,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  headerValue: {
    fontSize: 12,
    color: '#000000',
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
