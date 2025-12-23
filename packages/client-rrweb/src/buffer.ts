import type { RrwebEvent } from './types';

/**
 * Simple in-memory buffer / 메모리 버퍼
 */
export interface EventBuffer {
  push(event: RrwebEvent): boolean;
  drain(): RrwebEvent[];
  clear(): void;
  size(): number;
}

/**
 * Create event buffer with max batch / 최대 배치를 가진 버퍼 생성
 */
export function createEventBuffer(maxBatchSize: number): EventBuffer {
  const queue: RrwebEvent[] = [];

  return {
    push(event: RrwebEvent): boolean {
      queue.push(event);
      return queue.length >= maxBatchSize;
    },
    drain(): RrwebEvent[] {
      const items = queue.splice(0, queue.length);
      return items;
    },
    clear(): void {
      queue.length = 0;
    },
    size(): number {
      return queue.length;
    },
  };
}
