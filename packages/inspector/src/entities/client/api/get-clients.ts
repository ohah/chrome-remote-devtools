// Get clients from server / 서버에서 클라이언트 목록 가져오기
import type { Client } from '@/entities/client';
import { SERVER_URL } from '@/shared/lib';

/**
 * Error thrown when fetching clients fails / 클라이언트 가져오기 실패 시 발생하는 에러
 */
export class GetClientsError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'GetClientsError';
  }
}

/**
 * Fetch clients list / 클라이언트 목록 가져오기
 * @throws {GetClientsError} When fetch fails or response is invalid / 가져오기 실패 또는 응답이 유효하지 않을 때
 */
export async function getClients(): Promise<Client[]> {
  try {
    const response = await fetch(`${SERVER_URL}/json/clients`);

    if (!response.ok) {
      throw new GetClientsError(
        `Failed to fetch clients: ${response.status} ${response.statusText}`,
        { status: response.status, statusText: response.statusText }
      );
    }

    const data = await response.json();

    if (!Array.isArray(data.clients)) {
      throw new GetClientsError('Invalid response format: clients is not an array', data);
    }

    return data.clients;
  } catch (error) {
    if (error instanceof GetClientsError) {
      throw error;
    }

    // Network error or other unexpected errors / 네트워크 에러 또는 기타 예상치 못한 에러
    throw new GetClientsError('Failed to fetch clients', error);
  }
}
