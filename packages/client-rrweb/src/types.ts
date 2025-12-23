import type { eventWithTime } from '@rrweb/types';

/**
 * rrweb event type alias / rrweb 이벤트 타입 별칭
 */
export type RrwebEvent = eventWithTime;

/**
 * rrweb record options shape (partial) / rrweb record 옵션 형태(부분 정의)
 */
export interface RrwebRecordOptions {
  emit: (event: RrwebEvent) => void;
  // Allow rrweb options passthrough / rrweb 옵션 전달 허용
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

/**
 * rrweb record loader signature / rrweb record 로더 시그니처
 */
export type RrwebRecord = (options: RrwebRecordOptions) => () => void;

/**
 * rrweb envelope for transport / 전송용 rrweb 봉투
 */
export interface RrwebEnvelope {
  sessionId: string;
  events: RrwebEvent[];
  kind?: string;
}

/**
 * Transport contract / 전송 계층 계약
 */
export interface RrwebTransport {
  send(envelope: RrwebEnvelope): Promise<void>;
}

/**
 * Recorder creation options / 레코더 생성 옵션
 */
export interface RrwebPluginOptions {
  sessionId?: string;
  transport: RrwebTransport;
  recordOptions?: Omit<RrwebRecordOptions, 'emit'>;
  flushIntervalMs?: number;
  maxBatchSize?: number;
  onError?: (error: unknown) => void;
  kind?: string;
}

/**
 * Recorder handle / 레코더 핸들
 */
export interface RecorderHandle {
  start(): Promise<void>;
  stop(): void;
  pause(): void;
  resume(): Promise<void>;
  flush(): Promise<void>;
  isRecording(): boolean;
  getSessionId(): string;
}
