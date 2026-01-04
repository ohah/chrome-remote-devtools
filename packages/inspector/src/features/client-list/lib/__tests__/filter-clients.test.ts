// filterClients function tests / filterClients 함수 테스트
import { describe, test, expect } from 'bun:test';
import { filterClients } from '../filter-clients';
import type { Client } from '@/entities/client';

describe('filterClients', () => {
  const mockClients: Client[] = [
    {
      id: 'client-1',
      type: 'web',
      url: 'http://example.com',
      title: 'Example Page',
      ua: 'Mozilla/5.0',
      ip: '127.0.0.1',
    },
    {
      id: 'client-2',
      type: 'web',
      url: 'http://test.com',
      title: 'Test Page',
      ua: 'Chrome/120.0',
      ip: '192.168.1.1',
    },
    {
      id: 'client-3',
      type: 'web',
      url: 'http://demo.org',
      title: 'Demo Page',
      ua: 'Firefox/121.0',
      ip: '10.0.0.1',
    },
    {
      id: 'rn-inspector-1',
      type: 'react-native',
      deviceName: 'sdk_gphone64_arm64',
      appName: 'com.chromeremotedevtools',
      deviceId: 'device-123',
      profiling: false,
    },
    {
      id: 'rn-inspector-2',
      type: 'react-native',
      deviceName: 'iPhone 15 Pro',
      appName: 'com.example.app',
      deviceId: 'device-456',
      profiling: true,
    },
  ];

  test('should return all clients when query is empty / 쿼리가 비어있을 때 모든 클라이언트를 반환해야 함', () => {
    const result = filterClients(mockClients, '');
    expect(result).toEqual(mockClients);
  });

  test('should return all clients when query is only whitespace / 쿼리가 공백만 있을 때 모든 클라이언트를 반환해야 함', () => {
    const result = filterClients(mockClients, '   ');
    expect(result).toEqual(mockClients);
  });

  test('should filter by title / 제목으로 필터링해야 함', () => {
    const result = filterClients(mockClients, 'Example');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('client-1');
  });

  test('should filter by URL / URL로 필터링해야 함', () => {
    const result = filterClients(mockClients, 'test.com');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('client-2');
  });

  test('should filter by ID / ID로 필터링해야 함', () => {
    const result = filterClients(mockClients, 'client-2');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('client-2');
  });

  test('should filter by user agent / User Agent로 필터링해야 함', () => {
    const result = filterClients(mockClients, 'Chrome');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('client-2');
  });

  test('should filter by IP address / IP 주소로 필터링해야 함', () => {
    const result = filterClients(mockClients, '127.0.0.1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('client-1');
  });

  test('should be case insensitive / 대소문자를 구분하지 않아야 함', () => {
    const result = filterClients(mockClients, 'EXAMPLE');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('client-1');
  });

  test('should match partial strings / 부분 문자열을 매칭해야 함', () => {
    const result = filterClients(mockClients, 'demo');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('client-3');
  });

  test('should return empty array when no matches / 매칭되는 것이 없을 때 빈 배열을 반환해야 함', () => {
    const result = filterClients(mockClients, 'nonexistent');
    expect(result).toHaveLength(0);
  });

  test('should handle clients with missing optional fields / 선택적 필드가 없는 클라이언트를 처리해야 함', () => {
    const clientsWithMissingFields: Client[] = [
      {
        id: 'client-1',
        type: 'web',
        // url, title, ua, ip 모두 없음
      },
      {
        id: 'client-2',
        type: 'web',
        url: 'http://test.com',
        // title, ua, ip 없음
      },
    ];

    // ID로 필터링은 작동해야 함
    const result1 = filterClients(clientsWithMissingFields, 'client-1');
    expect(result1).toHaveLength(1);

    // URL로 필터링도 작동해야 함
    const result2 = filterClients(clientsWithMissingFields, 'test.com');
    expect(result2).toHaveLength(1);
  });

  test('should handle empty clients array / 빈 클라이언트 배열을 처리해야 함', () => {
    const result = filterClients([], 'test');
    expect(result).toEqual([]);
  });

  test('should match multiple clients / 여러 클라이언트를 매칭해야 함', () => {
    const result = filterClients(mockClients, 'Page');
    expect(result).toHaveLength(3);
  });

  test('should filter React Native clients by device name / React Native 클라이언트를 디바이스 이름으로 필터링해야 함', () => {
    const result = filterClients(mockClients, 'sdk_gphone64');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('rn-inspector-1');
    expect(result[0].type).toBe('react-native');
  });

  test('should filter React Native clients by app name / React Native 클라이언트를 앱 이름으로 필터링해야 함', () => {
    const result = filterClients(mockClients, 'chromeremotedevtools');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('rn-inspector-1');
    expect(result[0].type).toBe('react-native');
  });

  test('should filter React Native clients by device ID / React Native 클라이언트를 디바이스 ID로 필터링해야 함', () => {
    const result = filterClients(mockClients, 'device-456');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('rn-inspector-2');
    expect(result[0].type).toBe('react-native');
  });

  test('should filter mixed web and React Native clients / 웹과 React Native 클라이언트를 혼합하여 필터링해야 함', () => {
    const result = filterClients(mockClients, 'example');
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('client-1');
    expect(result[0].type).toBe('web');
    expect(result[1].id).toBe('rn-inspector-2');
    expect(result[1].type).toBe('react-native');
  });

  test('should handle React Native clients with missing optional fields / 선택적 필드가 없는 React Native 클라이언트를 처리해야 함', () => {
    const rnClientsWithMissingFields: Client[] = [
      {
        id: 'rn-1',
        type: 'react-native',
        // deviceName, appName, deviceId 모두 없음
      },
      {
        id: 'rn-2',
        type: 'react-native',
        deviceName: 'Test Device',
        // appName, deviceId 없음
      },
    ];

    // ID로 필터링은 작동해야 함
    const result1 = filterClients(rnClientsWithMissingFields, 'rn-1');
    expect(result1).toHaveLength(1);

    // deviceName으로 필터링도 작동해야 함
    const result2 = filterClients(rnClientsWithMissingFields, 'Test Device');
    expect(result2).toHaveLength(1);
  });
});
