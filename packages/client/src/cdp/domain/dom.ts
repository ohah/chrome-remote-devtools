// DOM domain implementation / DOM 도메인 구현
import { getObjectById } from '../common/remoteObject';
import BaseDomain from './base';
import { Event } from './protocol';

// Simple node ID management / 간단한 노드 ID 관리
// Use WeakMap to avoid memory leaks when nodes are removed / 노드가 제거될 때 메모리 누수를 방지하기 위해 WeakMap 사용
const nodeIdMap = new WeakMap<Node, number>();
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
  const node = nodeMap.get(nodeId);
  if (!node) {
    return null;
  }
  return node;
}

// Find previous valid sibling node (skip whitespace nodes) / 이전 유효한 형제 노드 찾기 (공백 노드 제외)
function findPreviousValidSibling(node: Node): Node | null {
  let previousSibling = node.previousSibling;
  while (previousSibling && !isValidNode(previousSibling)) {
    previousSibling = previousSibling.previousSibling;
  }
  return previousSibling;
}

// Check if node is valid (not whitespace-only text node) / 노드가 유효한지 확인 (공백만 있는 텍스트 노드 제외)
function isValidNode(node: Node): boolean {
  // Filter out whitespace-only text nodes / 공백만 있는 텍스트 노드 제외
  if (node.nodeType === Node.TEXT_NODE) {
    const trimmed = (node.nodeValue || '').trim();
    return trimmed !== '';
  }
  return true;
}

// Filter nodes to exclude whitespace-only text nodes / 공백만 있는 텍스트 노드를 제외하여 노드 필터링
function filterNodes(nodes: NodeList | Node[]): Node[] {
  return Array.from(nodes).filter((node) => isValidNode(node));
}

function collectNode(
  node: Node,
  depth = 0
): {
  nodeId: number;
  backendNodeId: number;
  nodeType: number;
  nodeName: string;
  localName?: string;
  nodeValue?: string;
  attributes?: string[]; // CDP protocol: flat array [name1, value1, name2, value2, ...] / CDP 프로토콜: 평면 배열 [name1, value1, name2, value2, ...]
  childNodeCount?: number;
  children?: unknown[];
} {
  const nodeId = getNodeId(node);
  // backendNodeId is same as nodeId in our implementation / backendNodeId는 우리 구현에서 nodeId와 동일
  const backendNodeId = nodeId;
  const result: {
    nodeId: number;
    backendNodeId: number;
    nodeType: number;
    nodeName: string;
    localName?: string;
    nodeValue?: string;
    attributes?: string[]; // CDP protocol: flat array [name1, value1, name2, value2, ...] / CDP 프로토콜: 평면 배열 [name1, value1, name2, value2, ...]
    childNodeCount?: number;
    children?: unknown[];
  } = {
    nodeId,
    backendNodeId,
    nodeType: node.nodeType,
    nodeName: node.nodeName,
  };

  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element;
    result.localName = element.localName;
    // CDP protocol expects attributes as flat array [name1, value1, name2, value2, ...] / CDP 프로토콜은 attributes를 평면 배열 [name1, value1, name2, value2, ...] 형식으로 기대함
    const attributesArray: string[] = [];
    Array.from(element.attributes).forEach((attr: Attr) => {
      attributesArray.push(attr.name, attr.value);
    });
    result.attributes = attributesArray;
    // Filter out whitespace-only text nodes before counting / 공백만 있는 텍스트 노드를 제외한 후 개수 계산
    const filteredChildNodes = filterNodes(element.childNodes);
    result.childNodeCount = filteredChildNodes.length;
    // depth === -1 means collect entire subtree, depth > 0 means collect up to that depth / depth === -1은 전체 서브트리 수집, depth > 0은 해당 깊이까지 수집
    if ((depth === -1 || depth > 0) && filteredChildNodes.length > 0) {
      const nextDepth = depth === -1 ? -1 : depth - 1;
      // Include filtered child nodes (ELEMENT, TEXT, COMMENT) / 필터링된 자식 노드 포함 (ELEMENT, TEXT, COMMENT)
      result.children = filteredChildNodes.map((child) => collectNode(child, nextDepth));
    }
  } else if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.COMMENT_NODE) {
    result.nodeValue = node.nodeValue || '';
  } else if (node.nodeType === Node.DOCUMENT_TYPE_NODE) {
    // DocumentType node (DOCTYPE) / DocumentType 노드 (DOCTYPE)
    const docType = node as DocumentType;
    result.nodeValue = docType.name || '';
    // Always include publicId and systemId (even if empty) for DOMModel compatibility / DOMModel 호환성을 위해 publicId와 systemId 항상 포함 (비어있어도)
    (result as { publicId?: string }).publicId = docType.publicId || '';
    (result as { systemId?: string }).systemId = docType.systemId || '';
  } else if (node.nodeType === Node.DOCUMENT_NODE) {
    // Document node / 문서 노드
    // Filter out whitespace-only text nodes before counting / 공백만 있는 텍스트 노드를 제외한 후 개수 계산
    const filteredChildNodes = filterNodes(node.childNodes);
    result.childNodeCount = filteredChildNodes.length;
    if ((depth === -1 || depth > 0) && filteredChildNodes.length > 0) {
      const nextDepth = depth === -1 ? -1 : depth - 1;
      // Include filtered child nodes (ELEMENT, TEXT, COMMENT, DOCUMENT_TYPE) / 필터링된 자식 노드 포함 (ELEMENT, TEXT, COMMENT, DOCUMENT_TYPE)
      result.children = filteredChildNodes.map((child) => collectNode(child, nextDepth));
    }
  }

  return result;
}

export default class Dom extends BaseDomain {
  override namespace = 'DOM';

  private searchId = 0;
  private searchRet = new Map<number, Node[]>();
  private currentSearchKey = '';
  // Track which nodes have been registered in DOMModel / DOMModel에 등록된 노드 추적
  // Use WeakSet to avoid memory leaks when nodes are removed / 노드가 제거될 때 메모리 누수를 방지하기 위해 WeakSet 사용
  private registeredNodes = new WeakSet<Node>();

  // Enable DOM domain / DOM 도메인 활성화
  override enable(): void {
    // Mark all existing nodes as registered / 기존의 모든 노드를 등록된 것으로 표시
    const markNodeRegistered = (node: Node): void => {
      this.registeredNodes.add(node);
      if (node.nodeType === Node.ELEMENT_NODE) {
        node.childNodes.forEach((child) => {
          if (
            child.nodeType === Node.ELEMENT_NODE ||
            child.nodeType === Node.TEXT_NODE ||
            child.nodeType === Node.COMMENT_NODE
          ) {
            markNodeRegistered(child);
          }
        });
      }
    };
    markNodeRegistered(document);
    this.nodeObserver();
    Dom.set$Function();
  }

  // Get document / 문서 가져오기
  getDocument(params?: { depth?: number; pierce?: boolean }): { root: unknown } {
    // Extract depth parameter, default to -1 for full tree / depth 파라미터 추출, 기본값은 -1 (전체 트리)
    const depth = params?.depth ?? -1;

    // Mark all nodes in document as registered / 문서의 모든 노드를 등록된 것으로 표시
    const markNodeRegistered = (node: Node): void => {
      this.registeredNodes.add(node);
      if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.DOCUMENT_NODE) {
        node.childNodes.forEach((child) => {
          if (
            child.nodeType === Node.ELEMENT_NODE ||
            child.nodeType === Node.TEXT_NODE ||
            child.nodeType === Node.COMMENT_NODE ||
            child.nodeType === Node.DOCUMENT_TYPE_NODE
          ) {
            markNodeRegistered(child);
          }
        });
      }
    };
    markNodeRegistered(document);

    // Use depth -1 for full tree, or use provided depth / 전체 트리를 위해 depth -1 사용, 또는 제공된 depth 사용
    const root = collectNode(document, depth);

    // Add documentURL and baseURL for DOMDocument compatibility / DOMDocument 호환성을 위해 documentURL과 baseURL 추가
    if (root.nodeType === Node.DOCUMENT_NODE) {
      (root as { documentURL?: string }).documentURL = document.URL || location.href;
      (root as { baseURL?: string }).baseURL = document.baseURI || location.href;
    }

    return { root };
  }

  // Request child nodes / 자식 노드 요청
  requestChildNodes({ nodeId }: { nodeId: number }): void {
    const node = getNodeById(nodeId);
    if (!node) {
      console.warn(`[CDP DOM] requestChildNodes: Node not found for nodeId: ${nodeId}`);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      console.warn(
        `[CDP DOM] requestChildNodes: Node ${nodeId} is not an element node (nodeType: ${node.nodeType})`
      );
      return;
    }

    // Mark this node and its children as registered / 이 노드와 자식을 등록된 것으로 표시
    this.registeredNodes.add(node);
    const element = node as Element;
    element.childNodes.forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        this.registeredNodes.add(child);
      }
    });

    // Filter out whitespace-only text nodes / 공백만 있는 텍스트 노드 제외
    const filteredChildren = filterNodes(element.childNodes);
    const children = filteredChildren.map((child) => collectNode(child, 0));

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
    if (!node) {
      console.warn(`[CDP DOM] getOuterHTML: Node not found for nodeId: ${nodeId}`);
      return { outerHTML: '' };
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      console.warn(
        `[CDP DOM] getOuterHTML: Node ${nodeId} is not an element node (nodeType: ${node.nodeType})`
      );
      return { outerHTML: '' };
    }
    return {
      outerHTML: (node as Element).outerHTML,
    };
  }

  // Set outer HTML / 외부 HTML 설정
  setOuterHTML({ nodeId, outerHTML }: { nodeId: number; outerHTML: string }): void {
    const node = getNodeById(nodeId);
    if (!node) {
      console.warn(`[CDP DOM] setOuterHTML: Node not found for nodeId: ${nodeId}`);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      console.warn(
        `[CDP DOM] setOuterHTML: Node ${nodeId} is not an element node (nodeType: ${node.nodeType})`
      );
      return;
    }
    (node as Element).outerHTML = outerHTML;
  }

  // Set attributes as text / 텍스트로 속성 설정
  setAttributesAsText({ nodeId, text }: { nodeId: number; text: string }): void {
    const node = getNodeById(nodeId);
    if (!node) {
      console.warn(`[CDP DOM] setAttributesAsText: Node not found for nodeId: ${nodeId}`);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      console.warn(
        `[CDP DOM] setAttributesAsText: Node ${nodeId} is not an element node (nodeType: ${node.nodeType})`
      );
      return;
    }

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
      throw new Error(`Node not found for objectId: ${objectId}`);
    }
    return { nodeId: getNodeId(node) };
  }

  // Set inspected node / 검사할 노드 설정
  setInspectedNode({ nodeId }: { nodeId: number }): void {
    const node = getNodeById(nodeId);
    if (!node) {
      console.warn(`[CDP DOM] setInspectedNode: Node not found for nodeId: ${nodeId}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).$0 = null;
      return;
    }
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
      throw new Error(`Node not found at location (${x}, ${y})`);
    }
    return { nodeId: getNodeId(node) };
  }

  // Set node value / 노드 값 설정
  setNodeValue({ nodeId, value }: { nodeId: number; value: string }): void {
    const node = getNodeById(nodeId);
    if (!node) {
      console.warn(`[CDP DOM] setNodeValue: Node not found for nodeId: ${nodeId}`);
      return;
    }
    node.nodeValue = value;
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
    if (!node) {
      throw new Error(`Node not found for nodeId: ${nodeId}`);
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      throw new Error(`Node ${nodeId} is not an element node (nodeType: ${node.nodeType})`);
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
    if (!node) {
      console.warn(`[CDP DOM] removeNode: Node not found for nodeId: ${nodeId}`);
      return;
    }
    if (node.parentNode) {
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
            // Skip whitespace-only text nodes / 공백만 있는 텍스트 노드 건너뛰기
            if (!isValidNode(node)) {
              return;
            }

            if (node.nodeType === Node.ELEMENT_NODE) {
              const parentNode = mutation.target as Node;
              const parentNodeId = parentNode ? getNodeId(parentNode) : 0;

              // Only send if parent node is registered / 부모 노드가 등록된 경우에만 전송
              if (parentNodeId > 0 && this.registeredNodes.has(parentNode)) {
                // Find previous sibling node ID (skip whitespace nodes) / 이전 형제 노드 ID 찾기 (공백 노드 제외)
                const previousSibling = findPreviousValidSibling(node);
                const previousNodeId = previousSibling ? getNodeId(previousSibling) : 0;

                this.send({
                  method: Event.childNodeInserted,
                  params: {
                    parentNodeId: parentNodeId,
                    previousNodeId: previousNodeId,
                    node: collectNode(node, 0),
                  },
                });

                // Mark this node as registered / 이 노드를 등록된 것으로 표시
                this.registeredNodes.add(node);
              }
              // If parent is not registered, skip the event / 부모가 등록되지 않았으면 이벤트 건너뛰기
              // The node will be registered when requestChildNodes is called / requestChildNodes가 호출될 때 노드가 등록됨
            } else if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.COMMENT_NODE) {
              // Handle TEXT_NODE and COMMENT_NODE insertions / TEXT_NODE와 COMMENT_NODE 삽입 처리
              const parentNode = mutation.target as Node;
              const parentNodeId = parentNode ? getNodeId(parentNode) : 0;

              // Only send if parent node is registered / 부모 노드가 등록된 경우에만 전송
              if (parentNodeId > 0 && this.registeredNodes.has(parentNode)) {
                // Find previous sibling node ID (skip whitespace nodes) / 이전 형제 노드 ID 찾기 (공백 노드 제외)
                const previousSibling = findPreviousValidSibling(node);
                const previousNodeId = previousSibling ? getNodeId(previousSibling) : 0;

                this.send({
                  method: Event.childNodeInserted,
                  params: {
                    parentNodeId: parentNodeId,
                    previousNodeId: previousNodeId,
                    node: collectNode(node, 0),
                  },
                });

                // Mark this node as registered / 이 노드를 등록된 것으로 표시
                this.registeredNodes.add(node);
              }
            }
          });

          mutation.removedNodes.forEach((node: Node) => {
            // Skip whitespace-only text nodes / 공백만 있는 텍스트 노드 건너뛰기
            if (!isValidNode(node)) {
              return;
            }

            if (
              node.nodeType === Node.ELEMENT_NODE ||
              node.nodeType === Node.TEXT_NODE ||
              node.nodeType === Node.COMMENT_NODE
            ) {
              const parentNode = mutation.target as Node;
              const parentNodeId = parentNode ? getNodeId(parentNode) : 0;
              const nodeId = getNodeId(node);

              // Only send if parent node is registered / 부모 노드가 등록된 경우에만 전송
              if (parentNodeId > 0 && nodeId > 0 && this.registeredNodes.has(parentNode)) {
                this.send({
                  method: Event.childNodeRemoved,
                  params: {
                    parentNodeId: parentNodeId,
                    nodeId: nodeId,
                  },
                });
              }

              // Node is no longer in the DOM, so remove it from tracking immediately / 노드가 DOM에서 제거되었으므로 즉시 추적 대상에서 제거
              this.registeredNodes.delete(node);
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
