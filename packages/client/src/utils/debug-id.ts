// Generate unique debug ID / 고유 디버그 ID 생성

/**
 * Get or create unique debug ID / 고유 디버그 ID 가져오기 또는 생성
 * @returns Unique debug ID / 고유 디버그 ID
 */
export function getId(): string {
  let id = sessionStorage.getItem('debug_id');
  if (!id) {
    // Use crypto.randomUUID() if available (UUID v4) / 사용 가능한 경우 crypto.randomUUID() 사용 (UUID v4)
    // Fallback to enhanced timestamp + random for older browsers / 구형 브라우저를 위한 타임스탬프 + 랜덤 폴백
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      id = crypto.randomUUID();
    } else {
      // Enhanced fallback: timestamp + multiple random values / 향상된 폴백: 타임스탬프 + 여러 랜덤 값
      // Add performance.now() for sub-millisecond precision / 밀리초 이하 정밀도를 위해 performance.now() 추가
      const timestamp = `${Date.now()}-${performance.now()}`;
      const random1 = Math.random().toString(36).substring(2, 11);
      const random2 = Math.random().toString(36).substring(2, 11);
      const random3 = Math.random().toString(36).substring(2, 11);
      id = `${timestamp}-${random1}-${random2}-${random3}`;
    }
    sessionStorage.setItem('debug_id', id);
  }
  return id;
}
