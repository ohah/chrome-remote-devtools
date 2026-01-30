/**
 * URL validation tests / URL 검증 유틸 테스트
 */
import { describe, test, expect } from 'bun:test';
import { isValidUrl, sanitizeUrl } from '../url-validation';

describe('url-validation', () => {
  describe('isValidUrl', () => {
    test('should return true for valid http URL / 유효한 http URL일 때 true', () => {
      expect(isValidUrl('http://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:8080')).toBe(true);
    });

    test('should return true for valid https URL / 유효한 https URL일 때 true', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('https://localhost:8443')).toBe(true);
    });

    test('should return false for empty or non-string / 빈 값·비문자열일 때 false', () => {
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl(undefined as any)).toBe(false);
      expect(isValidUrl(null as any)).toBe(false);
      expect(isValidUrl(123 as any)).toBe(false);
    });

    test('should return false for invalid URL / 잘못된 URL일 때 false', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('ftp://example.com')).toBe(false);
    });
  });

  describe('sanitizeUrl', () => {
    test('should return URL when valid / 유효한 URL이면 그대로 반환', () => {
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
      expect(sanitizeUrl('https://a.co')).toBe('https://a.co');
    });

    test('should return null when undefined or empty / undefined·빈 값이면 null', () => {
      expect(sanitizeUrl(undefined)).toBe(null);
      expect(sanitizeUrl('')).toBe(null);
    });

    test('should return null when invalid URL / 유효하지 않은 URL이면 null', () => {
      expect(sanitizeUrl('invalid')).toBe(null);
    });
  });
});
