// CSS domain utility functions / CSS 도메인 유틸리티 함수
import { formatStyle, getShorthandEntries, matchesSelector } from './stylesheet';
import type { CssPropertyRange, MatchedCssRule } from './types';

/**
 * Convert CSS properties to CDP format / CSS 속성을 CDP 형식으로 변환
 */
export function toCssProperties(style: Record<string, string>): Array<{
  name: string;
  value: string;
  disabled?: boolean;
  implicit?: boolean;
  parsedOk?: boolean;
  text?: string;
  range?: {
    startLine: number;
    endLine: number;
    startColumn: number;
    endColumn: number;
  };
}> {
  return Object.entries(style).map(([name, value]) => ({
    name,
    value,
  }));
}

/**
 * Parse CSS text / CSS 텍스트 파싱
 */
export function parseCssText(cssText: string): Record<string, string> {
  // Remove CSS comments properly / CSS 주석을 올바르게 제거
  const cleaned = cssText.replace(/\/\*[\s\S]*?\*\//g, '');
  const properties = cleaned.split(';');
  const ret: Record<string, string> = {};

  properties.forEach((property) => {
    const trimmed = property.trim();
    if (!trimmed) return;
    const colonPos = trimmed.indexOf(':');
    if (colonPos > 0) {
      const name = trimmed.slice(0, colonPos).trim();
      const value = trimmed.slice(colonPos + 1).trim();
      ret[name] = value;
    }
  });

  return ret;
}

/**
 * Get line count from text / 텍스트에서 줄 수 가져오기
 */
export function getLineCount(str: string): number {
  return str.split('\n').length;
}

/**
 * Get last line from text / 텍스트에서 마지막 줄 가져오기
 */
export function getLastLine(str: string): string {
  const lines = str.split('\n');
  return lines[lines.length - 1] || '';
}

/**
 * Calculate range for CSS property / CSS 속성의 범위 계산
 */
export function calculatePropertyRange(
  cssText: string,
  name: string,
  value: string
): {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  text: string;
} {
  const lines = cssText.split('\n');
  let startLine = 0;
  let startColumn = 0;
  let endLine = 0;
  let endColumn = 0;
  let text = '';

  const searchText = `${name}: ${value}`;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const index = line.indexOf(searchText);
    if (index !== -1) {
      text = searchText;
      startLine = i;
      startColumn = index;
      endLine = i;
      endColumn = index + text.length;
      break;
    }
  }

  return { startLine, startColumn, endLine, endColumn, text };
}

/**
 * Format matched CSS rule / 매칭된 CSS 규칙 포맷
 */
export function formatMatchedCssRule(
  node: Element,
  matchedCssRule: { selectorText: string; style: CSSStyleDeclaration; styleSheetId: string }
): MatchedCssRule {
  const { selectorText, style, styleSheetId } = matchedCssRule;

  // Split selector into individual selectors / 셀렉터를 개별 셀렉터로 분리
  // Handle complex selectors with commas, but be careful with pseudo-classes / 쉼표가 있는 복잡한 셀렉터 처리, 하지만 pseudo-class 주의
  // Simple implementation: split by comma, but preserve pseudo-classes / 간단한 구현: 쉼표로 분리하되 pseudo-class 보존
  const selectors = selectorText
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const shorthandEntries = getShorthandEntries(style);
  const formattedStyle = formatStyle(style);

  const matchingSelectors: number[] = [];
  selectors.forEach((selector, idx) => {
    try {
      if (matchesSelector(node, selector)) {
        matchingSelectors.push(idx);
      }
    } catch {
      // Invalid selector / 잘못된 셀렉터
    }
  });

  // If no matching selectors found but rule was matched, mark all as matching / 매칭된 셀렉터가 없지만 규칙이 매칭된 경우, 모두 매칭된 것으로 표시
  // This can happen when selector matching fails but rule was already matched / 셀렉터 매칭이 실패했지만 규칙이 이미 매칭된 경우 발생할 수 있음
  if (matchingSelectors.length === 0 && selectors.length > 0) {
    // Mark all selectors as matching / 모든 셀렉터를 매칭된 것으로 표시
    selectors.forEach((_, idx) => matchingSelectors.push(idx));
  }

  return {
    matchingSelectors,
    rule: {
      styleSheetId,
      origin: 'regular' as const, // Required field: StyleSheetOrigin / 필수 필드: StyleSheetOrigin
      selectorList: {
        selectors: selectors.map((s) => ({ text: s })),
        text: selectorText,
      },
      style: {
        cssProperties: toCssProperties(formattedStyle),
        shorthandEntries,
      },
    },
  };
}

/**
 * Calculate text position from range / 범위에서 텍스트 위치 계산
 */
export function calculateTextPosition(
  cssText: string,
  range: CssPropertyRange
): { start: number; end: number } {
  const lines = cssText.split('\n');
  let start = 0;
  let end = 0;

  for (let i = 0; i <= range.endLine; i++) {
    const line = lines[i] || '';
    const lineLength = line.length + 1; // +1 for newline / 줄바꿈을 위해 +1

    if (i < range.startLine) {
      start += lineLength;
    } else if (i === range.startLine) {
      start += range.startColumn;
    }

    if (i < range.endLine) {
      end += lineLength;
    } else if (i === range.endLine) {
      end += range.endColumn;
    }
  }

  return { start, end };
}
