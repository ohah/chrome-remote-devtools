// Data extractors for replay mode / replay 모드를 위한 데이터 추출 함수
import type { CDPMessageArray, StorageItems, Cookie, DOMTree } from '../types';

/**
 * Extract DOM tree from file data / 파일 데이터에서 DOM 트리 추출
 * @param file - CDP event file / CDP 이벤트 파일
 * @param cdpMessages - CDP messages for fallback / 폴백을 위한 CDP 메시지
 * @returns DOM tree or null / DOM 트리 또는 null
 */
export async function extractDOMTree(
  file: File,
  cdpMessages: CDPMessageArray
): Promise<DOMTree | null> {
  // First, try to get DOM tree from file data / 먼저 파일 데이터에서 DOM 트리 가져오기 시도
  try {
    const { readCDPFile } = await import('@/shared/lib/file-to-cdp');
    const fileData = await readCDPFile(file);
    if (fileData.domTree?.html) {
      // Parse HTML to create a simple DOM tree structure / HTML을 파싱하여 간단한 DOM 트리 구조 생성
      // Note: This is a simplified version, full DOM tree parsing would be complex / 참고: 이것은 간소화된 버전이며, 전체 DOM 트리 파싱은 복잡함
      const parser = new DOMParser();
      const doc = parser.parseFromString(fileData.domTree.html, 'text/html');

      // Convert document to CDP format / 문서를 CDP 형식으로 변환
      const convertNode = (node: Node, nodeId: number): unknown => {
        const result: Record<string, unknown> = {
          nodeId,
          backendNodeId: nodeId,
          nodeType: node.nodeType,
          nodeName: node.nodeName,
        };

        if (node.nodeType === Node.DOCUMENT_NODE) {
          const doc = node as Document;
          result.documentURL = fileData.domTree?.documentURL || window.location.href;
          result.baseURL = fileData.domTree?.baseURL || window.location.href;
          const children: unknown[] = [];
          let childId = nodeId + 1;
          doc.childNodes.forEach((child) => {
            if (child.nodeType !== Node.TEXT_NODE || child.textContent?.trim()) {
              children.push(convertNode(child, childId++));
            }
          });
          result.childNodeCount = children.length;
          if (children.length > 0) {
            result.children = children;
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          result.localName = element.localName;
          const attributes: string[] = [];
          Array.from(element.attributes).forEach((attr) => {
            attributes.push(attr.name, attr.value);
          });
          result.attributes = attributes;
          const children: unknown[] = [];
          let childId = nodeId + 1;
          element.childNodes.forEach((child) => {
            if (child.nodeType !== Node.TEXT_NODE || child.textContent?.trim()) {
              children.push(convertNode(child, childId++));
            }
          });
          result.childNodeCount = children.length;
          if (children.length > 0) {
            result.children = children;
          }
        } else if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.COMMENT_NODE) {
          result.nodeValue = node.nodeValue || '';
        } else if (node.nodeType === Node.DOCUMENT_TYPE_NODE) {
          const docType = node as DocumentType;
          result.nodeValue = docType.name || '';
          result.publicId = docType.publicId || '';
          result.systemId = docType.systemId || '';
        }

        return result;
      };

      return {
        root: convertNode(doc, 1),
      };
    }
  } catch {
    // Ignore errors / 오류 무시
  }

  // Fallback: Find the first DOM.setChildNodes event with parentId 0 or undefined (document root) / 폴백: parentId가 0이거나 undefined인 첫 번째 DOM.setChildNodes 이벤트 찾기 (문서 루트)
  for (const msg of cdpMessages) {
    try {
      const parsed = JSON.parse(msg.message);
      if (parsed.method === 'DOM.setChildNodes' && parsed.params) {
        const { parentId, nodes } = parsed.params;
        // parentId가 0이거나 undefined이면 문서 루트 / If parentId is 0 or undefined, it's the document root
        if (parentId === 0 || parentId === undefined || parentId === null) {
          // Return document node with children / 자식이 있는 문서 노드 반환
          return {
            root: {
              nodeId: 1,
              backendNodeId: 1,
              nodeType: 9, // DOCUMENT_NODE
              nodeName: '#document',
              documentURL: window.location.href,
              baseURL: window.location.href,
              childNodeCount: nodes?.length || 0,
              children: nodes || [],
            },
          };
        }
      } else if (parsed.method === 'DOM.documentUpdated' && parsed.params) {
        // documentUpdated 이벤트가 있으면 DOM이 업데이트되었음을 의미 / documentUpdated 이벤트가 있으면 DOM이 업데이트되었음을 의미
        // 다음 setChildNodes 이벤트를 찾아야 함 / 다음 setChildNodes 이벤트를 찾아야 함
        continue;
      }
    } catch {
      // Ignore parsing errors / 파싱 오류 무시
    }
  }
  return null;
}

/**
 * Extract localStorage and sessionStorage from file data / 파일 데이터에서 localStorage와 sessionStorage 추출
 * @param file - CDP event file / CDP 이벤트 파일
 * @param cdpMessages - CDP messages for fallback / 폴백을 위한 CDP 메시지
 * @returns Storage items / Storage 항목
 */
export async function extractDOMStorageItems(
  file: File,
  cdpMessages: CDPMessageArray
): Promise<StorageItems> {
  // Read file to get storage items / storage 항목을 가져오기 위해 파일 읽기
  try {
    const { readCDPFile } = await import('@/shared/lib/file-to-cdp');
    const fileData = await readCDPFile(file);
    return {
      localStorage: fileData.localStorage || [],
      sessionStorage: fileData.sessionStorage || [],
    };
  } catch {
    // Fallback: extract from stored events / 폴백: 저장된 이벤트에서 추출
    const localStorageItems = new Map<string, string>();
    const sessionStorageItems = new Map<string, string>();

    for (const msg of cdpMessages) {
      try {
        const parsed = JSON.parse(msg.message);
        if (parsed.method === 'DOMStorage.domStorageItemAdded' && parsed.params) {
          const { storageId, key, newValue } = parsed.params;
          if (storageId?.isLocalStorage) {
            localStorageItems.set(key, newValue);
          } else {
            sessionStorageItems.set(key, newValue);
          }
        } else if (parsed.method === 'DOMStorage.domStorageItemUpdated' && parsed.params) {
          const { storageId, key, newValue } = parsed.params;
          if (storageId?.isLocalStorage) {
            localStorageItems.set(key, newValue);
          } else {
            sessionStorageItems.set(key, newValue);
          }
        } else if (parsed.method === 'DOMStorage.domStorageItemRemoved' && parsed.params) {
          const { storageId, key } = parsed.params;
          if (storageId?.isLocalStorage) {
            localStorageItems.delete(key);
          } else {
            sessionStorageItems.delete(key);
          }
        } else if (parsed.method === 'DOMStorage.domStorageItemsCleared' && parsed.params) {
          const { storageId } = parsed.params;
          if (storageId?.isLocalStorage) {
            localStorageItems.clear();
          } else {
            sessionStorageItems.clear();
          }
        }
      } catch {
        // Ignore parsing errors / 파싱 오류 무시
      }
    }

    return {
      localStorage: Array.from(localStorageItems.entries()),
      sessionStorage: Array.from(sessionStorageItems.entries()),
    };
  }
}

/**
 * Extract cookies from file data / 파일 데이터에서 쿠키 추출
 * @param file - CDP event file / CDP 이벤트 파일
 * @returns Cookies array / 쿠키 배열
 */
export async function extractCookies(file: File): Promise<Cookie[]> {
  // Read file to get cookies / 쿠키를 가져오기 위해 파일 읽기
  try {
    const { readCDPFile } = await import('@/shared/lib/file-to-cdp');
    const fileData = await readCDPFile(file);
    if (fileData.cookies && Array.isArray(fileData.cookies)) {
      return fileData.cookies;
    }
  } catch {
    // Ignore errors / 오류 무시
  }

  // Fallback: return empty array if no cookies found / 쿠키를 찾을 수 없으면 빈 배열 반환
  return [];
}
