// Device ID for inspector WebSocket / Inspector WebSocket용 device ID
// deviceId is required; pass e.g. from react-native-device-info getUniqueId() / deviceId 필수, 예: react-native-device-info getUniqueId()로 전달

/**
 * Resolve device ID: required, returns trimmed value or throws / device ID 결정: 필수, trim된 값 반환 또는 throw
 * @param options Must include deviceId (e.g. from getUniqueId()) / deviceId 필수 (예: getUniqueId() 결과)
 * @returns Device ID string (non-empty, trimmed) / device ID 문자열 (비어 있지 않음, trim됨)
 * @throws When deviceId is missing or empty / deviceId가 없거나 비어 있으면
 */
export function resolveDeviceId(options: { deviceId: string }): string {
  const provided = options?.deviceId;
  const trimmed = provided != null ? String(provided).trim() : '';
  if (trimmed.length === 0) {
    throw new Error(
      '[ChromeRemoteDevTools] deviceId is required. Pass deviceId in connect(options) or Provider, e.g. from react-native-device-info getUniqueId().'
    );
  }
  return trimmed;
}
