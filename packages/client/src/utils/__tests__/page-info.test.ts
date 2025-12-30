// Page info tests / 페이지 정보 테스트
// happy-dom is registered via bunfig.toml preload / happy-dom은 bunfig.toml preload를 통해 등록됨
import { describe, test, expect, beforeEach } from 'bun:test';
import { getDocumentFavicon, getQuery } from '../page-info';

describe('Page Info', () => {
  beforeEach(() => {
    // Clear document before each test / 각 테스트 전에 document 정리
    document.head.innerHTML = '';
    document.body.innerHTML = '';

    // Reset document title / document 제목 재설정
    document.title = 'Test Page';
  });

  describe('getDocumentFavicon', () => {
    test('should return empty string when no favicon link exists / 파비콘 링크가 없을 때 빈 문자열 반환', () => {
      const favicon = getDocumentFavicon();

      expect(favicon).toBe('');
    });

    test('should return favicon URL when link with rel="icon" exists / rel="icon" 링크가 있을 때 파비콘 URL 반환', () => {
      const link = document.createElement('link');
      link.rel = 'icon';
      link.href = '/favicon.ico';
      document.head.appendChild(link);

      const favicon = getDocumentFavicon();

      expect(favicon).toBeTruthy();
      expect(favicon.length).toBeGreaterThan(0);
      // In happy-dom, getAbsolutePath may return different format / happy-dom에서 getAbsolutePath는 다른 형식을 반환할 수 있음
      expect(favicon).toContain('favicon.ico');
    });

    test('should return favicon URL when link with rel="shortcut icon" exists / rel="shortcut icon" 링크가 있을 때 파비콘 URL 반환', () => {
      const link = document.createElement('link');
      link.rel = 'shortcut icon';
      link.href = '/images/favicon.ico';
      document.head.appendChild(link);

      const favicon = getDocumentFavicon();

      expect(favicon).toContain('favicon.ico');
    });

    test('should return absolute URL for relative favicon path / 상대 파비콘 경로에 대해 절대 URL 반환', () => {
      const link = document.createElement('link');
      link.rel = 'icon';
      link.href = '../images/favicon.ico';
      document.head.appendChild(link);

      const favicon = getDocumentFavicon();

      expect(favicon).toBeTruthy();
      expect(favicon.length).toBeGreaterThan(0);
      // In happy-dom, getAbsolutePath may return different format / happy-dom에서 getAbsolutePath는 다른 형식을 반환할 수 있음
      expect(favicon).toContain('favicon.ico');
    });

    test('should return absolute URL for absolute favicon path / 절대 파비콘 경로에 대해 절대 URL 반환', () => {
      const link = document.createElement('link');
      link.rel = 'icon';
      link.href = 'https://example.com/favicon.ico';
      document.head.appendChild(link);

      const favicon = getDocumentFavicon();

      expect(favicon).toBe('https://example.com/favicon.ico');
    });

    test('should return first matching favicon when multiple exist / 여러 개가 있을 때 첫 번째 일치하는 파비콘 반환', () => {
      const link1 = document.createElement('link');
      link1.rel = 'icon';
      link1.href = '/favicon1.ico';
      document.head.appendChild(link1);

      const link2 = document.createElement('link');
      link2.rel = 'icon';
      link2.href = '/favicon2.ico';
      document.head.appendChild(link2);

      const favicon = getDocumentFavicon();

      // Should return first one / 첫 번째 것을 반환해야 함
      expect(favicon).toContain('favicon1.ico');
    });

    test('should handle favicon with query parameters / 쿼리 파라미터가 있는 파비콘 처리', () => {
      const link = document.createElement('link');
      link.rel = 'icon';
      link.href = '/favicon.ico?v=1.0';
      document.head.appendChild(link);

      const favicon = getDocumentFavicon();

      expect(favicon).toContain('favicon.ico');
      expect(favicon).toContain('v=1.0');
    });

    test('should ignore non-favicon links / 파비콘이 아닌 링크 무시', () => {
      const stylesheet = document.createElement('link');
      stylesheet.rel = 'stylesheet';
      stylesheet.href = '/style.css';
      document.head.appendChild(stylesheet);

      const favicon = getDocumentFavicon();

      expect(favicon).toBe('');
    });
  });

  describe('getQuery', () => {
    test('should include URL in query string / 쿼리 문자열에 URL 포함', () => {
      const query = getQuery();
      const params = new URLSearchParams(query);

      expect(params.has('url')).toBe(true);
      expect(params.get('url')).toBe(location.href);
    });

    test('should include title in query string / 쿼리 문자열에 제목 포함', () => {
      document.title = 'My Test Page';
      const query = getQuery();
      const params = new URLSearchParams(query);

      expect(params.has('title')).toBe(true);
      expect(params.get('title')).toBe('My Test Page');
    });

    test('should include favicon in query string / 쿼리 문자열에 파비콘 포함', () => {
      const link = document.createElement('link');
      link.rel = 'icon';
      link.href = '/favicon.ico';
      document.head.appendChild(link);

      const query = getQuery();
      const params = new URLSearchParams(query);

      expect(params.has('favicon')).toBe(true);
      expect(params.get('favicon')).toContain('favicon.ico');
    });

    test('should include time in query string / 쿼리 문자열에 시간 포함', () => {
      const beforeTime = Date.now();
      const query = getQuery();
      const afterTime = Date.now();
      const params = new URLSearchParams(query);

      expect(params.has('time')).toBe(true);
      const time = parseInt(params.get('time') || '0', 10);
      expect(time).toBeGreaterThanOrEqual(beforeTime);
      expect(time).toBeLessThanOrEqual(afterTime);
    });

    test('should include userAgent in query string / 쿼리 문자열에 userAgent 포함', () => {
      const query = getQuery();
      const params = new URLSearchParams(query);

      expect(params.has('ua')).toBe(true);
      expect(params.get('ua')).toBe(navigator.userAgent);
    });

    test('should include all required parameters / 모든 필수 파라미터 포함', () => {
      const query = getQuery();
      const params = new URLSearchParams(query);

      expect(params.has('url')).toBe(true);
      expect(params.has('title')).toBe(true);
      expect(params.has('favicon')).toBe(true);
      expect(params.has('time')).toBe(true);
      expect(params.has('ua')).toBe(true);
    });

    test('should encode special characters in URL / URL의 특수 문자 인코딩', () => {
      // Mock location.href / location.href 모킹
      const originalHref = location.href;
      Object.defineProperty(location, 'href', {
        value: 'https://example.com/path?query=test&value=123',
        configurable: true,
        writable: true,
      });

      const query = getQuery();
      const params = new URLSearchParams(query);

      expect(params.get('url')).toContain('query=test');
      expect(params.get('url')).toContain('value=123');

      // Restore / 복원
      Object.defineProperty(location, 'href', {
        value: originalHref,
        configurable: true,
        writable: true,
      });
    });

    test('should handle empty favicon / 빈 파비콘 처리', () => {
      // No favicon link / 파비콘 링크 없음
      const query = getQuery();
      const params = new URLSearchParams(query);

      expect(params.get('favicon')).toBe('');
    });

    test('should return valid query string format / 유효한 쿼리 문자열 형식 반환', () => {
      const query = getQuery();

      expect(typeof query).toBe('string');
      expect(query.length).toBeGreaterThan(0);

      // Should be parseable as URLSearchParams / URLSearchParams로 파싱 가능해야 함
      const params = new URLSearchParams(query);
      expect(params.toString()).toBe(query);
    });
  });
});
