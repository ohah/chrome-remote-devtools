/**
 * Subscribe to client list changes via SSE and update React Query cache / SSE로 클라이언트 목록 변경 구독 후 React Query 캐시 갱신
 */
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { Client } from '../model/types';
import { useServerUrl } from '@/shared/lib';
import { clientQueries } from './client.queries';

/**
 * Subscribe to GET /json/clients/events (SSE) and set client list in React Query cache on each event.
 * Call this once in the app root or layout when serverUrl is set.
 * SSE로 /json/clients/events 구독, 이벤트마다 클라이언트 목록을 React Query 캐시에 반영. serverUrl이 설정된 루트/레이아웃에서 한 번 호출.
 */
export function useClientsListSSE(): void {
  const queryClient = useQueryClient();
  const { serverUrl } = useServerUrl();

  useEffect(() => {
    if (!serverUrl) return;

    const url = `${serverUrl.replace(/\/$/, '')}/json/clients/events`;
    const eventSource = new EventSource(url);

    const handleMessage = (event: MessageEvent<string>) => {
      try {
        const data = JSON.parse(event.data) as { clients?: unknown };
        if (!Array.isArray(data.clients)) return;
        queryClient.setQueryData<Client[]>(clientQueries.lists(), data.clients as Client[]);
      } catch {
        // Ignore parse errors / 파싱 오류 무시
      }
    };

    eventSource.onopen = () => {
      // SSE connection established; EventSource will auto-reconnect on close / SSE 연결 성공; EventSource는 종료 시 자동 재연결
    };
    eventSource.onmessage = handleMessage;
    eventSource.onerror = () => {
      // EventSource auto-reconnects on error; no close() here / 오류 시 EventSource가 자동 재연결하므로 close() 호출 안 함
    };

    return () => {
      eventSource.onopen = null;
      eventSource.onmessage = null;
      eventSource.onerror = null;
      eventSource.close();
    };
  }, [serverUrl, queryClient]);
}
