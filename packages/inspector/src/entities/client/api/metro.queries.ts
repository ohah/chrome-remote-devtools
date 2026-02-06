// Metro targets React Query / Metro 타깃 React Query
import { queryOptions } from '@tanstack/react-query';
import { getMetroTargets } from './get-metro-targets';

/**
 * Query key factory for Metro targets / Metro 타깃 쿼리 키 팩토리
 */
export const metroQueries = {
  all: () => ['metro-targets'] as const,
  list: (metroUrl: string | null) => [...metroQueries.all(), metroUrl ?? ''] as const,

  /**
   * Query options for Metro targets list (/json/list) / Metro 타깃 목록 쿼리 옵션
   */
  listOptions: (metroUrl: string | null) =>
    queryOptions({
      queryKey: metroQueries.list(metroUrl),
      queryFn: () => getMetroTargets(metroUrl),
      enabled: !!metroUrl?.trim(),
      staleTime: 3000, // Refetch every 3s considered stale / 3초마다 stale로 간주
      refetchInterval: 5000, // Poll every 5s / 5초마다 폴링
      // Keep previous list visible while refetching to avoid flicker; list updates every 5s. / 리패치 시 깜빡임 방지; 목록은 5초마다 갱신
      placeholderData: (previousData) => previousData,
    }),
};
