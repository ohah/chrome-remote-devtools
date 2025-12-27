// Rrweb configuration types and utilities / Rrweb 설정 타입 및 유틸리티

/**
 * Rrweb configuration interface / Rrweb 설정 인터페이스
 */
export interface RrwebConfig {
  enable: boolean;
  flushIntervalMs?: number;
  maxBatchSize?: number;
  recordOptions?: Record<string, any>;
  // Event storage options / 이벤트 저장 옵션
  enableEventStorage?: boolean;
  enableCompression?: boolean;
  maxStoredEvents?: number;
  maxStorageSize?: number;
  storageSizeCheckInterval?: number;
  clearOnSend?: boolean;
  // Export button options / Export 버튼 옵션
  enableExportButton?: boolean;
}
