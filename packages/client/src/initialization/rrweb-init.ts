// Rrweb initialization / Rrweb 초기화
import type ChromeDomain from '../cdp';
import type { RrwebConfig } from '../config/rrweb-config';

/**
 * Rrweb recorder handle interface / Rrweb 레코더 핸들 인터페이스
 */
export interface RrwebRecorderHandle {
  pause: () => void;
  resume: () => Promise<void>;
  stop: () => void;
}

/**
 * Initialize rrweb recording / rrweb 녹화 초기화
 * @param socket - WebSocket connection / WebSocket 연결
 * @param config - Rrweb configuration / Rrweb 설정
 * @param domain - Chrome domain instance / Chrome 도메인 인스턴스
 * @returns Recorder handle or null / 레코더 핸들 또는 null
 */
export async function initRrwebRecording(
  socket: WebSocket | null,
  config: RrwebConfig,
  domain: ChromeDomain
): Promise<RrwebRecorderHandle | null> {
  if (!config.enable) {
    return null;
  }

  try {
    const { createDefaultCDPTransport, initRrwebRecorder } =
      await import('@ohah/chrome-remote-devtools-client-rrweb');

    // Enable SessionReplay domain via CDP method / CDP 메서드로 SessionReplay 도메인 활성화
    domain.execute({ method: 'SessionReplay.enable' });

    const baseRecordOptions = config.recordOptions ?? {};
    const transport = createDefaultCDPTransport({
      executeCDP: (method: string, params?: unknown) => {
        const result = domain.execute({ method, params });
        // executeCDP is synchronous, but we handle async internally / executeCDP는 동기이지만 내부적으로 async 처리
        if (result instanceof Promise) {
          // For async methods, return immediately with error / async 메서드의 경우 즉시 에러 반환
          // This shouldn't happen for sendEvent which is synchronous / sendEvent는 동기이므로 발생하지 않아야 함
          return { error: { message: 'Async method not supported in executeCDP' } };
        }
        return { result: result.result, error: result.error };
      },
    });
    const recorder = initRrwebRecorder({
      transport,
      flushIntervalMs: config.flushIntervalMs,
      maxBatchSize: config.maxBatchSize,
      recordOptions: {
        // Start recording immediately without waiting for load / 로드를 기다리지 않고 즉시 녹화 시작
        // recordAfter: 'load' removed to prevent infinite reload loops / 무한 리로드 루프 방지를 위해 recordAfter: 'load' 제거

        // Force full snapshot generation / 풀 스냅샷 강제 생성
        checkoutEveryNth: 1,

        // Use rr-block class to block elements from recording / rr-block 클래스를 사용하여 요소를 기록에서 제외
        // DevTools iframe should have 'rr-block' class / DevTools iframe은 'rr-block' 클래스를 가져야 함
        blockClass: 'rr-block',
        // Block script tags, meta refresh tags, and iframes to prevent reload issues / 리로드 문제 방지를 위해 script 태그, meta refresh 태그, iframe 제외
        blockSelector: 'script, meta[http-equiv="refresh"], iframe',
        // Add ignoreClass for dynamic elements / 동적 요소를 위한 ignoreClass 추가
        ignoreClass: 'rr-ignore',
        // Mask all inputs to prevent sensitive data recording / 민감한 데이터 기록 방지를 위해 모든 입력 마스킹
        maskAllInputs: true,
        ...baseRecordOptions,
      },
      kind: 'rrweb',
      onError: (error) => {
        console.warn('rrweb recorder error / rrweb 레코더 오류:', error);
      },
    });

    await recorder.start();

    // Only add socket close listener if socket exists / socket이 존재하는 경우에만 close 리스너 추가
    if (socket) {
      socket.addEventListener('close', () => {
        recorder.stop();
      });
    }

    return recorder;
  } catch (error) {
    console.error('Failed to start rrweb recorder / rrweb 레코더 시작 실패:', error);
    return null;
  }
}
