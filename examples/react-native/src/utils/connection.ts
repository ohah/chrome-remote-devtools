/**
 * Connection utility functions / 연결 유틸리티 함수
 */

// Connection status type / 연결 상태 타입
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Validate server URL / 서버 URL 검증
 * @param url - Server URL / 서버 URL
 * @returns True if valid / 유효하면 true
 */
export function isValidServerUrl(url: string): boolean {
  if (!url || url.trim() === '') {
    return false;
  }

  // Check if URL starts with ws:// or wss:// / ws:// 또는 wss://로 시작하는지 확인
  const wsPattern = /^(ws|wss):\/\/.+/;
  return wsPattern.test(url.trim());
}

/**
 * Format server URL / 서버 URL 포맷팅
 * @param url - Server URL / 서버 URL
 * @returns Formatted URL / 포맷된 URL
 */
export function formatServerUrl(url: string): string {
  const trimmed = url.trim();

  // If no protocol, add ws:// / 프로토콜이 없으면 ws:// 추가
  if (!trimmed.startsWith('ws://') && !trimmed.startsWith('wss://')) {
    return `ws://${trimmed}`;
  }

  return trimmed;
}

/**
 * Get default server URL / 기본 서버 URL 가져오기
 * @returns Default server URL / 기본 서버 URL
 */
export function getDefaultServerUrl(): string {
  // In development, use localhost / 개발 환경에서는 localhost 사용
  return 'ws://localhost:8080';
}
