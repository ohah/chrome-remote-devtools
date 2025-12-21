// URL validation utilities / URL 검증 유틸리티

/**
 * Validate if a string is a valid URL / 문자열이 유효한 URL인지 검증
 * @param url - URL string to validate / 검증할 URL 문자열
 * @returns true if valid URL, false otherwise / 유효한 URL이면 true, 아니면 false
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const urlObj = new URL(url);
    // Only allow http and https protocols / http와 https 프로토콜만 허용
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Sanitize URL for safe display / 안전한 표시를 위한 URL 정제
 * @param url - URL string to sanitize / 정제할 URL 문자열
 * @returns Sanitized URL or null if invalid / 정제된 URL 또는 유효하지 않으면 null
 */
export function sanitizeUrl(url: string | undefined): string | null {
  if (!url) {
    return null;
  }

  if (!isValidUrl(url)) {
    return null;
  }

  return url;
}
