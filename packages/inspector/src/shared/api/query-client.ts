// QueryClient configuration / QueryClient 설정
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0, // Always consider data stale for real-time updates / 실시간 업데이트를 위해 항상 stale로 간주
      refetchOnWindowFocus: false, // Don't refetch on window focus / 윈도우 포커스 시 refetch 안 함
      retry: 1, // Retry once on failure / 실패 시 한 번 재시도
    },
  },
});

