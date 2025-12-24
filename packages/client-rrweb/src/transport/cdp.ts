import type { RrwebEnvelope, RrwebTransport } from '../types';

/**
 * Create CDP transport for rrweb events / rrweb 이벤트를 위한 CDP 전송 생성
 */
export function createCDPTransport(params: {
  executeCDP: (method: string, params?: unknown) => { result?: unknown; error?: unknown };
}): RrwebTransport {
  const { executeCDP } = params;

  return {
    async send(envelope: RrwebEnvelope): Promise<void> {
      // Send as CDP method call / CDP 메서드 호출로 전송
      const result = executeCDP('SessionReplay.sendEvent', { events: envelope.events });
      if (result.error) {
        throw new Error(`Failed to send rrweb events: ${JSON.stringify(result.error)}`);
      }
    },
  };
}
