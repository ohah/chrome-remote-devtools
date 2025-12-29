// Types for replay functionality / Replay 기능을 위한 타입 정의
import type { PostMessageCDPMessage } from '@/shared/lib/file-to-cdp';

/**
 * CDP message array type / CDP 메시지 배열 타입
 */
export type CDPMessageArray = PostMessageCDPMessage[];

/**
 * Storage items type / Storage 항목 타입
 */
export interface StorageItems {
  localStorage: Array<[string, string]>;
  sessionStorage: Array<[string, string]>;
}

/**
 * Cookie type / 쿠키 타입
 */
export interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
}

/**
 * DOM tree type / DOM 트리 타입
 */
export interface DOMTree {
  root: unknown;
}

/**
 * Response body store interface / 응답 본문 저장소 인터페이스
 */
export interface ResponseBodyStore {
  store(requestId: string, body: string): void;
  get(requestId: string): string | undefined;
  has(requestId: string): boolean;
  clear(): void;
}
