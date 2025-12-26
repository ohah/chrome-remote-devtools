// getClients API function tests / getClients API 함수 테스트
import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import { getClients, GetClientsError } from '../get-clients';
import type { Client } from '@/entities/client';
import { setServerUrl, resetServerUrl } from '@/shared/lib/server-url';

describe('getClients', () => {
  let originalFetch: typeof fetch;
  const mockServerUrl = 'http://localhost:8080';

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    // Set server URL for tests / 테스트를 위해 서버 URL 설정
    setServerUrl(mockServerUrl);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    // Reset server URL after tests / 테스트 후 서버 URL 재설정
    resetServerUrl();
  });

  test('should fetch clients successfully / 클라이언트를 성공적으로 가져와야 함', async () => {
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
        ua: 'Mozilla/5.0',
        ip: '192.168.1.1',
      },
    ];

    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ clients: mockClients }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    ) as unknown as typeof fetch;

    const result = await getClients();

    expect(result).toEqual(mockClients);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  test('should throw GetClientsError when response is not ok / 응답이 ok가 아닐 때 GetClientsError를 throw해야 함', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          statusText: 'Not Found',
        })
      )
    ) as unknown as typeof fetch;

    await expect(getClients()).rejects.toThrow(GetClientsError);
    await expect(getClients()).rejects.toThrow('Failed to fetch clients: 404 Not Found');
  });

  test('should throw GetClientsError when response format is invalid / 응답 형식이 유효하지 않을 때 GetClientsError를 throw해야 함', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ clients: 'not an array' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    ) as unknown as typeof fetch;

    await expect(getClients()).rejects.toThrow(GetClientsError);
    await expect(getClients()).rejects.toThrow('Invalid response format: clients is not an array');
  });

  test('should throw GetClientsError when clients is missing / clients가 없을 때 GetClientsError를 throw해야 함', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    ) as unknown as typeof fetch;

    await expect(getClients()).rejects.toThrow(GetClientsError);
    await expect(getClients()).rejects.toThrow('Invalid response format: clients is not an array');
  });

  test('should throw GetClientsError on network error / 네트워크 에러 시 GetClientsError를 throw해야 함', async () => {
    const networkError = new Error('Network error');
    globalThis.fetch = mock(() => Promise.reject(networkError)) as unknown as typeof fetch;

    await expect(getClients()).rejects.toThrow(GetClientsError);
    await expect(getClients()).rejects.toThrow('Failed to fetch clients');
  });

  test('should handle empty clients array / 빈 클라이언트 배열을 처리해야 함', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ clients: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    ) as unknown as typeof fetch;

    const result = await getClients();

    expect(result).toEqual([]);
  });

  test('should preserve error cause / 에러 원인을 보존해야 함', async () => {
    const networkError = new Error('Network error');
    globalThis.fetch = mock(() => Promise.reject(networkError)) as unknown as typeof fetch;

    try {
      await getClients();
      expect(true).toBe(false); // Should not reach here / 여기에 도달하면 안 됨
    } catch (error) {
      expect(error).toBeInstanceOf(GetClientsError);
      if (error instanceof GetClientsError) {
        expect(error.cause).toBe(networkError);
      }
    }
  });
});
