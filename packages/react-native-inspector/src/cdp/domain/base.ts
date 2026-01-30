// CDP event send path (aligned with web BaseDomain.send) / CDP 이벤트 전송 경로 (웹 BaseDomain.send와 동일)
// Same role as web client BaseDomain.send / 웹 클라이언트 BaseDomain.send와 동일한 역할

import { getServerInfo } from '../../server-info';

/** Original console.error at module load; used in sendCDPEvent catch to avoid re-entering console hook / 모듈 로드 시점의 console.error; sendCDPEvent catch에서 콘솔 훅 재진입 방지 */
const originalConsoleError = console.error.bind(console);

/** CDP event payload (method + params), same shape as web BaseDomain.send(data) / CDP 이벤트 페이로드 (웹 BaseDomain.send(data)와 동일) */
export interface CDPEventMessage {
  method: string;
  params?: unknown;
}

export type CDPEventSender = (host: string, port: number, message: string) => void;

let cdpEventSender: CDPEventSender | null = null;
let isCDPConnectionReady = false;

/**
 * Set CDP event sender (used by runtime/network hooks) / CDP 이벤트 전송자 설정 (runtime·network 훅에서 사용)
 */
export function setCDPEventSender(sender: CDPEventSender | null): void {
  cdpEventSender = sender;
}

/**
 * Mark connection ready for CDP events (or reset when false, e.g. in tests) / CDP 이벤트용 연결 준비 표시 (false 시 초기화, 테스트 등)
 * @param ready true to mark ready, false to reset / true면 준비 완료, false면 초기화
 */
export function setCDPConnectionReady(ready: boolean = true): void {
  isCDPConnectionReady = ready;
}

/**
 * Send CDP event (method + params) to server / CDP 이벤트를 서버로 전송
 * Same code shape as web client BaseDomain.send / 웹 클라이언트 BaseDomain.send와 동일한 형태
 */
export function sendCDPEvent(data: CDPEventMessage): void {
  if (!cdpEventSender || !isCDPConnectionReady) return;
  const serverInfo = getServerInfo();
  if (!serverInfo) return;
  try {
    const messageStr = JSON.stringify(data);
    cdpEventSender(serverInfo.host, serverInfo.port, messageStr);
  } catch (e) {
    originalConsoleError(
      '[CDPMessage] Failed to stringify CDP event (e.g. circular ref, BigInt):',
      e
    );
  }
}
