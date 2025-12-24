// Compression utilities using CompressionStream API / CompressionStream API를 사용한 압축 유틸리티
/**
 * Check if CompressionStream API is supported / CompressionStream API 지원 여부 확인
 */
export function isCompressionSupported(): boolean {
  return typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';
}

/**
 * Compress data using CompressionStream API / CompressionStream API를 사용한 데이터 압축
 * @param data - Data to compress / 압축할 데이터
 * @returns Compressed data as ArrayBuffer / 압축된 데이터 (ArrayBuffer)
 */
export async function compress(data: string): Promise<ArrayBuffer | null> {
  if (!isCompressionSupported()) {
    return null;
  }

  try {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(data));
        controller.close();
      },
    });

    const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
    const response = new Response(compressedStream);
    return await response.arrayBuffer();
  } catch (error) {
    console.error('Compression failed / 압축 실패:', error);
    return null;
  }
}

/**
 * Decompress data using DecompressionStream API / DecompressionStream API를 사용한 데이터 압축 해제
 * @param compressedData - Compressed data / 압축된 데이터
 * @returns Decompressed data as string / 압축 해제된 데이터 (string)
 */
export async function decompress(compressedData: ArrayBuffer): Promise<string | null> {
  if (!isCompressionSupported()) {
    return null;
  }

  try {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(compressedData);
        controller.close();
      },
    });

    const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
    const response = new Response(decompressedStream);
    const arrayBuffer = await response.arrayBuffer();
    const decoder = new TextDecoder();
    return decoder.decode(arrayBuffer);
  } catch (error) {
    console.error('Decompression failed / 압축 해제 실패:', error);
    return null;
  }
}

/**
 * Check if data is compressed (has gzip magic bytes) / 데이터가 압축되었는지 확인 (gzip 매직 바이트 확인)
 * @param data - Data to check / 확인할 데이터
 * @returns True if data appears to be compressed / 압축된 것으로 보이면 true
 */
export function isCompressed(data: ArrayBuffer): boolean {
  if (!data || data.byteLength < 3) {
    return false;
  }
  const view = new Uint8Array(data);
  // Gzip magic bytes: 0x1F 0x8B 0x08 / Gzip 매직 바이트
  return view[0] === 0x1f && view[1] === 0x8b && view[2] === 0x08;
}
