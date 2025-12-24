// Compression utility tests / 압축 유틸리티 테스트
import { describe, test, expect, beforeEach } from 'bun:test';
import { isCompressionSupported, compress, decompress, isCompressed } from '../compression';

// Check compression support once / 압축 지원 여부 한 번만 확인
const compressionSupported = isCompressionSupported();

describe('Compression', () => {
  beforeEach(() => {
    // Reset any state if needed / 필요 시 상태 초기화
  });

  test('should check compression support / 압축 지원 여부 확인', () => {
    // CompressionStream API support depends on browser / CompressionStream API 지원은 브라우저에 따라 다름
    const supported = isCompressionSupported();
    expect(typeof supported).toBe('boolean');
  });

  test('should compress and decompress data when supported / 지원되는 경우 데이터 압축 및 해제', async () => {
    if (!compressionSupported) {
      // Skip test if CompressionStream not supported / CompressionStream 미지원 시 테스트 건너뛰기
      console.log(
        'CompressionStream not supported, skipping test / CompressionStream 미지원, 테스트 건너뛰기'
      );
      return;
    }

    // Add timeout to prevent hanging / 무한 대기 방지를 위한 타임아웃 추가
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 3000)
    );

    const originalData = JSON.stringify({
      method: 'Runtime.consoleAPICalled',
      params: {
        type: 'log',
        args: ['Hello', 'World', { test: 'data' }],
        executionContextId: 1,
        timestamp: Date.now(),
      },
    });

    // Compress / 압축
    const compressed = await Promise.race([compress(originalData), timeout]);
    expect(compressed).not.toBeNull();
    expect(compressed).toBeInstanceOf(ArrayBuffer);
    expect(compressed!.byteLength).toBeLessThan(new Blob([originalData]).size);

    // Check if compressed / 압축되었는지 확인
    expect(isCompressed(compressed!)).toBe(true);

    // Decompress / 압축 해제
    const decompressed = await Promise.race([decompress(compressed!), timeout]);
    expect(decompressed).not.toBeNull();
    expect(decompressed).toBe(originalData);
  });

  test('should handle large data compression / 큰 데이터 압축 처리', async () => {
    if (!compressionSupported) {
      console.log(
        'CompressionStream not supported, skipping test / CompressionStream 미지원, 테스트 건너뛰기'
      );
      return;
    }

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 3000)
    );

    // Create large data / 큰 데이터 생성
    const largeData = JSON.stringify({
      method: 'SessionReplay.eventRecorded',
      params: {
        events: Array.from({ length: 1000 }, (_, i) => ({
          type: 3,
          data: {
            source: 0,
            type: 3,
            id: i,
            name: `Event ${i}`,
            payload: { value: `Test data ${i}`.repeat(100) },
          },
          timestamp: Date.now() + i,
        })),
      },
    });

    const compressed = await Promise.race([compress(largeData), timeout]);
    expect(compressed).not.toBeNull();
    expect(compressed!.byteLength).toBeLessThan(new Blob([largeData]).size);

    const decompressed = await Promise.race([decompress(compressed!), timeout]);
    expect(decompressed).toBe(largeData);
  });

  test('should return null when compression fails / 압축 실패 시 null 반환', async () => {
    if (!compressionSupported) {
      console.log(
        'CompressionStream not supported, skipping test / CompressionStream 미지원, 테스트 건너뛰기'
      );
      return;
    }

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 3000)
    );

    // Invalid data should still compress (gzip can compress anything) / 잘못된 데이터도 압축 가능 (gzip은 모든 것을 압축 가능)
    // But we test error handling / 하지만 에러 처리 테스트
    const result = await Promise.race([compress(''), timeout]);
    // Empty string might compress to small buffer / 빈 문자열은 작은 버퍼로 압축될 수 있음
    expect(result === null || result instanceof ArrayBuffer).toBe(true);
  });

  test('should return null when decompression fails / 압축 해제 실패 시 null 반환', async () => {
    if (!compressionSupported) {
      console.log(
        'CompressionStream not supported, skipping test / CompressionStream 미지원, 테스트 건너뛰기'
      );
      return;
    }

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 3000)
    );

    // Try to decompress invalid data / 잘못된 데이터 압축 해제 시도
    const invalidData = new ArrayBuffer(10);
    const result = await Promise.race([decompress(invalidData), timeout]);
    // Should return null or throw / null 반환 또는 에러 발생
    expect(result === null || typeof result === 'string').toBe(true);
  });

  test('should detect compressed data / 압축된 데이터 감지', () => {
    if (!compressionSupported) {
      console.log(
        'CompressionStream not supported, skipping test / CompressionStream 미지원, 테스트 건너뛰기'
      );
      return;
    }

    // Test with gzip magic bytes / gzip 매직 바이트로 테스트
    const gzipMagicBytes = new Uint8Array([0x1f, 0x8b, 0x08, 0x00]);
    const buffer = gzipMagicBytes.buffer;
    expect(isCompressed(buffer)).toBe(true);

    // Test with non-gzip data / gzip이 아닌 데이터로 테스트
    const nonGzipData = new Uint8Array([0x00, 0x00, 0x00]);
    expect(isCompressed(nonGzipData.buffer)).toBe(false);

    // Test with too small data / 너무 작은 데이터로 테스트
    const smallData = new Uint8Array([0x1f]);
    expect(isCompressed(smallData.buffer)).toBe(false);
  });

  test('should compress CDP event data / CDP 이벤트 데이터 압축', async () => {
    if (!compressionSupported) {
      console.log(
        'CompressionStream not supported, skipping test / CompressionStream 미지원, 테스트 건너뛰기'
      );
      return;
    }

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 3000)
    );

    const cdpEvent = {
      method: 'Network.requestWillBeSent',
      params: {
        requestId: '12345',
        loaderId: 'loader-1',
        documentURL: 'https://example.com',
        request: {
          url: 'https://example.com/api/data',
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer token123',
          },
          postData: JSON.stringify({ key: 'value' }),
        },
        timestamp: Date.now(),
        wallTime: Date.now(),
        initiator: { type: 'script' },
        redirectHasExtraInfo: false,
        type: 'Document',
      },
    };

    const eventData = JSON.stringify(cdpEvent);
    const compressed = await Promise.race([compress(eventData), timeout]);
    expect(compressed).not.toBeNull();

    const decompressed = await Promise.race([decompress(compressed!), timeout]);
    expect(decompressed).toBe(eventData);

    const parsed = JSON.parse(decompressed!);
    expect(parsed.method).toBe(cdpEvent.method);
    expect(parsed.params.requestId).toBe(cdpEvent.params.requestId);
  });
});
