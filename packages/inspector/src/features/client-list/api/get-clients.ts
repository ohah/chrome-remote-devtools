// Get clients from server / 서버에서 클라이언트 목록 가져오기
import type { Client } from '@/entities/client';
import { SERVER_URL } from '@/shared/lib';

// Fetch clients list / 클라이언트 목록 가져오기
export async function getClients(): Promise<Client[]> {
  try {
    const response = await fetch(`${SERVER_URL}/json/clients`);
    const data = await response.json();
    return data.clients || [];
  } catch (error) {
    console.error('Failed to fetch clients:', error);
    return [];
  }
}
