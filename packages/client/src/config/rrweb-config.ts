// Rrweb configuration types and utilities / Rrweb 설정 타입 및 유틸리티

/**
 * Rrweb configuration interface / Rrweb 설정 인터페이스
 */
export interface RrwebConfig {
  enable: boolean;
  flushIntervalMs?: number;
  maxBatchSize?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recordOptions?: Record<string, any>;
  // Event storage options / 이벤트 저장 옵션
  enableEventStorage?: boolean;
  enableCompression?: boolean;
  maxStoredEvents?: number;
  maxStorageSize?: number;
  storageSizeCheckInterval?: number;
  clearOnSend?: boolean;
}

/**
 * Get rrweb configuration from script element / 스크립트 요소에서 rrweb 설정 가져오기
 * @param script - Script element / 스크립트 요소
 * @returns Rrweb configuration / Rrweb 설정
 */
export function getRrwebConfig(script: HTMLScriptElement | null): RrwebConfig {
  if (!script) {
    return { enable: false };
  }

  const enableAttr = script.dataset.enableRrweb || script.getAttribute('data-enable-rrweb');
  const flushMsAttr = script.dataset.rrwebFlushMs || script.getAttribute('data-rrweb-flush-ms');
  const maxBatchAttr = script.dataset.rrwebMaxBatch || script.getAttribute('data-rrweb-max-batch');

  return {
    // Only enable if explicitly set to "true" / 명시적으로 "true"로 설정된 경우에만 활성화
    // In iframe mode, default is false (session replay is disabled) / iframe 모드에서는 기본값이 false (세션 리플레이 비활성화)
    enable: enableAttr === 'true',
    flushIntervalMs: flushMsAttr ? Number(flushMsAttr) : undefined,
    maxBatchSize: maxBatchAttr ? Number(maxBatchAttr) : undefined,
  };
}
