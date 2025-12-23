import { createEventBuffer } from './buffer';
import type {
  RecorderHandle,
  RrwebEnvelope,
  RrwebPluginOptions,
  RrwebRecord,
  RrwebRecordOptions,
  RrwebTransport,
} from './types';
import { createWebSocketTransport } from './transport/ws';

/**
 * Load rrweb record lazily / rrweb record를 지연 로드
 */
async function loadRecord(): Promise<RrwebRecord> {
  const mod = await import('@rrweb/record');
  const record = (mod as unknown as { record: RrwebRecord }).record;
  if (!record) {
    throw new Error('rrweb record not available / rrweb record를 찾을 수 없음');
  }
  return record;
}

/**
 * Create rrweb recorder / rrweb 레코더 생성
 */
export function initRrwebRecorder(options: RrwebPluginOptions): RecorderHandle {
  const {
    transport,
    recordOptions,
    flushIntervalMs = 2_000,
    maxBatchSize = 50,
    onError,
    sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind = 'rrweb',
  } = options;

  let stopRecord: (() => void) | null = null;
  const buffer = createEventBuffer(maxBatchSize);
  let flushTimer: ReturnType<typeof setTimeout> | null = null;
  let recording = false;
  let isFlushing = false; // Prevent concurrent flushes / 동시 flush 방지

  const envelopeBase: Pick<RrwebEnvelope, 'sessionId' | 'kind'> = { sessionId, kind };

  const flush = async (): Promise<void> => {
    // Skip if already flushing or buffer is empty / 이미 flush 중이거나 버퍼가 비어있으면 스킵
    if (isFlushing || buffer.size() === 0) return;

    isFlushing = true;
    const events = buffer.drain();
    try {
      await transport.send({ ...envelopeBase, events });
    } catch (error) {
      onError?.(error);
    } finally {
      isFlushing = false;
    }
  };

  const start = async (): Promise<void> => {
    if (recording) return;
    const record = await loadRecord();

    const recordOpts: RrwebRecordOptions = {
      ...recordOptions,
      emit(event) {
        const shouldFlush = buffer.push(event);
        if (shouldFlush) {
          void flush();
        }
      },
    };

    stopRecord = record(recordOpts);
    recording = true;

    // Use setTimeout chain instead of setInterval to avoid overlapping flushes / 중복 flush 방지를 위해 setInterval 대신 setTimeout 체인 사용
    const scheduleFlush = () => {
      flushTimer = setTimeout(() => {
        void flush().finally(() => {
          if (recording) {
            scheduleFlush();
          }
        });
      }, flushIntervalMs);
    };
    scheduleFlush();
  };

  const stop = (): void => {
    if (!recording) return;
    stopRecord?.();
    stopRecord = null;
    recording = false;
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    buffer.clear();
    isFlushing = false;
  };

  const pause = (): void => {
    if (!recording) return;
    stopRecord?.();
    stopRecord = null;
    recording = false;
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    // Flush remaining events before pausing / 일시 중지 전 남은 이벤트 전송
    void flush();
  };

  const resume = async (): Promise<void> => {
    if (recording) return;
    await start();
  };

  return {
    start,
    stop,
    pause,
    resume,
    flush,
    isRecording(): boolean {
      return recording;
    },
    getSessionId(): string {
      return sessionId;
    },
  };
}

/**
 * Helper to build WS transport / WS 전송 생성 헬퍼
 */
export function createDefaultWsTransport(params: {
  socket: WebSocket;
  kind?: string;
}): RrwebTransport {
  return createWebSocketTransport(params);
}
