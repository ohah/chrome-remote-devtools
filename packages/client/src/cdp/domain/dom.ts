// DOM domain implementation / DOM 도메인 구현
import { getObjectById } from '../common/remoteObject';
import BaseDomain from './base';
import { Event } from './protocol';

// Simple node ID management / 간단한 노드 ID 관리
const nodeIdMap = new Map<Node, number>();
const nodeMap = new Map<number, Node>();
let nodeIdCounter = 1;

function getNodeId(node: Node): number {
  let id = nodeIdMap.get(node);
  if (!id) {
    id = nodeIdCounter++;
    nodeIdMap.set(node, id);
    nodeMap.set(id, node);
  }
  return id;
}

function getNodeById(nodeId: number): Node | null {
  return nodeMap.get(nodeId) || null;
}

function collectNode(
  node: Node,
  depth = 0
): {
  nodeId: number;
  nodeType: number;
  nodeName: string;
  localName?: string;
  nodeValue?: string;
  attributes?: Array<{ name: string; value: string }>;
  childNodeCount?: number;
  children?: unknown[];
} {
  const nodeId = getNodeId(node);
  const result: {
    nodeId: number;
    nodeType: number;
    nodeName: string;
    localName?: string;
    nodeValue?: string;
    attributes?: Array<{ name: string; value: string }>;
    childNodeCount?: number;
    children?: unknown[];
  } = {
    nodeId,
    nodeType: node.nodeType,
    nodeName: node.nodeName,
  };

  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element;
    result.localName = element.localName;
    result.attributes = Array.from(element.attributes).map((attr: Attr) => ({
      name: attr.name,
      value: attr.value,
    }));
    result.childNodeCount = element.childNodes.length;
    if (depth > 0 && element.childNodes.length > 0) {
      result.children = Array.from(element.childNodes)
        .slice(0, 100) // Limit children
        .map((child) => collectNode(child, depth - 1));
    }
  } else if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.COMMENT_NODE) {
    result.nodeValue = node.nodeValue || '';
  }

  return result;
}

export default class Dom extends BaseDomain {
  override namespace = 'DOM';

  private searchId = 0;
  private searchRet = new Map<number, Node[]>();
  private currentSearchKey = '';

  // Enable DOM domain / DOM 도메인 활성화
  override enable(): void {
    this.nodeObserver();
    Dom.set$Function();
  }

  // Get document / 문서 가져오기
  getDocument(): { root: unknown } {
    return {
      root: collectNode(document, 1),
    };
  }

  // Request child nodes / 자식 노드 요청
  requestChildNodes({ nodeId }: { nodeId: number }): void {
    const node = getNodeById(nodeId);
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return;

    const element = node as Element;
    const children = Array.from(element.childNodes).map((child) => collectNode(child, 0));

    this.send({
      method: Event.setChildNodes,
      params: {
        parentId: nodeId,
        nodes: children,
      },
    });
  }

  // Get outer HTML / 외부 HTML 가져오기
  getOuterHTML({ nodeId }: { nodeId: number }): { outerHTML: string } {
    const node = getNodeById(nodeId);
    if (!node || node.nodeType !== Node.ELEMENT_NODE) {
      return { outerHTML: '' };
    }
    return {
      outerHTML: (node as Element).outerHTML,
    };
  }

  // Set outer HTML / 외부 HTML 설정
  setOuterHTML({ nodeId, outerHTML }: { nodeId: number; outerHTML: string }): void {
    const node = getNodeById(nodeId);
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return;
    (node as Element).outerHTML = outerHTML;
  }

  // Set attributes as text / 텍스트로 속성 설정
  setAttributesAsText({ nodeId, text }: { nodeId: number; text: string }): void {
    const node = getNodeById(nodeId);
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return;

    const element = node as Element;
    if (text) {
      text
        .split(' ')
        .filter((item) => item)
        .forEach((item) => {
          const [name, value] = item.split('=');
          if (name && value) {
            element.setAttribute(name, value.replace(/["']/g, ''));
          }
        });
    } else {
      Array.from(element.attributes).forEach((attr: Attr) => element.removeAttribute(attr.name));
    }
  }

  // Request node by object ID / 객체 ID로 노드 요청
  requestNode({ objectId }: { objectId: string }): { nodeId: number } {
    const node = getObjectById(objectId) as Node;
    if (!node) {
      throw new Error('Node not found');
    }
    return { nodeId: getNodeId(node) };
  }

  // Set inspected node / 검사할 노드 설정
  setInspectedNode({ nodeId }: { nodeId: number }): void {
    const node = getNodeById(nodeId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).$0 = node;
  }

  // Perform search / 검색 수행
  performSearch({ query }: { query: string }): { searchId: number; resultCount: number } {
    this.currentSearchKey = query;
    const searchId = ++this.searchId;
    const results: Node[] = [];

    try {
      const elements = document.querySelectorAll(query);
      results.push(...Array.from(elements));
    } catch {
      // Invalid selector
    }

    this.searchRet.set(searchId, results);
    return { searchId, resultCount: results.length };
  }

  // Get search results / 검색 결과 가져오기
  getSearchResults({
    searchId,
    fromIndex,
    toIndex,
  }: {
    searchId: number;
    fromIndex?: number;
    toIndex?: number;
  }): {
    nodeIds: number[];
  } {
    const results = this.searchRet.get(searchId) || [];
    const from = fromIndex || 0;
    const to = toIndex !== undefined ? toIndex : results.length;
    const nodeIds = results.slice(from, to).map((node) => getNodeId(node));
    return { nodeIds };
  }

  // Discard search results / 검색 결과 버리기
  discardSearchResults({ searchId }: { searchId: number }): void {
    this.searchRet.delete(searchId);
  }

  // Get node for location / 위치로 노드 가져오기
  getNodeForLocation({ x, y }: { x: number; y: number }): { nodeId: number } {
    const node = document.elementFromPoint(x, y);
    if (!node) {
      throw new Error('Node not found at location');
    }
    return { nodeId: getNodeId(node) };
  }

  // Set node value / 노드 값 설정
  setNodeValue({ nodeId, value }: { nodeId: number; value: string }): void {
    const node = getNodeById(nodeId);
    if (node) {
      node.nodeValue = value;
    }
  }

  // Get box model / 박스 모델 가져오기
  getBoxModel({ nodeId }: { nodeId: number }): {
    model: {
      content: number[];
      padding: number[];
      border: number[];
      margin: number[];
      width: number;
      height: number;
    };
  } {
    const node = getNodeById(nodeId);
    if (!node || node.nodeType !== Node.ELEMENT_NODE) {
      throw new Error('Element not found');
    }

    const element = node as Element;
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);

    const paddingTop = parseFloat(style.paddingTop) || 0;
    const paddingRight = parseFloat(style.paddingRight) || 0;
    const paddingBottom = parseFloat(style.paddingBottom) || 0;
    const paddingLeft = parseFloat(style.paddingLeft) || 0;

    const borderTop = parseFloat(style.borderTopWidth) || 0;
    const borderRight = parseFloat(style.borderRightWidth) || 0;
    const borderBottom = parseFloat(style.borderBottomWidth) || 0;
    const borderLeft = parseFloat(style.borderLeftWidth) || 0;

    const marginTop = parseFloat(style.marginTop) || 0;
    const marginRight = parseFloat(style.marginRight) || 0;
    const marginBottom = parseFloat(style.marginBottom) || 0;
    const marginLeft = parseFloat(style.marginLeft) || 0;

    return {
      model: {
        content: [rect.left, rect.top, rect.right, rect.bottom],
        padding: [
          rect.left,
          rect.top + paddingTop,
          rect.right,
          rect.top + paddingTop + rect.height - paddingBottom,
        ],
        border: [
          rect.left - borderLeft,
          rect.top - borderTop,
          rect.right + borderRight,
          rect.bottom + borderBottom,
        ],
        margin: [
          rect.left - borderLeft - marginLeft,
          rect.top - borderTop - marginTop,
          rect.right + borderRight + marginRight,
          rect.bottom + borderBottom + marginBottom,
        ],
        width: rect.width,
        height: rect.height,
      },
    };
  }

  // Remove node / 노드 제거
  removeNode({ nodeId }: { nodeId: number }): void {
    const node = getNodeById(nodeId);
    if (node && node.parentNode) {
      node.parentNode.removeChild(node);
    }
  }

  // Push nodes by backend IDs / 백엔드 ID로 노드 푸시
  pushNodesByBackendIdsToFrontend({ backendNodeIds }: { backendNodeIds: number[] }): {
    nodeIds: number[];
  } {
    const nodeIds = backendNodeIds
      .map((id) => {
        const node = nodeMap.get(id);
        return node ? getNodeId(node) : 0;
      })
      .filter((id) => id > 0);
    return { nodeIds };
  }

  // Observe DOM changes / DOM 변경 관찰
  private nodeObserver(): void {
    const observer = new MutationObserver((mutations: MutationRecord[]) => {
      mutations.forEach((mutation: MutationRecord) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node: Node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.send({
                method: Event.childNodeInserted,
                params: {
                  parentNodeId: mutation.target ? getNodeId(mutation.target) : 0,
                  node: collectNode(node, 0),
                },
              });
            }
          });

          mutation.removedNodes.forEach((node: Node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.send({
                method: Event.childNodeRemoved,
                params: {
                  parentNodeId: mutation.target ? getNodeId(mutation.target) : 0,
                  nodeId: getNodeId(node),
                },
              });
            }
          });
        } else if (mutation.type === 'attributes') {
          const target = mutation.target as Element;
          this.send({
            method: Event.attributeModified,
            params: {
              nodeId: getNodeId(target),
              name: mutation.attributeName || '',
              value: target.getAttribute(mutation.attributeName || '') || '',
            },
          });
        } else if (mutation.type === 'characterData') {
          this.send({
            method: Event.characterDataModified,
            params: {
              nodeId: getNodeId(mutation.target),
              characterData: mutation.target.nodeValue || '',
            },
          });
        }
      });
    });

    observer.observe(document, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: true,
      characterData: true,
      characterDataOldValue: true,
    });
  }

  // Set $, $$, $x functions / $, $$, $x 함수 설정
  static set$Function(): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (window as any).$ !== 'function') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).$ = (selector: string) => document.querySelector(selector);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (window as any).$$ !== 'function') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).$$ = (selector: string) => document.querySelectorAll(selector);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (window as any).$x !== 'function') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).$x = (xpath: string) => {
        const xpathResult = document.evaluate(
          xpath,
          document,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        );
        const elements: Node[] = [];
        for (let i = 0; i < xpathResult.snapshotLength; i++) {
          const item = xpathResult.snapshotItem(i);
          if (item) elements.push(item);
        }
        return elements;
      };
    }
  }
}
