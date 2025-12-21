// filterClients function tests / filterClients 함수 테스트
import { describe, test, expect } from 'bun:test';
import { filterClients } from '../filter-clients';
import type { Client } from '@/entities/client';

describe('filterClients', () => {
  const mockClients: Client[] = [
    {
      id: 'client-1',
      url: 'http://example.com',
      title: 'Example Page',
      ua: 'Mozilla/5.0',
      ip: '127.0.0.1',
    },
    {
      id: 'client-2',
      url: 'http://test.com',
      title: 'Test Page',
      ua: 'Chrome/120.0',
      ip: '192.168.1.1',
    },
    {
      id: 'client-3',
      url: 'http://demo.org',
      title: 'Demo Page',
      ua: 'Firefox/121.0',
      ip: '10.0.0.1',
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
        // url, title, ua, ip 모두 없음
      },
      {
        id: 'client-2',
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
});
