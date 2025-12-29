// CSS utils tests / CSS 유틸리티 테스트
import { describe, test, expect } from 'bun:test';
import {
  parseCssText,
  calculatePropertyRange,
  toCssProperties,
  getLineCount,
  getLastLine,
} from '../utils';

describe('CSS Utils', () => {
  describe('parseCssText', () => {
    test('should parse simple CSS properties / 간단한 CSS 속성 파싱', () => {
      const cssText = 'color: red; background: blue;';
      const result = parseCssText(cssText);
      expect(result).toEqual({
        color: 'red',
        background: 'blue',
      });
    });

    test('should handle whitespace variations / 공백 변형 처리', () => {
      const cssText = 'color:red;background:  blue;padding: 10px 20px;';
      const result = parseCssText(cssText);
      expect(result).toEqual({
        color: 'red',
        background: 'blue',
        padding: '10px 20px',
      });
    });

    test('should remove CSS comments / CSS 주석 제거', () => {
      const cssText = 'color: red; /* comment */ background: blue;';
      const result = parseCssText(cssText);
      expect(result).toEqual({
        color: 'red',
        background: 'blue',
      });
    });

    test('should preserve strings in CSS / CSS의 문자열 보존', () => {
      const cssText = 'content: "/* not a comment */"; background: blue;';
      const result = parseCssText(cssText);
      expect(result).toEqual({
        content: '"/* not a comment */"',
        background: 'blue',
      });
    });

    test('should preserve URLs with comments / 주석이 있는 URL 보존', () => {
      const cssText = 'background: url(/* comment */image.png); color: red;';
      const result = parseCssText(cssText);
      expect(result).toEqual({
        background: 'url(/* comment */image.png)',
        color: 'red',
      });
    });

    test('should handle multiline CSS / 여러 줄 CSS 처리', () => {
      const cssText = `
        color: red;
        background: blue;
        padding: 10px;
      `;
      const result = parseCssText(cssText);
      expect(result).toEqual({
        color: 'red',
        background: 'blue',
        padding: '10px',
      });
    });

    test('should handle empty CSS text / 빈 CSS 텍스트 처리', () => {
      const result = parseCssText('');
      expect(result).toEqual({});
    });

    test('should handle CSS with only comments / 주석만 있는 CSS 처리', () => {
      const cssText = '/* comment 1 */ /* comment 2 */';
      const result = parseCssText(cssText);
      expect(result).toEqual({});
    });

    test('should preserve single quotes / 작은따옴표 보존', () => {
      const cssText = "content: '/* not a comment */';";
      const result = parseCssText(cssText);
      expect(result).toEqual({
        content: "'/* not a comment */'",
      });
    });

    test('should handle escaped characters in strings / 문자열 내 이스케이프 문자 처리', () => {
      const cssText = 'content: "string with \\"quote\\"";';
      const result = parseCssText(cssText);
      expect(result).toEqual({
        content: '"string with \\"quote\\""',
      });
    });
  });

  describe('calculatePropertyRange', () => {
    test('should find property with exact match / 정확한 일치로 속성 찾기', () => {
      const cssText = 'color: red; background: blue;';
      const result = calculatePropertyRange(cssText, 'color', 'red');
      expect(result.startLine).toBe(0);
      expect(result.startColumn).toBe(0);
      expect(result.endLine).toBe(0);
      expect(result.endColumn).toBeGreaterThan(0);
      expect(result.text).toContain('color');
    });

    test('should handle whitespace variations / 공백 변형 처리', () => {
      const cssText = 'color:red;background:  blue;';
      const result = calculatePropertyRange(cssText, 'color', 'red');
      expect(result.text).toBeTruthy();
      expect(result.startLine).toBe(0);
    });

    test('should handle property without space after colon / 콜론 뒤 공백 없는 속성 처리', () => {
      const cssText = 'color:red; background:blue;';
      const result = calculatePropertyRange(cssText, 'color', 'red');
      expect(result.text).toBeTruthy();
    });

    test('should handle property with multiple spaces / 여러 공백이 있는 속성 처리', () => {
      const cssText = 'color:  red; background:blue;';
      const result = calculatePropertyRange(cssText, 'color', 'red');
      expect(result.text).toBeTruthy();
    });

    test('should handle multiline CSS / 여러 줄 CSS 처리', () => {
      const cssText = 'color: red;\nbackground: blue;\npadding: 10px;';
      const result = calculatePropertyRange(cssText, 'background', 'blue');
      expect(result.startLine).toBe(1);
    });

    test('should return empty result for non-existent property / 존재하지 않는 속성에 대해 빈 결과 반환', () => {
      const cssText = 'color: red; background: blue;';
      const result = calculatePropertyRange(cssText, 'nonexistent', 'value');
      expect(result.text).toBe('');
      expect(result.startLine).toBe(0);
      expect(result.startColumn).toBe(0);
    });

    test('should handle property with complex value / 복잡한 값을 가진 속성 처리', () => {
      const cssText = 'background: linear-gradient(to right, red, blue);';
      const result = calculatePropertyRange(
        cssText,
        'background',
        'linear-gradient(to right, red, blue)'
      );
      expect(result.text).toBeTruthy();
    });
  });

  describe('toCssProperties', () => {
    test('should convert style object to CSS properties array / 스타일 객체를 CSS 속성 배열로 변환', () => {
      const style = {
        color: 'red',
        background: 'blue',
        padding: '10px',
      };
      const result = toCssProperties(style);
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ name: 'color', value: 'red' });
      expect(result[1]).toEqual({ name: 'background', value: 'blue' });
      expect(result[2]).toEqual({ name: 'padding', value: '10px' });
    });

    test('should handle empty object / 빈 객체 처리', () => {
      const result = toCssProperties({});
      expect(result).toEqual([]);
    });
  });

  describe('getLineCount', () => {
    test('should count lines correctly / 줄 수를 올바르게 계산', () => {
      expect(getLineCount('line1\nline2\nline3')).toBe(3);
      expect(getLineCount('single line')).toBe(1);
      expect(getLineCount('')).toBe(1);
    });

    test('should handle Windows line endings / Windows 줄바꿈 처리', () => {
      expect(getLineCount('line1\r\nline2\r\nline3')).toBe(3);
    });
  });

  describe('getLastLine', () => {
    test('should get last line correctly / 마지막 줄을 올바르게 가져오기', () => {
      expect(getLastLine('line1\nline2\nline3')).toBe('line3');
      expect(getLastLine('single line')).toBe('single line');
      expect(getLastLine('')).toBe('');
    });

    test('should handle empty string / 빈 문자열 처리', () => {
      expect(getLastLine('')).toBe('');
    });
  });
});
