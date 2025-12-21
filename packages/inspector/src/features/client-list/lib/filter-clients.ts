/**
 * Filter clients by search query / 검색 쿼리로 클라이언트 필터링
 */
import type { Client } from '@/entities/client';

/**
 * Filter clients based on search query / 검색 쿼리를 기반으로 클라이언트 필터링
 * @param clients - Array of clients to filter / 필터링할 클라이언트 배열
 * @param query - Search query string / 검색 쿼리 문자열
 * @returns Filtered array of clients / 필터링된 클라이언트 배열
 */
export function filterClients(clients: Client[], query: string): Client[] {
  if (!query.trim()) {
    return clients;
  }

  const lowerQuery = query.toLowerCase();

  return clients.filter((client) => {
    // Search in title, url, id, ua, ip / title, url, id, ua, ip에서 검색
    return (
      client.title?.toLowerCase().includes(lowerQuery) ||
      client.url?.toLowerCase().includes(lowerQuery) ||
      client.id.toLowerCase().includes(lowerQuery) ||
      client.ua?.toLowerCase().includes(lowerQuery) ||
      client.ip?.toLowerCase().includes(lowerQuery)
    );
  });
}
