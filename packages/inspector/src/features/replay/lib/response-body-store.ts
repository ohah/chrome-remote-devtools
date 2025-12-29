// Response body store for replay mode / replay 모드를 위한 응답 본문 저장소
import type { ResponseBodyStore } from '../types';

/**
 * Create response body store / 응답 본문 저장소 생성
 * @returns Response body store instance / 응답 본문 저장소 인스턴스
 */
export function createResponseBodyStore(): ResponseBodyStore {
  // Internal storage / 내부 저장소
  const storage = new Map<string, string>();

  return {
    /**
     * Store response body from responseReceived event / responseReceived 이벤트에서 응답 본문 저장
     * @param requestId - Request identifier / 요청 식별자
     * @param body - Response body / 응답 본문
     */
    store(requestId: string, body: string): void {
      if (requestId && body) {
        storage.set(requestId, body);
      }
    },

    /**
     * Get stored response body / 저장된 응답 본문 가져오기
     * @param requestId - Request identifier / 요청 식별자
     * @returns Response body or undefined / 응답 본문 또는 undefined
     */
    get(requestId: string): string | undefined {
      return storage.get(requestId);
    },

    /**
     * Check if response body exists / 응답 본문 존재 여부 확인
     * @param requestId - Request identifier / 요청 식별자
     * @returns True if exists / 존재하면 true
     */
    has(requestId: string): boolean {
      return storage.has(requestId);
    },

    /**
     * Clear all stored response bodies / 저장된 모든 응답 본문 삭제
     */
    clear(): void {
      storage.clear();
    },
  };
}
