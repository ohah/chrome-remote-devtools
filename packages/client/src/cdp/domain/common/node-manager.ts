// Node ID management / 노드 ID 관리
// Shared between DOM and CSS domains / DOM과 CSS 도메인 간 공유

// Simple node ID management / 간단한 노드 ID 관리
// Use WeakMap to avoid memory leaks when nodes are removed / 노드가 제거될 때 메모리 누수를 방지하기 위해 WeakMap 사용
const nodeIdMap = new WeakMap<Node, number>();
const nodeMap = new Map<number, Node>();
let nodeIdCounter = 1;

/**
 * Get node ID for a node / 노드의 ID 가져오기
 */
export function getNodeId(node: Node): number {
  let id = nodeIdMap.get(node);
  if (!id) {
    id = nodeIdCounter++;
    nodeIdMap.set(node, id);
    nodeMap.set(id, node);
  }
  return id;
}

/**
 * Get node by ID / ID로 노드 가져오기
 */
export function getNodeById(nodeId: number): Node | null {
  const node = nodeMap.get(nodeId);
  if (!node) {
    // Debug: log nodeMap size for debugging / 디버깅을 위해 nodeMap 크기 로그
    if (typeof console !== 'undefined' && console.debug) {
      console.debug(
        `[NodeManager] Node ${nodeId} not found in nodeMap. ` +
          `Current nodeMap size: ${nodeMap.size}, ` +
          `nodeIdCounter: ${nodeIdCounter}`
      );
    }
    return null;
  }
  return node;
}

