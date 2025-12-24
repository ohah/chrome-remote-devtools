// CDP protocol types / CDP 프로토콜 타입
import type { EventStorage } from '../persistence/event-storage';

/**
 * CDP message interface / CDP 메시지 인터페이스
 */
export interface CDPMessage {
  id?: number;
  method?: string;
  params?: unknown;
}

/**
 * CDP event interface / CDP 이벤트 인터페이스
 * Events have method and params but no id / 이벤트는 method와 params가 있지만 id는 없음
 */
export interface CDPEvent {
  method: string;
  params: unknown;
}

/**
 * CDP response interface / CDP 응답 인터페이스
 */
export interface CDPResponse {
  id?: number;
  result?: unknown;
  error?: { code: number; message: string };
}

/**
 * Domain options interface / 도메인 옵션 인터페이스
 * Used by all CDP domains / 모든 CDP 도메인에서 사용
 */
export interface DomainOptions {
  socket: WebSocket | null;
  eventStorage?: EventStorage;
}

/**
 * PostMessage CDP message format / PostMessage CDP 메시지 형식
 */
export interface PostMessageCDPMessage {
  type: 'CDP_MESSAGE';
  message: string;
}
