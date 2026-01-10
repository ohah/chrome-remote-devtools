// Check if string looks like garbled (binary) data / 문자열이 깨진(바이너리) 데이터처럼 보이는지 확인

/**
 * Check if string looks like garbled (binary) data / 문자열이 깨진(바이너리) 데이터처럼 보이는지 확인
 */
export const looksLikeGarbled = (str: string): boolean => {
  // 1. Check for replacement character () / 대체 문자() 확인
  if (str.includes('\uFFFD')) return true;

  // 2. Check for unusual control characters / 비정상적인 제어 문자 확인
  // eslint-disable-next-line no-control-regex
  const controlChars = /[\u0000-\u001F\u007F-\u009F]/;
  if (controlChars.test(str)) return true;

  // 3. Optionally, check if most chars are non-printable / 선택적으로, 대부분의 문자가 비인쇄 가능한지 확인
  const printableRatio =
    [...str].filter((c) => c >= ' ' && c <= '~').length / str.length;
  if (printableRatio < 0.7) return true; // mostly non-printable → probably binary / 대부분 비인쇄 가능 → 아마도 바이너리

  return false; // seems like valid string / 유효한 문자열처럼 보임
};
