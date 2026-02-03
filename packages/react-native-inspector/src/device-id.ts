// Device ID for inspector WebSocket / Inspector WebSocket용 device ID
// User can pass deviceId in options; otherwise a random UUID is generated / 사용자가 options에 deviceId를 넘기거나, 미지정 시 임의 UUID 생성

/**
 * Generate a random UUID v4 string / 랜덤 UUID v4 문자열 생성
 */
function generateRandomUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Resolve device ID: use provided value or generate random UUID / device ID 결정: 지정값 사용 또는 랜덤 UUID 생성
 * @param options Optional: deviceId to use as inspector device identifier / (선택) Inspector 기기 식별자로 쓸 deviceId
 * @returns Device ID string (non-empty) / device ID 문자열 (비어 있지 않음)
 */
export function resolveDeviceId(options?: { deviceId?: string }): string {
  const provided = options?.deviceId;
  if (provided != null && String(provided).trim().length > 0) {
    return String(provided).trim();
  }
  return generateRandomUuid();
}
