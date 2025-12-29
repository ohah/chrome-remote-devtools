// CSS domain type definitions / CSS 도메인 타입 정의

/**
 * CSS property range / CSS 속성 범위
 */
export type CssPropertyRange = {
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
};

/**
 * CSS property with range / 범위가 있는 CSS 속성
 * Alias of CssPropertyRange for semantic clarity and compatibility / 의미적 명확성과 호환성을 위한 CssPropertyRange 별칭
 */
export type CssPropertyWithRange = CssPropertyRange;

/**
 * CSS property / CSS 속성
 */
export type CssProperty = {
  name: string;
  value: string;
  disabled?: boolean;
  implicit?: boolean;
  parsedOk?: boolean;
  text?: string;
  range?: CssPropertyWithRange;
};

/**
 * Inline style / 인라인 스타일
 */
export type InlineStyle = {
  styleSheetId?: string;
  cssText?: string;
  range?: CssPropertyRange;
  cssProperties: Array<CssProperty>;
  shorthandEntries: Array<{ name: string; value: string }>;
};

/**
 * Matched CSS rule / 매칭된 CSS 규칙
 */
export type MatchedCssRule = {
  matchingSelectors: number[];
  rule: {
    styleSheetId: string;
    origin: 'regular';
    selectorList: {
      selectors: Array<{ text: string }>;
      text: string;
    };
    style: {
      cssProperties: Array<{ name: string; value: string }>;
      shorthandEntries: Array<{ name: string; value: string }>;
    };
  };
};

/**
 * Inherited style / 상속된 스타일
 */
export type InheritedStyle = {
  inlineStyle?: InlineStyle;
  matchedCSSRules: Array<MatchedCssRule>;
};

/**
 * Style text edit / 스타일 텍스트 편집
 */
export type StyleTextEdit = {
  styleSheetId: string;
  text: string;
  range?: CssPropertyRange;
};

/**
 * Style result / 스타일 결과
 */
export type StyleResult = {
  styleSheetId: string;
  cssText?: string;
  range?: CssPropertyRange;
  cssProperties?: Array<CssProperty>;
  shorthandEntries?: Array<{ name: string; value: string }>;
};
