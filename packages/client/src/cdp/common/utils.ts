/// <reference lib="dom" />
// Utility functions / 유틸리티 함수

/**
 * Get absolute path from relative URL / 상대 URL에서 절대 경로 가져오기
 */
export function getAbsolutePath(url: string): string {
  if (!url || typeof url !== 'string') return '';
  const a = document.createElement('a');
  a.href = url;
  return a.href;
}

/**
 * Convert kebab-case to PascalCase / kebab-case를 PascalCase로 변환
 */
export function key2UpperCase(key: string): string {
  return key.replace(/^\S|-[a-z]/g, (s) => s.toUpperCase());
}

/**
 * Check if element matches selector / 요소가 선택자와 일치하는지 확인
 */
export function isMatches(element: Element, selector: string): boolean {
  try {
    if (element.matches) {
      return element.matches(selector);
    }
    // Deprecated but fallback / 폐기되었지만 폴백
    if ((element as any).webkitMatchesSelector) {
      return (element as any).webkitMatchesSelector(selector);
    }
    if ((element as any).mozMatchesSelector) {
      return (element as any).mozMatchesSelector(selector);
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Check if device is mobile / 모바일 기기인지 확인
 */
export function isMobile(): boolean {
  return /ios|iphone|ipod|android/.test(navigator.userAgent.toLowerCase());
}

/**
 * Check if browser is Safari / Safari 브라우저인지 확인
 */
export function isSafari(): boolean {
  return /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
}

/**
 * Check if node is Element / 노드가 Element인지 확인
 */
export function isElement(node: Node): node is Element {
  return node instanceof Element;
}

/**
 * Load script dynamically / 동적으로 스크립트 로드
 */
export function loadScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = () => resolve();
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

/**
 * Escape string for regex / 정규식용 문자열 이스케이프
 */
export function escapeRegString(string: string): string {
  return string.replace(/[\\$*+?.^|(){}[\]]/g, '\\$&');
}
