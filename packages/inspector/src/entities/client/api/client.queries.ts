// Client queries factory / 클라이언트 쿼리 팩토리
import { queryOptions } from '@tanstack/react-query';
import { getClients } from './get-clients';
import { CLIENT_REFRESH_INTERVAL } from '@/shared/lib';

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
   * Uses refetchInterval for auto-refresh / 자동 새로고침을 위해 refetchInterval 사용
   */
  list: () =>
    queryOptions({
      queryKey: clientQueries.lists(),
      queryFn: getClients,
      refetchInterval: CLIENT_REFRESH_INTERVAL,
      staleTime: 0, // Always consider data stale for real-time updates / 실시간 업데이트를 위해 항상 stale로 간주
    }),
};
