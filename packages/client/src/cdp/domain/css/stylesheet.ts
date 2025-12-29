// Stylesheet utility functions / 스타일시트 유틸리티 함수

// Get element matches selector function / 요소가 셀렉터와 일치하는지 확인하는 함수 가져오기
const elProto: any = Element.prototype;

let matchesSel: (el: Element, selText: string) => boolean = () => false;

if (elProto.webkitMatchesSelector) {
  matchesSel = (el: Element, selText: string) => (el as any).webkitMatchesSelector(selText);
} else if (elProto.mozMatchesSelector) {
  matchesSel = (el: Element, selText: string) => (el as any).mozMatchesSelector(selText);
} else if (elProto.msMatchesSelector) {
  matchesSel = (el: Element, selText: string) => (el as any).msMatchesSelector(selText);
} else if (elProto.matches) {
  matchesSel = (el: Element, selText: string) => el.matches(selText);
}

/**
 * Check if element matches selector / 요소가 셀렉터와 일치하는지 확인
 */
export function matchesSelector(el: Element, selText: string): boolean {
  try {
    const result = matchesSel(el, selText);
    return result;
  } catch (e) {
    // Fallback: try native matches if available / 폴백: 네이티브 matches가 있으면 시도
    if (el.matches) {
      try {
        return el.matches(selText);
      } catch (e2) {
        return false;
      }
    }
    return false;
  }
}

// StyleSheet ID management / StyleSheet ID 관리
const styleSheetIdMap = new WeakMap<StyleSheet, string>();
const inlineStyleSheetIds = new Map<number, string>();
const inlineStyleNodeIds = new Map<string, number>();

/**
 * Get or create style sheet ID / 스타일시트 ID 가져오기 또는 생성
 */
function getStyleSheetId(sourceUrl = ''): string {
  if (sourceUrl) {
    // Create hash from URL / URL에서 해시 생성
    let hash = 0;
    for (let i = 0; i < sourceUrl.length; i++) {
      const char = sourceUrl.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer / 32비트 정수로 변환
    }
    return `stylesheet-${Math.abs(hash)}`;
  }
  // Generate unique ID for inline styles / 인라인 스타일을 위한 고유 ID 생성
  return `stylesheet-inline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get style sheet ID / 스타일시트 ID 가져오기
 */
export function getStyleSheetIdForSheet(styleSheet: StyleSheet): string {
  let id = styleSheetIdMap.get(styleSheet);
  if (!id) {
    const href = (styleSheet as CSSStyleSheet).href || '';
    id = getStyleSheetId(href);
    styleSheetIdMap.set(styleSheet, id);
  }
  return id;
}

/**
 * Get all style sheets / 모든 스타일시트 가져오기
 */
export function getStyleSheets(): StyleSheetList {
  // Ensure all style sheets have IDs / 모든 스타일시트에 ID가 있는지 확인
  Array.from(document.styleSheets).forEach((styleSheet) => {
    if (!styleSheetIdMap.has(styleSheet)) {
      getStyleSheetIdForSheet(styleSheet);
    }
  });
  return document.styleSheets;
}

/**
 * Format CSS style declaration to object / CSS 스타일 선언을 객체로 포맷
 */
export function formatStyle(style: CSSStyleDeclaration): Record<string, string> {
  const ret: Record<string, string> = {};

  for (let i = 0, len = style.length; i < len; i++) {
    const name = style[i];
    if (name) {
      const value = (style as any)[name] || style.getPropertyValue(name);
      if (value) {
        ret[name] = value.trim();
      }
    }
  }

  return ret;
}

/**
 * Process CSS rules recursively to handle nested rules (media queries, etc.) / 중첩된 규칙(미디어 쿼리 등)을 처리하기 위해 CSS 규칙을 재귀적으로 처리
 */
function processCssRules(
  cssRules: CSSRuleList,
  node: Element,
  styleSheetId: string,
  unsorted: Array<{
    selectorText: string;
    style: CSSStyleDeclaration;
    styleSheetId: string;
    priority: number;
  }>,
  stats: { totalRules: number; styleRules: number; matchedRules: number; allSelectors: string[] },
  depth: number = 0
): void {
  Array.from(cssRules).forEach((cssRule) => {
    stats.totalRules++;

    // Match chobitsu: check selectorText directly, don't rely on type / chobitsu와 일치: 타입에 의존하지 않고 selectorText 직접 확인
    // Only rules with selectorText are style rules / selectorText가 있는 규칙만 스타일 규칙
    const selectorText = (cssRule as any).selectorText;

    if (selectorText) {
      // This is a style rule / 이것은 스타일 규칙입니다
      const styleRule = cssRule as CSSStyleRule;

      stats.styleRules++;
      stats.allSelectors.push(selectorText);

      let matchesEl = false;

      try {
        matchesEl = matchesSelector(node, selectorText);
      } catch (e) {
        // Invalid selector may throw error / 잘못된 셀렉터는 에러를 던질 수 있음
        return;
      }

      if (!matchesEl) {
        return;
      }

      stats.matchedRules++;

      // Calculate priority based on selector specificity / 셀렉터 특이성에 기반하여 우선순위 계산
      const priority = calculateSelectorPriority(selectorText);

      unsorted.push({
        selectorText,
        style: styleRule.style,
        styleSheetId,
        priority,
      });
    }
    // Handle MEDIA_RULE (type 4) - process nested rules / MEDIA_RULE (타입 4) 처리 - 중첩된 규칙 처리
    else if (cssRule.type === CSSRule.MEDIA_RULE) {
      const mediaRule = cssRule as CSSMediaRule;
      try {
        if (mediaRule.cssRules) {
          processCssRules(mediaRule.cssRules, node, styleSheetId, unsorted, stats, depth + 1);
        }
      } catch (e) {
        // Cross-origin or other error / 크로스 오리진 또는 기타 에러
      }
    }
    // Handle LAYER_RULE (type 16) - CSS @layer at-rule / LAYER_RULE (타입 16) 처리 - CSS @layer at-rule
    // Note: CSSRule.LAYER_RULE may not be available in all browsers / 참고: CSSRule.LAYER_RULE은 모든 브라우저에서 사용 가능하지 않을 수 있음
    else if (cssRule.type === 16 || (cssRule as any).name === 'layer') {
      try {
        const nestedRules = (cssRule as any).cssRules;
        if (nestedRules) {
          processCssRules(nestedRules, node, styleSheetId, unsorted, stats, depth + 1);
        }
      } catch (e) {
        // Cross-origin or other error / 크로스 오리진 또는 기타 에러
      }
    }
    // Handle other nested rule types (SUPPORTS_RULE, etc.) / 다른 중첩 규칙 타입 처리 (SUPPORTS_RULE 등)
    else if ((cssRule as any).cssRules) {
      try {
        processCssRules((cssRule as any).cssRules, node, styleSheetId, unsorted, stats, depth + 1);
      } catch (e) {
        // Ignore errors for nested rules / 중첩 규칙 에러 무시
      }
    }
  });
}

/**
 * Get matched CSS rules for node / 노드에 매칭된 CSS 규칙 가져오기
 */
export function getMatchedCssRules(node: Element): Array<{
  selectorText: string;
  style: CSSStyleDeclaration;
  styleSheetId: string;
}> {
  const unsorted: Array<{
    selectorText: string;
    style: CSSStyleDeclaration;
    styleSheetId: string;
    priority: number;
  }> = [];

  const stats = {
    totalRules: 0,
    styleRules: 0,
    matchedRules: 0,
    allSelectors: [] as string[],
  };

  const styleSheets = Array.from(document.styleSheets);

  styleSheets.forEach((styleSheet, index) => {
    const styleSheetId = getStyleSheetIdForSheet(styleSheet);
    const href = (styleSheet as CSSStyleSheet).href || '';
    let cssRules: CSSRuleList | null = null;

    try {
      // Cross-origin stylesheets may throw error / 크로스 오리진 스타일시트는 에러를 던질 수 있음
      cssRules = (styleSheet as CSSStyleSheet).cssRules;
      if (!cssRules) {
        return; // Skip if no cssRules / cssRules가 없으면 건너뛰기
      }
    } catch (e) {
      // Cross-origin error, skip this stylesheet / 크로스 오리진 에러, 이 스타일시트 건너뛰기
      return;
    }

    processCssRules(cssRules, node, styleSheetId, unsorted, stats, 0);
  });

  // Sort by priority (higher priority first) / 우선순위로 정렬 (높은 우선순위가 먼저)
  const sorted = unsorted
    .sort((a, b) => b.priority - a.priority)
    .map(({ priority, ...rest }) => rest);

  return sorted;
}

/**
 * Calculate selector priority / 셀렉터 우선순위 계산
 * Simple implementation: count IDs, classes, and elements / 간단한 구현: ID, 클래스, 요소 개수 계산
 */
function calculateSelectorPriority(selector: string): number {
  const idCount = (selector.match(/#/g) || []).length;
  const classCount = (selector.match(/\./g) || []).length;
  const elementCount = selector
    .split(/[#.\s>+~[\]]/)
    .filter((s) => s && /^[a-zA-Z]/.test(s)).length;

  // Priority: IDs (1000) > Classes (100) > Elements (1) / 우선순위: ID (1000) > 클래스 (100) > 요소 (1)
  return idCount * 1000 + classCount * 100 + elementCount;
}

/**
 * Get or create inline style sheet ID / 인라인 스타일시트 ID 가져오기 또는 생성
 */
export function getOrCreateInlineStyleSheetId(nodeId: number): string {
  let styleSheetId = inlineStyleSheetIds.get(nodeId);
  if (styleSheetId) return styleSheetId;

  styleSheetId = getStyleSheetId();
  inlineStyleSheetIds.set(nodeId, styleSheetId);
  inlineStyleNodeIds.set(styleSheetId, nodeId);

  return styleSheetId;
}

/**
 * Get inline style sheet ID / 인라인 스타일시트 ID 가져오기
 */
export function getInlineStyleSheetId(nodeId: number): string | undefined {
  return inlineStyleSheetIds.get(nodeId);
}

/**
 * Get inline style node ID from style sheet ID / 스타일시트 ID에서 인라인 스타일 노드 ID 가져오기
 */
export function getInlineStyleNodeId(styleSheetId: string): number | undefined {
  return inlineStyleNodeIds.get(styleSheetId);
}

// Style sheet text cache / 스타일시트 텍스트 캐시
const styleSheetTexts = new Map<string, string>();

/**
 * Get style sheet text / 스타일시트 텍스트 가져오기
 */
export async function getStyleSheetText(styleSheetId: string): Promise<string> {
  if (styleSheetTexts.has(styleSheetId)) {
    return styleSheetTexts.get(styleSheetId)!;
  }

  // Check if it's an inline style / 인라인 스타일인지 확인
  const nodeId = getInlineStyleNodeId(styleSheetId);
  if (nodeId) {
    // This will be handled by the CSS domain / 이것은 CSS 도메인에서 처리됨
    return '';
  }

  // Find style sheet and fetch text / 스타일시트 찾기 및 텍스트 가져오기
  for (let i = 0; i < document.styleSheets.length; i++) {
    const styleSheet = document.styleSheets[i];
    if (!styleSheet) continue;
    if (getStyleSheetIdForSheet(styleSheet) === styleSheetId) {
      const href = (styleSheet as CSSStyleSheet).href;
      if (href) {
        try {
          const response = await fetch(href);
          const text = await response.text();
          styleSheetTexts.set(styleSheetId, text);
          return text;
        } catch (e) {
          // Cross-origin or network error / 크로스 오리진 또는 네트워크 에러
          return '';
        }
      } else {
        // Inline style sheet / 인라인 스타일시트
        const text = Array.from((styleSheet as CSSStyleSheet).cssRules)
          .map((rule) => rule.cssText)
          .join('\n');
        styleSheetTexts.set(styleSheetId, text);
        return text;
      }
    }
  }

  return '';
}

/**
 * Get shorthand entries from style / 스타일에서 shorthand 항목 가져오기
 */
export function getShorthandEntries(
  style: CSSStyleDeclaration
): Array<{ name: string; value: string }> {
  const shorthandNames = ['background', 'font', 'border', 'margin', 'padding'];
  const ret: Array<{ name: string; value: string }> = [];

  shorthandNames.forEach((name) => {
    const value = (style as any)[name];
    if (value) {
      ret.push({ name, value });
    }
  });

  return ret;
}
