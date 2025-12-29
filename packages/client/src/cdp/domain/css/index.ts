// CSS domain implementation / CSS 도메인 구현
import BaseDomain from '../base';
import { Event } from '../protocol';
import type { DomainOptions } from '../../types';
import { getNodeById, getNodeId } from '../common/node-manager';
import {
  getStyleSheets,
  getStyleSheetIdForSheet,
  formatStyle,
  getMatchedCssRules,
  getOrCreateInlineStyleSheetId,
  getInlineStyleNodeId,
  getStyleSheetText,
  getShorthandEntries,
} from './stylesheet';
import {
  toCssProperties,
  parseCssText,
  getLineCount,
  getLastLine,
  calculatePropertyRange,
  formatMatchedCssRule,
  calculateTextPosition,
} from './utils';
import type { InlineStyle, InheritedStyle, StyleTextEdit, StyleResult } from './types';

export default class CSS extends BaseDomain {
  override namespace = 'CSS';
  private styleSheetObserver: MutationObserver | null = null;
  private processedStyleSheets = new WeakSet<StyleSheet>();

  constructor(options: DomainOptions) {
    super(options);
  }

  /**
   * Validate element node / 요소 노드 검증
   * @param nodeId - Node ID / 노드 ID
   * @returns Element if valid, null otherwise / 유효하면 Element, 그렇지 않으면 null
   */
  private validateElementNode(nodeId: number): Element | null {
    const node = getNodeById(nodeId);
    if (!node) {
      return null;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }
    if (!document.contains(node)) {
      return null;
    }
    return node as Element;
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
    const href = styleSheet.href || '';
    const isInline = !href;

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
    const styleSheets = getStyleSheets();

    // Send events for existing stylesheets / 기존 스타일시트에 대한 이벤트 전송
    Array.from(styleSheets).forEach((styleSheet) => {
      this.sendStyleSheetAdded(styleSheet);
    });

    // Watch for dynamically added style elements / 동적으로 추가되는 style 요소 감시
    // This is important for Vite HMR and Tailwind CSS / Vite HMR과 Tailwind CSS에 중요
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

  /**
   * Disable CSS domain / CSS 도메인 비활성화
   */
  disable(): void {
    if (this.styleSheetObserver) {
      this.styleSheetObserver.disconnect();
      this.styleSheetObserver = null;
    }
  }

  /**
   * Get computed style for node / 노드의 컴퓨티드 스타일 가져오기
   */
  getComputedStyleForNode({ nodeId }: { nodeId: number }): {
    computedStyle: Array<{ name: string; value: string }>;
  } {
    const element = this.validateElementNode(nodeId);
    if (!element) {
      return { computedStyle: [] };
    }

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
    inlineStyle?: InlineStyle;
  } {
    const element = this.validateElementNode(nodeId);
    if (!element) {
      return {};
    }

    const htmlElement = element as HTMLElement;
    const style = htmlElement.style;
    const inlineStyle: InlineStyle = {
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
        const range = calculatePropertyRange(cssText, name, value);
        const propertyStyle = (style as any)[name];
        const parsedOk = propertyStyle !== undefined && propertyStyle !== '';

        return {
          name,
          value,
          text: range.text,
          range: {
            startLine: range.startLine,
            endLine: range.endLine,
            startColumn: range.startColumn,
            endColumn: range.endColumn,
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
        Object.fromEntries(
          Object.entries(formattedStyle).filter(([name]) => !existingNames.has(name))
        )
      );

      inlineStyle.shorthandEntries = getShorthandEntries(style);
      inlineStyle.cssProperties = [...cssPropertiesWithRange, ...cssPropertiesWithoutRange];
    }

    return { inlineStyle };
  }

  /**
   * Collect inherited styles from parent elements / 부모 요소로부터 상속된 스타일 수집
   * @param element - Current element / 현재 요소
   * @returns Array of inherited styles / 상속된 스타일 배열
   */
  private collectInheritedStyles(element: Element): Array<InheritedStyle> {
    const inherited: Array<InheritedStyle> = [];

    // Walk up the parent chain to collect inherited styles / 부모 체인을 따라 올라가며 상속된 스타일 수집
    let parent: Element | null = element.parentElement;
    while (parent && parent !== document.documentElement) {
      const parentId = getNodeId(parent);
      if (parentId) {
        const parentMatchedRules = getMatchedCssRules(parent);
        const parentFormattedRules = parentMatchedRules.map((rule) =>
          formatMatchedCssRule(parent as Element, rule)
        );
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
        const htmlFormattedRules = htmlMatchedRules.map((rule) =>
          formatMatchedCssRule(document.documentElement, rule)
        );
        const htmlInlineStyles = this.getInlineStylesForNode({ nodeId: htmlId });

        if (htmlFormattedRules.length > 0 || htmlInlineStyles.inlineStyle) {
          inherited.push({
            inlineStyle: htmlInlineStyles.inlineStyle,
            matchedCSSRules: htmlFormattedRules,
          });
        }
      }
    }

    return inherited;
  }

  /**
   * Get matched styles for node / 노드의 매칭된 스타일 가져오기
   */
  getMatchedStylesForNode({ nodeId }: { nodeId: number }): {
    matchedCSSRules: Array<ReturnType<typeof formatMatchedCssRule>>;
    inlineStyle?: InlineStyle;
    inherited?: Array<InheritedStyle>;
  } {
    const element = this.validateElementNode(nodeId);
    if (!element) {
      return { matchedCSSRules: [] };
    }

    const matchedCssRules = getMatchedCssRules(element);
    const formattedRules = matchedCssRules.map((rule) => formatMatchedCssRule(element, rule));
    const inlineStyles = this.getInlineStylesForNode({ nodeId });
    const inherited = this.collectInheritedStyles(element);

    return {
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
  }

  /**
   * Get background colors for node / 노드의 배경색 가져오기
   */
  getBackgroundColors({ nodeId }: { nodeId: number }): {
    backgroundColors: string[];
    computedFontSize?: string;
    computedFontWeight?: string;
  } {
    const element = this.validateElementNode(nodeId);
    if (!element) {
      return { backgroundColors: [] };
    }

    const computedStyle = window.getComputedStyle(element);
    const formattedStyle = formatStyle(computedStyle);

    return {
      backgroundColors: formattedStyle['background-color']
        ? [formattedStyle['background-color']]
        : [],
      computedFontSize: formattedStyle['font-size'],
      computedFontWeight: formattedStyle['font-weight'],
    };
  }

  /**
   * Get style sheet text / 스타일시트 텍스트 가져오기
   */
  async getStyleSheetText({ styleSheetId }: { styleSheetId: string }): Promise<{ text: string }> {
    // Check if it's an inline style attribute / 인라인 style 속성인지 확인
    const nodeId = getInlineStyleNodeId(styleSheetId);
    if (nodeId) {
      const node = getNodeById(nodeId);
      if (node && node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        const text = element.getAttribute('style') || '';
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
        const href = styleSheet.href;
        if (!href) {
          // This is an inline stylesheet (<style> tag) / 이것은 인라인 스타일시트 (<style> 태그)입니다
          try {
            const cssRules = styleSheet.cssRules;
            if (cssRules) {
              const text = Array.from(cssRules)
                .map((rule) => rule.cssText)
                .join('\n');
              return { text };
            }
          } catch {
            // Cross-origin error / 크로스 오리진 에러
            return { text: '' };
          }
        }
      }
    }

    // Get from stylesheet cache / 스타일시트 캐시에서 가져오기
    const text = await getStyleSheetText(styleSheetId);
    return { text };
  }

  /**
   * Set style texts / 스타일 텍스트 설정
   */
  setStyleTexts({ edits }: { edits: Array<StyleTextEdit> }): {
    styles: Array<StyleResult>;
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
            const { start, end } = calculateTextPosition(cssText, range);
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
