// Message handlers for replay mode / replay 모드를 위한 메시지 핸들러
import type { PostMessageCDPMessage } from '@/shared/lib/file-to-cdp';
import type { ResponseBodyStore } from '../types';
import { sendFakeResponse, sendStorageItemsAsEvents } from './message-sender';
import { extractDOMTree, extractDOMStorageItems, extractCookies } from './extractors';

/**
 * Command handler context / 명령 핸들러 컨텍스트
 */
export interface CommandHandlerContext {
  file: File;
  cdpMessages: PostMessageCDPMessage[];
  responseBodyStore: ResponseBodyStore;
  targetWindow: Window;
}

/**
 * Handle Network.getResponseBody command / Network.getResponseBody 명령 처리
 * @param parsed - Parsed command / 파싱된 명령
 * @param context - Handler context / 핸들러 컨텍스트
 * @returns True if handled / 처리되었으면 true
 */
export function handleGetResponseBody(
  parsed: { method: string; id?: number; params?: { requestId?: string } },
  context: CommandHandlerContext
): boolean {
  if (parsed.method !== 'Network.getResponseBody' || parsed.id === undefined) {
    return false;
  }

  const requestId = parsed.params?.requestId;
  if (requestId) {
    // Get stored response body / 저장된 응답 본문 가져오기
    const body = context.responseBodyStore.get(requestId);
    sendFakeResponse(context.targetWindow, parsed.id, {
      body: body || '',
      base64Encoded: false,
    });
    return true;
  }
  return false;
}

/**
 * Handle DOM.getDocument command / DOM.getDocument 명령 처리
 * @param parsed - Parsed command / 파싱된 명령
 * @param context - Handler context / 핸들러 컨텍스트
 * @returns True if handled / 처리되었으면 true
 */
export function handleGetDocument(
  parsed: { method: string; id?: number },
  context: CommandHandlerContext
): boolean {
  if (parsed.method !== 'DOM.getDocument' || parsed.id === undefined) {
    return false;
  }

  // Extract DOM tree from file data / 파일 데이터에서 DOM 트리 추출
  void extractDOMTree(context.file, context.cdpMessages).then((domTree) => {
    if (domTree) {
      sendFakeResponse(context.targetWindow, parsed.id!, domTree);
    } else {
      // Fallback to empty document if no DOM tree found / DOM 트리를 찾을 수 없으면 빈 문서로 폴백
      sendFakeResponse(context.targetWindow, parsed.id!, {
        root: {
          nodeId: 1,
          backendNodeId: 1,
          nodeType: 9, // DOCUMENT_NODE
          nodeName: '#document',
          documentURL: window.location.href,
          baseURL: window.location.href,
          childNodeCount: 0,
          children: [],
        },
      });
    }
  });
  return true;
}

/**
 * Handle Network.getCookies command / Network.getCookies 명령 처리
 * @param parsed - Parsed command / 파싱된 명령
 * @param context - Handler context / 핸들러 컨텍스트
 * @returns True if handled / 처리되었으면 true
 */
export function handleGetCookies(
  parsed: { method: string; id?: number },
  context: CommandHandlerContext
): boolean {
  if (parsed.method !== 'Network.getCookies' || parsed.id === undefined) {
    return false;
  }

  // Extract cookies from file data / 파일 데이터에서 쿠키 추출
  void extractCookies(context.file).then((cookies) => {
    sendFakeResponse(context.targetWindow, parsed.id!, {
      cookies,
    });
  });
  return true;
}

/**
 * Handle Page.getResourceTree command / Page.getResourceTree 명령 처리
 * @param parsed - Parsed command / 파싱된 명령
 * @param context - Handler context / 핸들러 컨텍스트
 * @returns True if handled / 처리되었으면 true
 */
export function handleGetResourceTree(
  parsed: { method: string; id?: number },
  context: CommandHandlerContext
): boolean {
  if (parsed.method !== 'Page.getResourceTree' || parsed.id === undefined) {
    return false;
  }

  sendFakeResponse(context.targetWindow, parsed.id, {
    frameTree: {
      frame: {
        id: 'main',
        mimeType: 'text/html',
        securityOrigin: window.location.origin,
        url: window.location.href,
      },
      resources: [],
    },
  });
  return true;
}

/**
 * Handle Storage.getStorageKey command / Storage.getStorageKey 명령 처리
 * @param parsed - Parsed command / 파싱된 명령
 * @param context - Handler context / 핸들러 컨텍스트
 * @returns True if handled / 처리되었으면 true
 */
export function handleGetStorageKey(
  parsed: { method: string; id?: number },
  context: CommandHandlerContext
): boolean {
  if (parsed.method !== 'Storage.getStorageKey' || parsed.id === undefined) {
    return false;
  }

  const storageKey = window.location.origin;
  sendFakeResponse(context.targetWindow, parsed.id, {
    storageKey,
  });
  return true;
}

/**
 * Handle DOMStorage.enable command / DOMStorage.enable 명령 처리
 * @param parsed - Parsed command / 파싱된 명령
 * @param context - Handler context / 핸들러 컨텍스트
 * @returns True if handled / 처리되었으면 true
 */
export function handleDOMStorageEnable(
  parsed: { method: string; id?: number },
  context: CommandHandlerContext
): boolean {
  if (parsed.method !== 'DOMStorage.enable' || parsed.id === undefined) {
    return false;
  }

  // Send fake response first / 먼저 가짜 응답 전송
  sendFakeResponse(context.targetWindow, parsed.id, {});

  // Wait a bit for storage to be created by StorageKeyManager / StorageKeyManager가 storage를 생성할 시간 대기
  setTimeout(() => {
    // Then send initial storage items as events / 그 다음 초기 storage 항목을 이벤트로 전송
    void extractDOMStorageItems(context.file, context.cdpMessages).then((storageItems) => {
      sendStorageItemsAsEvents(storageItems, context.targetWindow);
    });
  }, 200); // Wait 200ms for storage to be created / storage가 생성될 시간을 위해 200ms 대기
  return true;
}

/**
 * Handle DOMStorage.getDOMStorageItems command / DOMStorage.getDOMStorageItems 명령 처리
 * @param parsed - Parsed command / 파싱된 명령
 * @param context - Handler context / 핸들러 컨텍스트
 * @returns True if handled / 처리되었으면 true
 */
export function handleGetDOMStorageItems(
  parsed: {
    method: string;
    id?: number;
    params?: { storageId?: { isLocalStorage?: boolean } };
  },
  context: CommandHandlerContext
): boolean {
  if (parsed.method !== 'DOMStorage.getDOMStorageItems' || parsed.id === undefined) {
    return false;
  }

  const storageId = parsed.params?.storageId;
  const commandId = parsed.id; // Store id after undefined check / undefined 체크 후 id 저장
  if (storageId && commandId !== undefined) {
    // Extract storage items from file data / 파일 데이터에서 storage 항목 추출
    void extractDOMStorageItems(context.file, context.cdpMessages).then((storageItems) => {
      const entries = storageId.isLocalStorage
        ? storageItems.localStorage
        : storageItems.sessionStorage;
      sendFakeResponse(context.targetWindow, commandId, {
        entries,
      });
    });
    return true;
  }
  return false;
}

/**
 * Handle all CDP commands / 모든 CDP 명령 처리
 * @param parsed - Parsed command / 파싱된 명령
 * @param context - Handler context / 핸들러 컨텍스트
 * @returns True if handled / 처리되었으면 true
 */
export function handleCDPCommand(
  parsed: {
    method: string;
    id?: number;
    params?: { requestId?: string; storageId?: { isLocalStorage?: boolean } };
  },
  context: CommandHandlerContext
): boolean {
  // Try each handler in order / 각 핸들러를 순서대로 시도
  return (
    handleGetResponseBody(parsed, context) ||
    handleGetDocument(parsed, context) ||
    handleGetCookies(parsed, context) ||
    handleGetResourceTree(parsed, context) ||
    handleGetStorageKey(parsed, context) ||
    handleDOMStorageEnable(parsed, context) ||
    handleGetDOMStorageItems(parsed, context)
  );
}
