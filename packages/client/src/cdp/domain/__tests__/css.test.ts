// CSS domain tests / CSS 도메인 테스트
// happy-dom is registered via bunfig.toml preload / happy-dom은 bunfig.toml preload를 통해 등록됨
import { describe, test, expect, beforeEach, beforeAll, afterAll, afterEach } from 'bun:test';
import CSS from '../css';
import {
  createWebSocketTestServer,
  createWebSocketConnection,
  type WebSocketTestServer,
} from '../../../__tests__/helpers/websocket-server';
import { getNodeId } from '../common/node-manager';

describe('CSS Domain', () => {
  let socket: WebSocket;
  let css: CSS;
  let testServer: WebSocketTestServer;

  beforeAll(() => {
    // Create WebSocket server for testing / 테스트를 위한 WebSocket 서버 생성
    testServer = createWebSocketTestServer();
  });

  afterAll(() => {
    // Close server after all tests / 모든 테스트 후 서버 종료
    testServer.server.stop();
  });

  beforeEach(async () => {
    // happy-dom이 window, document, MutationObserver를 자동으로 제공
    // happy-dom automatically provides window, document, MutationObserver

    // Use Bun's WebSocket with actual connection / 실제 연결을 사용하는 Bun의 WebSocket
    socket = await createWebSocketConnection(testServer.url);
    css = new CSS({ socket });

    // Setup basic HTML structure / 기본 HTML 구조 설정
    document.body.innerHTML = '';
    const div = document.createElement('div');
    div.id = 'test-element';
    div.className = 'test-class';
    div.setAttribute('style', 'color: red; background: blue;');
    document.body.appendChild(div);
  });

  afterEach(() => {
    // Close socket after each test / 각 테스트 후 소켓 닫기
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
    document.body.innerHTML = '';
  });

  test('should create instance / 인스턴스 생성', () => {
    expect(css).toBeDefined();
    expect(css.namespace).toBe('CSS');
  });

  test('should enable CSS domain / CSS 도메인 활성화', () => {
    expect(() => css.enable()).not.toThrow();
  });

  test('should disable CSS domain / CSS 도메인 비활성화', () => {
    css.enable();
    expect(() => css.disable()).not.toThrow();
  });

  test('should get computed style for node / 노드의 컴퓨티드 스타일 가져오기', () => {
    const element = document.getElementById('test-element');
    expect(element).toBeTruthy();
    if (!element) return;

    const nodeId = getNodeId(element);
    const result = css.getComputedStyleForNode({ nodeId });

    expect(result).toHaveProperty('computedStyle');
    expect(Array.isArray(result.computedStyle)).toBe(true);
    expect(result.computedStyle.length).toBeGreaterThan(0);
  });

  test('should return empty computed style for invalid node / 유효하지 않은 노드에 대해 빈 컴퓨티드 스타일 반환', () => {
    const result = css.getComputedStyleForNode({ nodeId: 99999 });
    expect(result).toEqual({ computedStyle: [] });
  });

  test('should get inline styles for node / 노드의 인라인 스타일 가져오기', () => {
    const element = document.getElementById('test-element');
    expect(element).toBeTruthy();
    if (!element) return;

    const nodeId = getNodeId(element);
    const result = css.getInlineStylesForNode({ nodeId });

    expect(result).toHaveProperty('inlineStyle');
    if (result.inlineStyle) {
      expect(result.inlineStyle).toHaveProperty('cssProperties');
      expect(result.inlineStyle).toHaveProperty('shorthandEntries');
      expect(Array.isArray(result.inlineStyle.cssProperties)).toBe(true);
      expect(Array.isArray(result.inlineStyle.shorthandEntries)).toBe(true);
      expect(result.inlineStyle.cssText).toContain('color');
      expect(result.inlineStyle.cssText).toContain('background');
    }
  });

  test('should return empty inline style for element without inline styles / 인라인 스타일이 없는 요소에 대해 빈 인라인 스타일 반환', () => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    const nodeId = getNodeId(div);

    const result = css.getInlineStylesForNode({ nodeId });
    // When no inline styles, inlineStyle should have empty arrays / 인라인 스타일이 없을 때, inlineStyle은 빈 배열을 가져야 함
    if (result.inlineStyle) {
      expect(result.inlineStyle.cssProperties).toEqual([]);
      expect(result.inlineStyle.shorthandEntries).toEqual([]);
      expect(result.inlineStyle.styleSheetId).toBeUndefined();
      expect(result.inlineStyle.cssText).toBeUndefined();
    }
  });

  test('should get matched styles for node / 노드의 매칭된 스타일 가져오기', () => {
    // Add a style element with CSS rules / CSS 규칙이 있는 style 요소 추가
    const style = document.createElement('style');
    style.textContent = '.test-class { color: green; } #test-element { font-size: 16px; }';
    document.head.appendChild(style);

    const element = document.getElementById('test-element');
    expect(element).toBeTruthy();
    if (!element) return;

    const nodeId = getNodeId(element);
    const result = css.getMatchedStylesForNode({ nodeId });

    expect(result).toHaveProperty('matchedCSSRules');
    expect(Array.isArray(result.matchedCSSRules)).toBe(true);
    expect(result).toHaveProperty('inlineStyle');
  });

  test('should get background colors for node / 노드의 배경색 가져오기', () => {
    const element = document.getElementById('test-element');
    expect(element).toBeTruthy();
    if (!element) return;

    const nodeId = getNodeId(element);
    const result = css.getBackgroundColors({ nodeId });

    expect(result).toHaveProperty('backgroundColors');
    expect(Array.isArray(result.backgroundColors)).toBe(true);
    // Element has inline background: blue / 요소에 인라인 background: blue가 있음
    expect(result.backgroundColors.length).toBeGreaterThan(0);
  });

  test('should return empty background colors for invalid node / 유효하지 않은 노드에 대해 빈 배경색 반환', () => {
    const result = css.getBackgroundColors({ nodeId: 99999 });
    expect(result).toEqual({ backgroundColors: [] });
  });

  test('should get style sheet text for inline style / 인라인 스타일의 스타일시트 텍스트 가져오기', async () => {
    const element = document.getElementById('test-element');
    expect(element).toBeTruthy();
    if (!element) return;

    const nodeId = getNodeId(element);
    const inlineStyles = css.getInlineStylesForNode({ nodeId });

    if (inlineStyles.inlineStyle?.styleSheetId) {
      const result = await css.getStyleSheetText({
        styleSheetId: inlineStyles.inlineStyle.styleSheetId,
      });

      expect(result).toHaveProperty('text');
      expect(result.text).toContain('color');
      expect(result.text).toContain('background');
    }
  });

  test('should set style texts / 스타일 텍스트 설정', () => {
    const element = document.getElementById('test-element');
    expect(element).toBeTruthy();
    if (!element) return;

    const nodeId = getNodeId(element);
    const inlineStyles = css.getInlineStylesForNode({ nodeId });

    if (inlineStyles.inlineStyle?.styleSheetId) {
      const result = css.setStyleTexts({
        edits: [
          {
            styleSheetId: inlineStyles.inlineStyle.styleSheetId,
            text: 'color: green; padding: 10px;',
          },
        ],
      });

      expect(result).toHaveProperty('styles');
      expect(Array.isArray(result.styles)).toBe(true);
      expect(result.styles.length).toBe(1);

      // Verify style was updated / 스타일이 업데이트되었는지 확인
      const updatedStyles = css.getInlineStylesForNode({ nodeId });
      expect(updatedStyles.inlineStyle?.cssText).toContain('color: green');
      expect(updatedStyles.inlineStyle?.cssText).toContain('padding: 10px');
    }
  });

  test('should set style texts with range / 범위를 사용하여 스타일 텍스트 설정', () => {
    const element = document.getElementById('test-element');
    expect(element).toBeTruthy();
    if (!element) return;

    const nodeId = getNodeId(element);
    const inlineStyles = css.getInlineStylesForNode({ nodeId });

    if (inlineStyles.inlineStyle?.styleSheetId && inlineStyles.inlineStyle.range) {
      const range = inlineStyles.inlineStyle.range;
      const result = css.setStyleTexts({
        edits: [
          {
            styleSheetId: inlineStyles.inlineStyle.styleSheetId,
            text: 'green',
            range: {
              startLine: range.startLine,
              endLine: range.endLine,
              startColumn: 7, // After "color: "
              endColumn: 10, // End of "red"
            },
          },
        ],
      });

      expect(result).toHaveProperty('styles');
      expect(result.styles.length).toBe(1);
    }
  });

  test('should handle inherited styles / 상속된 스타일 처리', () => {
    // Create parent and child elements with styles / 스타일이 있는 부모와 자식 요소 생성
    const parent = document.createElement('div');
    parent.className = 'parent-class';
    parent.setAttribute('style', 'font-size: 20px;');
    document.body.appendChild(parent);

    const child = document.createElement('div');
    child.className = 'child-class';
    child.setAttribute('style', 'color: red;');
    parent.appendChild(child);

    // Add CSS rules / CSS 규칙 추가
    const style = document.createElement('style');
    style.textContent = '.parent-class { margin: 10px; } .child-class { padding: 5px; }';
    document.head.appendChild(style);

    const childNodeId = getNodeId(child);
    const result = css.getMatchedStylesForNode({ nodeId: childNodeId });

    expect(result).toHaveProperty('matchedCSSRules');
    expect(result).toHaveProperty('inlineStyle');
    // Should have inherited styles from parent / 부모로부터 상속된 스타일이 있어야 함
    if (result.inherited) {
      expect(Array.isArray(result.inherited)).toBe(true);
    }
  });
});
