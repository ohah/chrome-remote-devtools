/**
 * Device ID tests / device ID 테스트
 * Covers resolveDeviceId: deviceId required, throws when missing/empty / resolveDeviceId: deviceId 필수, 없거나 비어 있으면 throw
 */
import { describe, test, expect } from 'bun:test';
import { resolveDeviceId } from '../device-id';

describe('device-id', () => {
  test('resolveDeviceId throws when deviceId is empty / deviceId 비어 있으면 throw', () => {
    expect(() => resolveDeviceId({ deviceId: '' })).toThrow(/deviceId is required/);
  });

  test('resolveDeviceId throws when deviceId is whitespace-only / 공백만 있으면 throw', () => {
    expect(() => resolveDeviceId({ deviceId: '   ' })).toThrow(/deviceId is required/);
  });

  test('resolveDeviceId with deviceId returns that value / deviceId 지정 시 해당 값 반환', () => {
    const custom = 'my-device-123';
    expect(resolveDeviceId({ deviceId: custom })).toBe(custom);
  });

  test('resolveDeviceId trims deviceId / deviceId 앞뒤 공백 제거', () => {
    expect(resolveDeviceId({ deviceId: '  abc  ' })).toBe('abc');
  });
});
