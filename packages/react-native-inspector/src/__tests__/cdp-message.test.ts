/**
 * CDP message utilities tests / CDP 메시지 유틸 테스트
 * Covers sendCDPMessage when getCDPSender is null / sendCDPMessage (sender null 시)
 */
import { describe, test, expect } from 'bun:test';
import { sendCDPMessage } from '../cdp-message';

describe('cdp-message', () => {
  test('sendCDPMessage returns without throwing when getCDPSender is null / sender null 시 예외 없이 반환', async () => {
    await expect(sendCDPMessage('localhost', 8080, { id: 1, result: {} })).resolves.toBeUndefined();
  });
});
