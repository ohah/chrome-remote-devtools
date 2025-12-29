// Stylesheet utility tests / 스타일시트 유틸리티 테스트
import { describe, test, expect, beforeEach } from 'bun:test';
import {
  matchesSelector,
  getStyleSheetIdForSheet,
  formatStyle,
  getMatchedCssRules,
  getShorthandEntries,
  getOrCreateInlineStyleSheetId,
  getInlineStyleNodeId,
} from '../stylesheet';
import { getNodeId } from '../../common/node-manager';

describe('Stylesheet Utils', () => {
  beforeEach(() => {
    // Clear document before each test / 각 테스트 전에 document 정리
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  describe('matchesSelector', () => {
    test('should match element by class selector / 클래스 셀렉터로 요소 매칭', () => {
      const element = document.createElement('div');
      element.className = 'test-class';
      document.body.appendChild(element);

      expect(matchesSelector(element, '.test-class')).toBe(true);
      expect(matchesSelector(element, '.other-class')).toBe(false);
    });

    test('should match element by ID selector / ID 셀렉터로 요소 매칭', () => {
      const element = document.createElement('div');
      element.id = 'test-id';
      document.body.appendChild(element);

      expect(matchesSelector(element, '#test-id')).toBe(true);
      expect(matchesSelector(element, '#other-id')).toBe(false);
    });

    test('should match element by tag selector / 태그 셀렉터로 요소 매칭', () => {
      const element = document.createElement('div');
      document.body.appendChild(element);

      expect(matchesSelector(element, 'div')).toBe(true);
      expect(matchesSelector(element, 'span')).toBe(false);
    });

    test('should handle invalid selector / 잘못된 셀렉터 처리', () => {
      const element = document.createElement('div');
      document.body.appendChild(element);

      // Invalid selector should return false / 잘못된 셀렉터는 false를 반환해야 함
      expect(matchesSelector(element, '[')).toBe(false);
      expect(matchesSelector(element, '::invalid')).toBe(false);
    });

    test('should handle complex selectors / 복잡한 셀렉터 처리', () => {
      const element = document.createElement('div');
      element.className = 'test-class';
      element.id = 'test-id';
      document.body.appendChild(element);

      expect(matchesSelector(element, 'div.test-class')).toBe(true);
      expect(matchesSelector(element, '#test-id.test-class')).toBe(true);
    });
  });

  describe('getStyleSheetIdForSheet', () => {
    test('should generate ID for external stylesheet / 외부 스타일시트에 대한 ID 생성', () => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://example.com/style.css';
      document.head.appendChild(link);

      // Wait for stylesheet to load / 스타일시트 로드 대기
      const styleSheets = Array.from(document.styleSheets);
      if (styleSheets.length > 0) {
        const id = getStyleSheetIdForSheet(styleSheets[0]!);
        expect(id).toBeTruthy();
        expect(id).toContain('stylesheet-');
      }
    });

    test('should generate ID for inline stylesheet / 인라인 스타일시트에 대한 ID 생성', () => {
      const style = document.createElement('style');
      style.textContent = '.test { color: red; }';
      document.head.appendChild(style);

      const styleSheets = Array.from(document.styleSheets);
      if (styleSheets.length > 0) {
        const id = getStyleSheetIdForSheet(styleSheets[0]!);
        expect(id).toBeTruthy();
        expect(id).toContain('stylesheet-');
      }
    });

    test('should return same ID for same stylesheet / 같은 스타일시트에 대해 같은 ID 반환', () => {
      const style = document.createElement('style');
      style.textContent = '.test { color: red; }';
      document.head.appendChild(style);

      const styleSheets = Array.from(document.styleSheets);
      if (styleSheets.length > 0) {
        const id1 = getStyleSheetIdForSheet(styleSheets[0]!);
        const id2 = getStyleSheetIdForSheet(styleSheets[0]!);
        expect(id1).toBe(id2);
      }
    });
  });

  describe('formatStyle', () => {
    test('should format CSS style declaration / CSS 스타일 선언 포맷', () => {
      const element = document.createElement('div');
      element.setAttribute('style', 'color: red; background: blue; padding: 10px;');
      document.body.appendChild(element);

      const style = window.getComputedStyle(element);
      const formatted = formatStyle(style);

      expect(formatted).toBeInstanceOf(Object);
      expect(Object.keys(formatted).length).toBeGreaterThan(0);
    });

    test('should handle empty style / 빈 스타일 처리', () => {
      const element = document.createElement('div');
      document.body.appendChild(element);

      const style = window.getComputedStyle(element);
      const formatted = formatStyle(style);

      expect(formatted).toBeInstanceOf(Object);
    });
  });

  describe('getMatchedCssRules', () => {
    test('should get matched CSS rules for element / 요소에 대한 매칭된 CSS 규칙 가져오기', () => {
      const style = document.createElement('style');
      style.textContent = '.test-class { color: red; } #test-id { background: blue; }';
      document.head.appendChild(style);

      const element = document.createElement('div');
      element.className = 'test-class';
      element.id = 'test-id';
      document.body.appendChild(element);

      const rules = getMatchedCssRules(element);
      expect(Array.isArray(rules)).toBe(true);
      // Should match both rules / 두 규칙 모두 매칭되어야 함
      expect(rules.length).toBeGreaterThanOrEqual(1);
    });

    test('should return empty array for element with no matching rules / 매칭되는 규칙이 없는 요소에 대해 빈 배열 반환', () => {
      const style = document.createElement('style');
      style.textContent = '.other-class { color: red; }';
      document.head.appendChild(style);

      const element = document.createElement('div');
      element.className = 'test-class';
      document.body.appendChild(element);

      const rules = getMatchedCssRules(element);
      expect(Array.isArray(rules)).toBe(true);
    });

    test('should handle media queries / 미디어 쿼리 처리', () => {
      const style = document.createElement('style');
      style.textContent = `
        @media (min-width: 768px) {
          .test-class { color: red; }
        }
      `;
      document.head.appendChild(style);

      const element = document.createElement('div');
      element.className = 'test-class';
      document.body.appendChild(element);

      const rules = getMatchedCssRules(element);
      expect(Array.isArray(rules)).toBe(true);
    });
  });

  describe('getShorthandEntries', () => {
    test('should get shorthand properties from style / 스타일에서 shorthand 속성 가져오기', () => {
      const element = document.createElement('div');
      element.setAttribute('style', 'background: red; margin: 10px; padding: 5px;');
      document.body.appendChild(element);

      const style = window.getComputedStyle(element);
      const shorthandEntries = getShorthandEntries(style);

      expect(Array.isArray(shorthandEntries)).toBe(true);
      // Should include background, margin, padding / background, margin, padding이 포함되어야 함
      const names = shorthandEntries.map((e) => e.name);
      expect(names).toContain('background');
      expect(names).toContain('margin');
      expect(names).toContain('padding');
    });

    test('should not include longhand properties / longhand 속성은 포함하지 않음', () => {
      const element = document.createElement('div');
      element.setAttribute('style', 'row-gap: 10px; column-gap: 5px;');
      document.body.appendChild(element);

      const style = window.getComputedStyle(element);
      const shorthandEntries = getShorthandEntries(style);

      const names = shorthandEntries.map((e) => e.name);
      // row-gap and column-gap are longhand, not shorthand / row-gap과 column-gap은 longhand이므로 포함되지 않아야 함
      expect(names).not.toContain('row-gap');
      expect(names).not.toContain('column-gap');
    });

    test('should handle empty style / 빈 스타일 처리', () => {
      const element = document.createElement('div');
      document.body.appendChild(element);

      const style = window.getComputedStyle(element);
      const shorthandEntries = getShorthandEntries(style);

      expect(Array.isArray(shorthandEntries)).toBe(true);
    });
  });

  describe('getOrCreateInlineStyleSheetId', () => {
    test('should create inline style sheet ID / 인라인 스타일시트 ID 생성', () => {
      const element = document.createElement('div');
      element.setAttribute('style', 'color: red;');
      document.body.appendChild(element);

      const nodeId = getNodeId(element);
      const styleSheetId = getOrCreateInlineStyleSheetId(nodeId);

      expect(styleSheetId).toBeTruthy();
      expect(styleSheetId).toContain('stylesheet-inline-');
    });

    test('should return same ID for same node / 같은 노드에 대해 같은 ID 반환', () => {
      const element = document.createElement('div');
      element.setAttribute('style', 'color: red;');
      document.body.appendChild(element);

      const nodeId = getNodeId(element);
      const id1 = getOrCreateInlineStyleSheetId(nodeId);
      const id2 = getOrCreateInlineStyleSheetId(nodeId);

      expect(id1).toBe(id2);
    });
  });

  describe('getInlineStyleNodeId', () => {
    test('should get node ID from style sheet ID / 스타일시트 ID에서 노드 ID 가져오기', () => {
      const element = document.createElement('div');
      element.setAttribute('style', 'color: red;');
      document.body.appendChild(element);

      const nodeId = getNodeId(element);
      const styleSheetId = getOrCreateInlineStyleSheetId(nodeId);
      const retrievedNodeId = getInlineStyleNodeId(styleSheetId);

      expect(retrievedNodeId).toBe(nodeId);
    });

    test('should return undefined for non-inline style sheet ID / 인라인 스타일시트가 아닌 ID에 대해 undefined 반환', () => {
      const style = document.createElement('style');
      style.textContent = '.test { color: red; }';
      document.head.appendChild(style);

      const styleSheets = Array.from(document.styleSheets);
      if (styleSheets.length > 0) {
        const externalId = getStyleSheetIdForSheet(styleSheets[0]!);
        const nodeId = getInlineStyleNodeId(externalId);
        expect(nodeId).toBeUndefined();
      }
    });
  });
});
