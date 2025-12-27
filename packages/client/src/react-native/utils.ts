// React Native utilities / React Native 유틸리티

// In-memory storage for React Native / React Native용 메모리 저장소
let memoryStorage: { [key: string]: string } = {};

/**
 * Get or create unique debug ID / 고유 디버그 ID 가져오기 또는 생성
 * @returns Unique debug ID / 고유 디버그 ID
 */
export function getId(): string {
  let id = memoryStorage['debug_id'];
  if (!id) {
    // Use crypto.randomUUID() if available (UUID v4) / 사용 가능한 경우 crypto.randomUUID() 사용 (UUID v4)
    // Fallback to enhanced timestamp + random for React Native / React Native를 위한 타임스탬프 + 랜덤 폴백
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      id = crypto.randomUUID();
    } else {
      // Enhanced fallback: timestamp + multiple random values / 향상된 폴백: 타임스탬프 + 여러 랜덤 값
      const timestamp = Date.now();
      const random1 = Math.random().toString(36).substring(2, 11);
      const random2 = Math.random().toString(36).substring(2, 11);
      const random3 = Math.random().toString(36).substring(2, 11);
      id = `${timestamp}-${random1}-${random2}-${random3}`;
    }
    memoryStorage['debug_id'] = id;
  }
  return id;
}

/**
 * Get query string with app information / 앱 정보가 포함된 쿼리 문자열 가져오기
 * @returns Query string / 쿼리 문자열
 */
export function getQuery(): string {
  const search = new URLSearchParams();

  // React Native app information / React Native 앱 정보
  search.append('url', 'react-native://app');
  search.append('title', 'React Native App');
  search.append('favicon', '');
  search.append('time', Date.now().toString());

  // User agent for React Native / React Native용 User Agent
  if (typeof navigator !== 'undefined' && navigator.userAgent) {
    search.append('ua', navigator.userAgent);
  } else {
    search.append('ua', 'React Native');
  }

  return search.toString();
}
