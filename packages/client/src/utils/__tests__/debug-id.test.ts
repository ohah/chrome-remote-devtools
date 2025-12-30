// Debug ID tests / 디버그 ID 테스트
import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { getId } from '../debug-id';

describe('Debug ID', () => {
  beforeEach(() => {
    // Clear sessionStorage before each test / 각 테스트 전에 sessionStorage 정리
    sessionStorage.clear();
  });

  test('should generate new ID when sessionStorage is empty / sessionStorage가 비어있을 때 새 ID 생성', () => {
    const id = getId();

    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  test('should return same ID on subsequent calls / 이후 호출에서 같은 ID 반환', () => {
    const id1 = getId();
    const id2 = getId();
    const id3 = getId();

    expect(id1).toBe(id2);
    expect(id2).toBe(id3);
  });

  test('should store ID in sessionStorage / ID를 sessionStorage에 저장', () => {
    const id = getId();
    const storedId = sessionStorage.getItem('debug_id');

    expect(storedId).toBe(id);
  });

  test('should retrieve ID from sessionStorage / sessionStorage에서 ID 가져오기', () => {
    // Set ID manually / ID를 수동으로 설정
    const testId = 'test-debug-id-123';
    sessionStorage.setItem('debug_id', testId);

    const id = getId();

    expect(id).toBe(testId);
  });

  test('should use crypto.randomUUID when available / crypto.randomUUID 사용 가능 시 사용', () => {
    // Mock crypto.randomUUID / crypto.randomUUID 모킹
    const mockUUID = '550e8400-e29b-41d4-a716-446655440000';
    const originalRandomUUID = crypto.randomUUID;

    (crypto as any).randomUUID = mock(() => mockUUID);

    sessionStorage.clear();
    const id = getId();

    expect(id).toBe(mockUUID);
    expect(sessionStorage.getItem('debug_id')).toBe(mockUUID);

    // Restore / 복원
    crypto.randomUUID = originalRandomUUID;
  });

  test('should use fallback when crypto.randomUUID is not available / crypto.randomUUID이 없을 때 폴백 사용', () => {
    // Mock crypto to not have randomUUID / crypto에 randomUUID가 없도록 모킹
    const originalCrypto = globalThis.crypto;
    const mockCrypto = {
      ...originalCrypto,
      randomUUID: undefined,
    };

    Object.defineProperty(globalThis, 'crypto', {
      value: mockCrypto,
      configurable: true,
      writable: true,
    });

    sessionStorage.clear();
    const id = getId();

    // Fallback format: timestamp-random1-random2-random3 / 폴백 형식: timestamp-random1-random2-random3
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
    expect(id).toMatch(/^\d+-\d+\.\d+-[a-z0-9]+-[a-z0-9]+-[a-z0-9]+$/);

    // Restore / 복원
    Object.defineProperty(globalThis, 'crypto', {
      value: originalCrypto,
      configurable: true,
      writable: true,
    });
  });

  test('should generate unique IDs for different sessions / 다른 세션에 대해 고유한 ID 생성', () => {
    // Simulate different sessions by clearing storage / 저장소를 정리하여 다른 세션 시뮬레이션
    sessionStorage.clear();
    const id1 = getId();

    sessionStorage.clear();
    const id2 = getId();

    // IDs should be different / ID는 달라야 함
    expect(id1).not.toBe(id2);
  });

  test('should handle sessionStorage errors gracefully / sessionStorage 오류를 우아하게 처리', () => {
    // Mock sessionStorage to throw error / sessionStorage가 오류를 던지도록 모킹
    const originalGetItem = sessionStorage.getItem;
    const originalSetItem = sessionStorage.setItem;

    sessionStorage.getItem = mock(() => null);
    sessionStorage.setItem = mock(() => {
      throw new Error('QuotaExceededError');
    });

    // Should not throw / 오류를 던지지 않아야 함
    expect(() => {
      const id = getId();
      expect(id).toBeTruthy();
    }).not.toThrow();

    // Restore / 복원
    sessionStorage.getItem = originalGetItem;
    sessionStorage.setItem = originalSetItem;
  });

  test('should generate valid UUID format when using crypto.randomUUID / crypto.randomUUID 사용 시 유효한 UUID 형식 생성', () => {
    const originalRandomUUID = crypto.randomUUID;
    const mockUUID = '123e4567-e89b-12d3-a456-426614174000';

    (crypto as any).randomUUID = mock(() => mockUUID);

    sessionStorage.clear();
    const id = getId();

    // UUID format: 8-4-4-4-12 / UUID 형식: 8-4-4-4-12
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

    // Restore / 복원
    crypto.randomUUID = originalRandomUUID;
  });
});
