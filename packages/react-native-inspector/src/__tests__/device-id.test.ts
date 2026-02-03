/**
 * Device ID tests / device ID 테스트
 * Covers resolveDeviceId: optional deviceId, fallback to random UUID / resolveDeviceId: 선택적 deviceId, 미지정 시 랜덤 UUID
 */
import { describe, test, expect } from 'bun:test';
import { resolveDeviceId } from '../device-id';

describe('device-id', () => {
  test('resolveDeviceId without options returns UUID format / options 없으면 UUID 형식', () => {
    const id = resolveDeviceId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  test('resolveDeviceId with empty deviceId returns UUID / deviceId 비어 있으면 UUID', () => {
    const id = resolveDeviceId({ deviceId: '' });
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  test('resolveDeviceId with whitespace-only deviceId returns UUID / 공백만 있으면 UUID', () => {
    const id = resolveDeviceId({ deviceId: '   ' });
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  test('resolveDeviceId with deviceId returns that value / deviceId 지정 시 해당 값 반환', () => {
    const custom = 'my-device-123';
    expect(resolveDeviceId({ deviceId: custom })).toBe(custom);
  });

  test('resolveDeviceId trims deviceId / deviceId 앞뒤 공백 제거', () => {
    expect(resolveDeviceId({ deviceId: '  abc  ' })).toBe('abc');
  });
});
