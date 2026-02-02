// Client queries factory / 클라이언트 쿼리 팩토리
import { queryOptions } from '@tanstack/react-query';
import { getClients } from './get-clients';

/**
 * Query key factory for clients / 클라이언트 쿼리 키 팩토리
 */
export const clientQueries = {
  /**
   * Base query key for all client queries / 모든 클라이언트 쿼리의 기본 키
   */
  all: () => ['clients'] as const,

  /**
   * Query key for clients list / 클라이언트 목록 쿼리 키
   */
  lists: () => [...clientQueries.all(), 'list'] as const,

  /**
   * Query options for clients list / 클라이언트 목록 쿼리 옵션
   * Initial fetch via getClients; live updates via SSE (useClientsListSSE) / 초기 로드는 getClients, 실시간 갱신은 SSE(useClientsListSSE)
   */
  list: () =>
    queryOptions({
      queryKey: clientQueries.lists(),
      queryFn: getClients,
      staleTime: 1000, // Consider data fresh for 1 second to reduce flickering / 플리커링 방지를 위해 1초간 fresh로 간주
      placeholderData: (previousData) => previousData, // Keep previous data while refetching / 새로고침 중에도 이전 데이터 유지
    }),
};
