// CSS domain implementation / CSS 도메인 구현
import BaseDomain from './base';
import { Event } from './protocol';
import type { DomainOptions } from '../types';
import { getNodeById, getNodeId } from './common/node-manager';
import {
  getStyleSheets,
  getStyleSheetIdForSheet,
  formatStyle,
  getMatchedCssRules,
  getOrCreateInlineStyleSheetId,
  getInlineStyleSheetId,
  getInlineStyleNodeId,
  getStyleSheetText,
  getShorthandEntries,
  matchesSelector,
} from './css/stylesheet';

/**
 * Convert CSS properties to CDP format / CSS 속성을 CDP 형식으로 변환
 */
function toCssProperties(style: Record<string, string>): Array<{
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
function parseCssText(cssText: string): Record<string, string> {
  const cleaned = cssText.replace(/\/\*/g, '').replace(/\*\//g, '');
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
function getLineCount(str: string): number {
  return str.split('\n').length;
}

/**
 * Get last line from text / 텍스트에서 마지막 줄 가져오기
 */
function getLastLine(str: string): string {
  const lines = str.split('\n');
  return lines[lines.length - 1] || '';
}

/**
 * Format matched CSS rule / 매칭된 CSS 규칙 포맷
 */
function formatMatchedCssRule(
  node: Element,
  matchedCssRule: { selectorText: string; style: CSSStyleDeclaration; styleSheetId: string }
): {
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
} {
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
    } catch (e) {
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

export default class CSS extends BaseDomain {
  override namespace = 'CSS';
  private styleSheetObserver: MutationObserver | null = null;
  private processedStyleSheets = new WeakSet<StyleSheet>();

  constructor(options: DomainOptions) {
    super(options);
  }

  /**
   * Send styleSheetAdded event for a stylesheet / 스타일시트에 대한 styleSheetAdded 이벤트 전송
   */
  private sendStyleSheetAdded(styleSheet: StyleSheet): void {
    if (this.processedStyleSheets.has(styleSheet)) {
      return; // Already processed / 이미 처리됨
    }

    this.processedStyleSheets.add(styleSheet);
    const styleSheetId = getStyleSheetIdForSheet(styleSheet);
    const href = (styleSheet as CSSStyleSheet).href || '';
    const isInline = !href;

    // Debug: log styleSheetAdded event / 디버깅: styleSheetAdded 이벤트 로그
    if (typeof console !== 'undefined' && console.debug) {
      console.debug(`[CDP CSS] Sending styleSheetAdded event:`, {
        styleSheetId,
        href: href || '(inline)',
        isInline,
        sourceURL: isInline ? undefined : href,
      });
    }

    this.send({
      method: Event.styleSheetAdded,
      params: {
        header: {
          styleSheetId,
          frameId: 'main-frame',
          isInline,
          sourceURL: isInline ? undefined : href, // CDP spec: sourceURL should be undefined for inline stylesheets / CDP 스펙: 인라인 스타일시트의 경우 sourceURL은 undefined여야 함
          origin: 'regular' as const, // Required field: StyleSheetOrigin / 필수 필드: StyleSheetOrigin
          startColumn: 0,
          startLine: 0,
          endColumn: 0,
          endLine: 0,
        },
      },
    });
  }

  /**
   * Enable CSS domain / CSS 도메인 활성화
   * Send styleSheetAdded events for existing stylesheets / 기존 스타일시트에 대한 styleSheetAdded 이벤트 전송
   * Watch for dynamically added stylesheets (Vite HMR, Tailwind, etc.) / 동적으로 추가되는 스타일시트 감시 (Vite HMR, Tailwind 등)
   */
  override enable(): void {
    // Debug: log document state / 디버깅: document 상태 로그
    if (typeof console !== 'undefined' && console.debug) {
      console.debug(`[CDP CSS] enable: document.readyState: ${document.readyState}`);
      console.debug(`[CDP CSS] enable: document.head.children.length: ${document.head?.children.length || 0}`);
      // Log all <link> and <style> elements / 모든 <link> 및 <style> 요소 로그
      const linkElements = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      const styleElements = Array.from(document.querySelectorAll('style'));
      console.debug(`[CDP CSS] enable: Found ${linkElements.length} <link> elements and ${styleElements.length} <style> elements in document`);
      linkElements.forEach((link, index) => {
        console.debug(`[CDP CSS] enable: Link ${index}: href=${(link as HTMLLinkElement).href}, disabled=${(link as HTMLLinkElement).disabled}`);
      });
    }

    const styleSheets = getStyleSheets();
    let addedCount = 0;

    // Debug: log stylesheet count / 디버깅: 스타일시트 개수 로그
    if (typeof console !== 'undefined' && console.debug) {
      console.debug(`[CDP CSS] enable: Found ${styleSheets.length} stylesheets in document.styleSheets`);
      Array.from(styleSheets).forEach((styleSheet, index) => {
        const href = (styleSheet as CSSStyleSheet).href || '';
        const styleSheetId = getStyleSheetIdForSheet(styleSheet);
        const ownerNode = (styleSheet as any).ownerNode;
        const ownerNodeTag = ownerNode ? ownerNode.tagName : 'unknown';
        console.debug(`[CDP CSS] enable: Stylesheet ${index}: ${href || '(inline)'}, styleSheetId: ${styleSheetId}, ownerNode: ${ownerNodeTag}, alreadyProcessed: ${this.processedStyleSheets.has(styleSheet)}`);
      });
    }

    // Send events for existing stylesheets / 기존 스타일시트에 대한 이벤트 전송
    Array.from(styleSheets).forEach((styleSheet) => {
      this.sendStyleSheetAdded(styleSheet);
      addedCount++;
    });

    // Watch for dynamically added style elements / 동적으로 추가되는 style 요소 감시
    // This is important for Vite HMR and Tailwind CSS / Vite HMR과 Tailwind CSS에 중요
    if (typeof MutationObserver !== 'undefined') {
      this.styleSheetObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;

              // Check if it's a <style> or <link rel="stylesheet"> element / <style> 또는 <link rel="stylesheet"> 요소인지 확인
              if (
                element.tagName === 'STYLE' ||
                (element.tagName === 'LINK' && element.getAttribute('rel') === 'stylesheet')
              ) {
                // Wait a bit for the stylesheet to be added to document.styleSheets / 스타일시트가 document.styleSheets에 추가될 때까지 약간 대기
                setTimeout(() => {
                  const styleSheets = getStyleSheets();
                  Array.from(styleSheets).forEach((styleSheet) => {
                    if (!this.processedStyleSheets.has(styleSheet)) {
                      this.sendStyleSheetAdded(styleSheet);
                    }
                  });
                }, 0);
              }
            }
          });
        });
      });

      // Observe document head and body for style additions / 스타일 추가를 위해 document head와 body 관찰
      this.styleSheetObserver.observe(document.head, {
        childList: true,
        subtree: true,
      });
      if (document.body) {
        this.styleSheetObserver.observe(document.body, {
          childList: true,
          subtree: true,
        });
      }
    }

    // Also poll for new stylesheets periodically (fallback) / 주기적으로 새 스타일시트 확인 (폴백)
    // This helps catch stylesheets added by Vite HMR / Vite HMR로 추가된 스타일시트를 잡는 데 도움
    const checkInterval = setInterval(() => {
      const styleSheets = getStyleSheets();
      Array.from(styleSheets).forEach((styleSheet) => {
        if (!this.processedStyleSheets.has(styleSheet)) {
          this.sendStyleSheetAdded(styleSheet);
        }
      });
    }, 1000); // Check every second / 1초마다 확인

    // Store interval ID for cleanup / 정리를 위해 interval ID 저장
    (this as any)._checkInterval = checkInterval;

    // Debug: log enabled stylesheets / 디버깅: 활성화된 스타일시트 로그
    if (typeof console !== 'undefined' && console.debug) {
      console.debug(`[CDP CSS] enable: Sent styleSheetAdded events for ${addedCount} stylesheets`);
    }
  }

  /**
   * Disable CSS domain / CSS 도메인 비활성화
   */
  disable(): void {
    if (this.styleSheetObserver) {
      this.styleSheetObserver.disconnect();
      this.styleSheetObserver = null;
    }

    if ((this as any)._checkInterval) {
      clearInterval((this as any)._checkInterval);
      (this as any)._checkInterval = null;
    }
  }

  /**
   * Get computed style for node / 노드의 컴퓨티드 스타일 가져오기
   */
  getComputedStyleForNode({ nodeId }: { nodeId: number }): {
    computedStyle: Array<{ name: string; value: string }>;
  } {
    const node = getNodeById(nodeId);
    if (!node) {
      // Node not found in nodeMap, try to find it in document / nodeMap에서 노드를 찾을 수 없음, document에서 찾기 시도
      // This can happen if the node was removed or not yet registered / 노드가 제거되었거나 아직 등록되지 않은 경우 발생할 수 있음
      console.warn(
        `[CDP CSS] getComputedStyleForNode: Node not found in nodeMap for nodeId: ${nodeId}. ` +
          `This may happen if the node was removed from DOM or not yet registered.`
      );
      return { computedStyle: [] };
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      console.warn(
        `[CDP CSS] getComputedStyleForNode: Node ${nodeId} is not an element node (nodeType: ${node.nodeType})`
      );
      return { computedStyle: [] };
    }

    // Check if node is still in document / 노드가 여전히 document에 있는지 확인
    if (!document.contains(node)) {
      console.warn(
        `[CDP CSS] getComputedStyleForNode: Node ${nodeId} is not in document anymore (may have been removed)`
      );
      return { computedStyle: [] };
    }

    const element = node as Element;
    const computedStyle = window.getComputedStyle(element);
    const formattedStyle = formatStyle(computedStyle);

    return {
      computedStyle: toCssProperties(formattedStyle),
    };
  }

  /**
   * Get inline styles for node / 노드의 인라인 스타일 가져오기
   */
  getInlineStylesForNode({ nodeId }: { nodeId: number }): {
    inlineStyle?: {
      styleSheetId?: string;
      cssText?: string;
      range?: {
        startLine: number;
        endLine: number;
        startColumn: number;
        endColumn: number;
      };
      cssProperties: Array<{
        name: string;
        value: string;
        disabled?: boolean;
        implicit?: boolean;
        parsedOk?: boolean;
        text?: string;
        range?: {
          startLine: number;
          endColumn: number;
          endLine: number;
          startColumn: number;
        };
      }>;
      shorthandEntries: Array<{ name: string; value: string }>;
    };
  } {
    const node = getNodeById(nodeId);
    if (!node) {
      console.warn(
        `[CDP CSS] getInlineStylesForNode: Node not found in nodeMap for nodeId: ${nodeId}. ` +
          `This may happen if the node was removed from DOM or not yet registered.`
      );
      return {};
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      console.warn(
        `[CDP CSS] getInlineStylesForNode: Node ${nodeId} is not an element node (nodeType: ${node.nodeType})`
      );
      return {};
    }

    if (!document.contains(node)) {
      console.warn(
        `[CDP CSS] getInlineStylesForNode: Node ${nodeId} is not in document anymore (may have been removed)`
      );
      return {};
    }

    const element = node as HTMLElement;
    const style = element.style;
    const inlineStyle: {
      styleSheetId?: string;
      cssText?: string;
      range?: {
        startLine: number;
        endLine: number;
        startColumn: number;
        endColumn: number;
      };
      cssProperties: Array<{
        name: string;
        value: string;
        disabled?: boolean;
        implicit?: boolean;
        parsedOk?: boolean;
        text?: string;
        range?: {
          startLine: number;
          endColumn: number;
          endLine: number;
          startColumn: number;
        };
      }>;
      shorthandEntries: Array<{ name: string; value: string }>;
    } = {
      cssProperties: [],
      shorthandEntries: [],
    };

    if (style && style.length > 0) {
      const styleSheetId = getOrCreateInlineStyleSheetId(nodeId);
      inlineStyle.styleSheetId = styleSheetId;
      const cssText = element.getAttribute('style') || '';
      inlineStyle.cssText = cssText;

      if (cssText) {
        inlineStyle.range = {
          startLine: 0,
          startColumn: 0,
          endLine: getLineCount(cssText) - 1,
          endColumn: getLastLine(cssText).length,
        };
      }

      const parsedStyle = parseCssText(cssText);
      const cssPropertiesWithRange = toCssProperties(parsedStyle).map(({ name, value }) => {
        // Simple range calculation / 간단한 범위 계산
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

        const propertyStyle = (style as any)[name];
        const parsedOk = propertyStyle !== undefined && propertyStyle !== '';

        return {
          name,
          value,
          text,
          range: {
            startLine,
            endLine,
            startColumn,
            endColumn,
          },
          disabled: false,
          implicit: false,
          parsedOk,
        };
      });

      const formattedStyle = formatStyle(style);
      // Remove properties that are already in cssPropertiesWithRange / cssPropertiesWithRange에 이미 있는 속성 제거
      const existingNames = new Set(cssPropertiesWithRange.map((p) => p.name));
      const cssPropertiesWithoutRange = toCssProperties(
        Object.fromEntries(Object.entries(formattedStyle).filter(([name]) => !existingNames.has(name)))
      );

      inlineStyle.shorthandEntries = getShorthandEntries(style);
      inlineStyle.cssProperties = [...cssPropertiesWithRange, ...cssPropertiesWithoutRange];
    }

    return { inlineStyle };
  }

  /**
   * Get matched styles for node / 노드의 매칭된 스타일 가져오기
   */
  getMatchedStylesForNode({ nodeId }: { nodeId: number }): {
    matchedCSSRules: Array<{
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
    }>;
    inlineStyle?: {
      styleSheetId?: string;
      cssText?: string;
      range?: {
        startLine: number;
        endLine: number;
        startColumn: number;
        endColumn: number;
      };
      cssProperties: Array<{
        name: string;
        value: string;
        disabled?: boolean;
        implicit?: boolean;
        parsedOk?: boolean;
        text?: string;
        range?: {
          startLine: number;
          endColumn: number;
          endLine: number;
          startColumn: number;
        };
      }>;
      shorthandEntries: Array<{ name: string; value: string }>;
    };
    inherited?: Array<{
      inlineStyle?: {
        styleSheetId?: string;
        cssText?: string;
        range?: {
          startLine: number;
          endLine: number;
          startColumn: number;
          endColumn: number;
        };
        cssProperties: Array<{
          name: string;
          value: string;
          disabled?: boolean;
          implicit?: boolean;
          parsedOk?: boolean;
          text?: string;
          range?: {
            startLine: number;
            endColumn: number;
            endLine: number;
            startColumn: number;
          };
        }>;
        shorthandEntries: Array<{ name: string; value: string }>;
      };
      matchedCSSRules: Array<{
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
      }>;
    }>;
  } {
    const node = getNodeById(nodeId);
    if (!node) {
      console.warn(
        `[CDP CSS] getMatchedStylesForNode: Node not found in nodeMap for nodeId: ${nodeId}. ` +
          `This may happen if the node was removed from DOM or not yet registered.`
      );
      return { matchedCSSRules: [] };
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      console.warn(
        `[CDP CSS] getMatchedStylesForNode: Node ${nodeId} is not an element node (nodeType: ${node.nodeType})`
      );
      return { matchedCSSRules: [] };
    }

    if (!document.contains(node)) {
      console.warn(
        `[CDP CSS] getMatchedStylesForNode: Node ${nodeId} is not in document anymore (may have been removed)`
      );
      return { matchedCSSRules: [] };
    }

    const element = node as Element;
    const matchedCssRules = getMatchedCssRules(element);

    // Debug: log matched rules count / 디버깅: 매칭된 규칙 개수 로그
    if (typeof console !== 'undefined' && console.debug) {
      console.debug(
        `[CDP CSS] getMatchedStylesForNode: Found ${matchedCssRules.length} matched CSS rules for nodeId: ${nodeId}`
      );
    }

    const formattedRules = matchedCssRules.map((rule) => formatMatchedCssRule(element, rule));

    // Debug: log response structure / 디버깅: 응답 구조 로그
    if (typeof console !== 'undefined' && console.debug && formattedRules.length > 0) {
      console.debug(`[CDP CSS] getMatchedStylesForNode response for nodeId ${nodeId}:`, {
        matchedCSSRulesCount: formattedRules.length,
        firstRule: formattedRules[0] ? {
          styleSheetId: formattedRules[0].rule.styleSheetId,
          selectorText: formattedRules[0].rule.selectorList.text,
          cssPropertiesCount: formattedRules[0].rule.style.cssProperties.length,
        } : null,
      });
    }

    const inlineStyles = this.getInlineStylesForNode({ nodeId });

    // Get inherited styles from parent nodes / 부모 노드로부터 상속된 스타일 가져오기
    const inherited: Array<{
      inlineStyle?: {
        styleSheetId?: string;
        cssText?: string;
        range?: {
          startLine: number;
          endLine: number;
          startColumn: number;
          endColumn: number;
        };
        cssProperties: Array<{
          name: string;
          value: string;
          disabled?: boolean;
          implicit?: boolean;
          parsedOk?: boolean;
          text?: string;
          range?: {
            startLine: number;
            endColumn: number;
            endLine: number;
            startColumn: number;
          };
        }>;
        shorthandEntries: Array<{ name: string; value: string }>;
      };
      matchedCSSRules: Array<ReturnType<typeof formatMatchedCssRule>>;
    }> = [];

    // Walk up the parent chain to collect inherited styles / 부모 체인을 따라 올라가며 상속된 스타일 수집
    let parent: Element | null = element.parentElement;
    while (parent && parent !== document.documentElement) {
      const parentId = getNodeId(parent);
      if (parentId) {
        const parentMatchedRules = getMatchedCssRules(parent);
        const parentFormattedRules = parentMatchedRules.map((rule) => formatMatchedCssRule(parent as Element, rule));
        const parentInlineStyles = this.getInlineStylesForNode({ nodeId: parentId });

        if (parentFormattedRules.length > 0 || parentInlineStyles.inlineStyle) {
          inherited.push({
            inlineStyle: parentInlineStyles.inlineStyle,
            matchedCSSRules: parentFormattedRules,
          });
        }
      }
      parent = parent.parentElement;
    }

    // Also check document.documentElement (html) / document.documentElement (html)도 확인
    if (document.documentElement && document.documentElement !== element) {
      const htmlId = getNodeId(document.documentElement);
      if (htmlId) {
        const htmlMatchedRules = getMatchedCssRules(document.documentElement);
        const htmlFormattedRules = htmlMatchedRules.map((rule) => formatMatchedCssRule(document.documentElement, rule));
        const htmlInlineStyles = this.getInlineStylesForNode({ nodeId: htmlId });

        if (htmlFormattedRules.length > 0 || htmlInlineStyles.inlineStyle) {
          inherited.push({
            inlineStyle: htmlInlineStyles.inlineStyle,
            matchedCSSRules: htmlFormattedRules,
          });
        }
      }
    }

    const response = {
      matchedCSSRules: formattedRules,
      ...inlineStyles,
      inherited: inherited.length > 0 ? inherited : undefined,
      // TODO: Add other optional fields as needed / 필요에 따라 다른 선택적 필드 추가
      // pseudoElements: undefined,
      // inheritedPseudoElements: undefined,
      // cssKeyframesRules: undefined,
      // cssPositionTryRules: undefined,
      // cssPropertyRules: undefined,
      // cssPropertyRegistrations: undefined,
      // cssAtRules: undefined, // This would include @layer rules / 이것은 @layer 규칙을 포함할 수 있음
      // parentLayoutNodeId: undefined,
      // cssFunctionRules: undefined,
    };

    // Debug: log full response structure for first few calls / 디버깅: 처음 몇 번 호출에 대해 전체 응답 구조 로그
    if (typeof console !== 'undefined' && console.debug) {
      // Collect all styleSheetIds from matched rules and inherited rules / 매칭된 규칙과 상속된 규칙에서 모든 styleSheetId 수집
      const allStyleSheetIds = new Set<string>();
      response.matchedCSSRules?.forEach(rule => {
        if (rule.rule.styleSheetId) {
          allStyleSheetIds.add(rule.rule.styleSheetId);
        }
      });
      response.inherited?.forEach(inheritedEntry => {
        inheritedEntry.matchedCSSRules?.forEach(rule => {
          if (rule.rule.styleSheetId) {
            allStyleSheetIds.add(rule.rule.styleSheetId);
          }
        });
      });

      const responseSummary = {
        matchedCSSRulesCount: response.matchedCSSRules?.length || 0,
        hasInlineStyle: !!response.inlineStyle,
        inheritedCount: response.inherited?.length || 0,
        allStyleSheetIds: Array.from(allStyleSheetIds), // 모든 styleSheetId 표시
        firstRuleStyleSheetId: response.matchedCSSRules?.[0]?.rule?.styleSheetId,
        firstRuleSelector: response.matchedCSSRules?.[0]?.rule?.selectorList?.text,
        elementInfo: {
          tagName: element.tagName,
          className: element.className,
          id: element.id,
        },
      };
      console.debug(`[CDP CSS] getMatchedStylesForNode full response summary for nodeId ${nodeId}:`, responseSummary);
    }

    return response;
  }

  /**
   * Get background colors for node / 노드의 배경색 가져오기
   */
  getBackgroundColors({ nodeId }: { nodeId: number }): {
    backgroundColors: string[];
    computedFontSize?: string;
    computedFontWeight?: string;
  } {
    const node = getNodeById(nodeId);
    if (!node || node.nodeType !== Node.ELEMENT_NODE) {
      console.warn(`[CDP CSS] getBackgroundColors: Node not found or not an element for nodeId: ${nodeId}`);
      return { backgroundColors: [] };
    }

    const element = node as Element;
    const computedStyle = window.getComputedStyle(element);
    const formattedStyle = formatStyle(computedStyle);

    return {
      backgroundColors: formattedStyle['background-color'] ? [formattedStyle['background-color']] : [],
      computedFontSize: formattedStyle['font-size'],
      computedFontWeight: formattedStyle['font-weight'],
    };
  }

  /**
   * Get style sheet text / 스타일시트 텍스트 가져오기
   */
  async getStyleSheetText({ styleSheetId }: { styleSheetId: string }): Promise<{ text: string }> {
    // Debug: log styleSheetText request / 디버깅: styleSheetText 요청 로그
    if (typeof console !== 'undefined' && console.debug) {
      console.debug(`[CDP CSS] getStyleSheetText requested for styleSheetId: ${styleSheetId}`);
    }

    // Check if it's an inline style attribute / 인라인 style 속성인지 확인
    const nodeId = getInlineStyleNodeId(styleSheetId);
    if (nodeId) {
      const node = getNodeById(nodeId);
      if (node && node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        const text = element.getAttribute('style') || '';
        if (typeof console !== 'undefined' && console.debug) {
          console.debug(`[CDP CSS] getStyleSheetText: Found inline style attribute, text length: ${text.length}`);
        }
        return { text };
      }
    }

    // Check if it's an inline stylesheet (<style> tag) / 인라인 스타일시트 (<style> 태그)인지 확인
    // Find the stylesheet in document.styleSheets / document.styleSheets에서 스타일시트 찾기
    for (let i = 0; i < document.styleSheets.length; i++) {
      const styleSheet = document.styleSheets[i];
      if (!styleSheet) continue;
      const sheetId = getStyleSheetIdForSheet(styleSheet);
      if (sheetId === styleSheetId) {
        const href = (styleSheet as CSSStyleSheet).href;
        if (!href) {
          // This is an inline stylesheet (<style> tag) / 이것은 인라인 스타일시트 (<style> 태그)입니다
          try {
            const cssRules = (styleSheet as CSSStyleSheet).cssRules;
            if (cssRules) {
              const text = Array.from(cssRules)
                .map((rule) => rule.cssText)
                .join('\n');
              if (typeof console !== 'undefined' && console.debug) {
                console.debug(`[CDP CSS] getStyleSheetText: Found inline stylesheet, text length: ${text.length}`);
              }
              return { text };
            }
          } catch (e) {
            // Cross-origin error / 크로스 오리진 에러
            if (typeof console !== 'undefined' && console.debug) {
              console.debug(`[CDP CSS] getStyleSheetText: Cross-origin error for inline stylesheet: ${styleSheetId}`);
            }
            return { text: '' };
          }
        }
      }
    }

    // Get from stylesheet cache / 스타일시트 캐시에서 가져오기
    const text = await getStyleSheetText(styleSheetId);
    if (typeof console !== 'undefined' && console.debug) {
      console.debug(`[CDP CSS] getStyleSheetText: Retrieved stylesheet text, length: ${text.length}`);
    }
    return { text };
  }

  /**
   * Set style texts / 스타일 텍스트 설정
   */
  setStyleTexts({
    edits,
  }: {
    edits: Array<{
      styleSheetId: string;
      text: string;
      range?: {
        startLine: number;
        endLine: number;
        startColumn: number;
        endColumn: number;
      };
    }>;
  }): {
    styles: Array<{
      styleSheetId: string;
      cssText?: string;
      range?: {
        startLine: number;
        endLine: number;
        startColumn: number;
        endColumn: number;
      };
      cssProperties?: Array<{
        name: string;
        value: string;
        disabled?: boolean;
        implicit?: boolean;
        parsedOk?: boolean;
        text?: string;
        range?: {
          startLine: number;
          endColumn: number;
          endLine: number;
          startColumn: number;
        };
      }>;
      shorthandEntries?: Array<{ name: string; value: string }>;
    }>;
  } {
    const styles = edits.map((edit) => {
      const { styleSheetId, text, range } = edit;
      const nodeId = getInlineStyleNodeId(styleSheetId);

      // Only allow editing inline styles / 인라인 스타일만 편집 허용
      if (nodeId) {
        const node = getNodeById(nodeId);
        if (node && node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          let cssText = element.getAttribute('style') || '';

          if (range) {
            // Replace text in range / 범위의 텍스트 교체
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

            cssText = cssText.slice(0, start) + text + cssText.slice(end);
          } else {
            cssText = text;
          }

          element.setAttribute('style', cssText);

          // Return updated inline style / 업데이트된 인라인 스타일 반환
          const updatedInlineStyle = this.getInlineStylesForNode({ nodeId }).inlineStyle;
          if (updatedInlineStyle && updatedInlineStyle.styleSheetId) {
            return {
              styleSheetId: updatedInlineStyle.styleSheetId,
              cssText: updatedInlineStyle.cssText,
              range: updatedInlineStyle.range,
              cssProperties: updatedInlineStyle.cssProperties,
              shorthandEntries: updatedInlineStyle.shorthandEntries,
            };
          }
          return { styleSheetId };
        }
      }

      return { styleSheetId };
    });

    return { styles };
  }
}

