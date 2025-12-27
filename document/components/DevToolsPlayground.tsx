import React, { useState, useEffect, useRef } from 'react';

/**
 * PostMessage CDP message format / PostMessage CDP 메시지 형식
 */
interface PostMessageCDPMessage {
  type: 'CDP_MESSAGE';
  message: string;
}

/**
 * CDP event file format / CDP 이벤트 파일 형식
 */
interface CDPEventFile {
  version: string;
  exportDate: string;
  clientId: string;
  events: PostMessageCDPMessage[];
  cookies?: Array<{ name: string; value: string; domain: string; path: string }>;
  localStorage?: Array<[string, string]>;
  sessionStorage?: Array<[string, string]>;
  domTree?: {
    documentURL: string;
    baseURL: string;
    html: string;
  };
}

/**
 * Storage items type / Storage 항목 타입
 */
interface StorageItems {
  localStorage: Array<[string, string]>;
  sessionStorage: Array<[string, string]>;
}

/**
 * DOM tree type / DOM 트리 타입
 */
interface DOMTree {
  root: unknown;
}

/**
 * Response body store interface / 응답 본문 저장소 인터페이스
 */
interface ResponseBodyStore {
  store(requestId: string, body: string): void;
  get(requestId: string): string | undefined;
  has(requestId: string): boolean;
  clear(): void;
}

/**
 * Command handler context / 명령 핸들러 컨텍스트
 */
interface CommandHandlerContext {
  file: File;
  cdpMessages: PostMessageCDPMessage[];
  responseBodyStore: ResponseBodyStore;
  targetWindow: Window;
}

/**
 * Get origin for embedded mode / embedded 모드를 위한 origin 가져오기
 */
function getHostOrigin(): string {
  let protocol = location.protocol;
  let host = location.host;
  if (protocol === 'about:' || protocol === 'blob:') {
    try {
      if (window.parent && window.parent !== window) {
        const parentLocation = window.parent.location;
        protocol = parentLocation.protocol;
        host = parentLocation.host;
      }
    } catch {
      // If accessing window.parent.location fails (e.g., cross-origin),
      // fall back to the current window's origin.
      // window.parent.location 접근 실패 시 (예: cross-origin),
      // 현재 창의 origin으로 폴백
    }
  }
  return `${protocol}//${host}`;
}

/**
 * Build DevTools popup URL / DevTools 팝업 URL 구성
 * Same as popup example / 팝업 예제와 동일
 */
function buildDevToolsUrl(): string {
  const baseUrl = new URL(
    '/chrome-remote-devtools/devtools-frontend/devtools_app.html',
    window.location.origin
  );
  const params = baseUrl.searchParams;

  // Use postMessage transport for popup mode / 팝업 모드에서는 postMessage transport 사용
  // No WebSocket URL needed / WebSocket URL 불필요
  params.append('postMessage', 'true');

  // DevTools configuration parameters / DevTools 설정 파라미터
  params.append('experiments', 'true');
  params.append('improvedChromeReloads', 'true');
  params.append('experimental', 'true');

  // Enable panels / 패널 활성화
  params.append('enableConsole', 'true');
  params.append('enableRuntime', 'true');
  params.append('enableNetwork', 'true');
  params.append('enableDebugger', 'true');

  // Embedded mode / embedded 모드
  const hostOrigin = getHostOrigin();
  baseUrl.hash = `?embedded=${encodeURIComponent(hostOrigin)}`;

  return baseUrl.toString();
}

/**
 * Build DevTools replay mode URL / DevTools replay 모드 URL 구성
 */
function buildDevToolsReplayUrl(): string {
  const baseUrl = new URL(
    '/chrome-remote-devtools/devtools-frontend/devtools_app.html',
    window.location.origin
  );
  const params = baseUrl.searchParams;

  // Replay mode / Replay 모드
  params.append('replay', 'true');
  // PostMessage mode is required for popup communication / 팝업 통신을 위해 PostMessage 모드 필요
  params.append('postMessage', 'true');
  // Disable embedded mode in replay to prevent receiving messages from original page / replay에서 embedded 모드 비활성화하여 원본 페이지의 메시지 수신 방지
  // No hash with embedded origin - this prevents the client from connecting / embedded origin이 있는 hash 없음 - 이것은 클라이언트가 연결하지 않도록 함

  // DevTools configuration parameters / DevTools 설정 파라미터
  params.append('experiments', 'true');
  params.append('improvedChromeReloads', 'true');
  params.append('experimental', 'true');

  // Enable panels / 패널 활성화
  params.append('enableConsole', 'true');
  params.append('enableRuntime', 'true');
  params.append('enableNetwork', 'true');
  params.append('enableDebugger', 'true');

  return baseUrl.toString();
}

/**
 * Read file and convert to CDP messages / 파일을 읽어서 CDP 메시지로 변환
 */
async function fileToCDPMessages(file: File): Promise<PostMessageCDPMessage[]> {
  const text = await file.text();
  const data: CDPEventFile = JSON.parse(text);

  if (!data.events || !Array.isArray(data.events)) {
    throw new Error('Invalid file format / 잘못된 파일 형식');
  }

  // Validate that all events are in postMessage format / 모든 이벤트가 postMessage 형식인지 검증
  const validMessages = data.events.filter((event) => {
    return event.type === 'CDP_MESSAGE' && typeof event.message === 'string';
  });

  if (validMessages.length !== data.events.length) {
    console.warn(
      'Some events are not in postMessage format, filtering them out / 일부 이벤트가 postMessage 형식이 아니어서 필터링됨'
    );
  }

  return validMessages;
}

/**
 * Send fake response for command / 명령에 대한 가짜 응답 전송
 */
function sendFakeResponse(targetWindow: Window, commandId: number, result?: unknown): void {
  setTimeout(() => {
    const responseMessage = {
      type: 'CDP_MESSAGE' as const,
      message: JSON.stringify({
        id: commandId,
        result: result || {},
      }),
    };
    targetWindow.postMessage(responseMessage, '*');
  }, 10);
}

/**
 * Create response body store / 응답 본문 저장소 생성
 */
function createResponseBodyStore(): ResponseBodyStore {
  const store = new Map<string, string>();
  return {
    store(requestId: string, body: string) {
      store.set(requestId, body);
    },
    get(requestId: string) {
      return store.get(requestId);
    },
    has(requestId: string) {
      return store.has(requestId);
    },
    clear() {
      store.clear();
    },
  };
}

/**
 * Extract DOM tree from file data / 파일 데이터에서 DOM 트리 추출
 */
async function extractDOMTree(
  file: File,
  cdpMessages: PostMessageCDPMessage[]
): Promise<DOMTree | null> {
  try {
    const text = await file.text();
    const fileData: CDPEventFile = JSON.parse(text);

    if (fileData.domTree?.html) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(fileData.domTree.html, 'text/html');

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
  } catch (error) {
    console.warn('Failed to extract DOM tree from file / 파일에서 DOM 트리 추출 실패:', error);
  }

  // Fallback: Find DOM.setChildNodes event / 폴백: DOM.setChildNodes 이벤트 찾기
  for (const msg of cdpMessages) {
    try {
      const parsed = JSON.parse(msg.message);
      if (parsed.method === 'DOM.setChildNodes' && parsed.params) {
        const { parentId, nodes } = parsed.params;
        if (parentId === 0 || parentId === undefined || parentId === null) {
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
      }
    } catch {
      // Ignore parsing errors / 파싱 오류 무시
    }
  }
  return null;
}

/**
 * Extract localStorage and sessionStorage from file data / 파일 데이터에서 localStorage와 sessionStorage 추출
 */
async function extractDOMStorageItems(
  file: File,
  cdpMessages: PostMessageCDPMessage[]
): Promise<StorageItems> {
  try {
    const text = await file.text();
    const fileData: CDPEventFile = JSON.parse(text);
    return {
      localStorage: fileData.localStorage || [],
      sessionStorage: fileData.sessionStorage || [],
    };
  } catch (error) {
    console.warn(
      'Failed to extract storage items from file / 파일에서 storage 항목 추출 실패:',
      error
    );

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
 */
async function extractCookies(
  file: File
): Promise<Array<{ name: string; value: string; domain: string; path: string }>> {
  try {
    const text = await file.text();
    const fileData: CDPEventFile = JSON.parse(text);
    if (fileData.cookies && Array.isArray(fileData.cookies)) {
      return fileData.cookies;
    }
  } catch (error) {
    console.warn('Failed to extract cookies from file / 파일에서 쿠키 추출 실패:', error);
  }
  return [];
}

/**
 * Send storage items as domStorageItemAdded events / storage 항목을 domStorageItemAdded 이벤트로 전송
 */
function sendStorageItemsAsEvents(storageItems: StorageItems, targetWindow: Window): void {
  const storageKey = window.location.origin;

  // Send localStorage items as domStorageItemAdded events / localStorage 항목을 domStorageItemAdded 이벤트로 전송
  storageItems.localStorage.forEach(([key, value]) => {
    const eventData = {
      method: 'DOMStorage.domStorageItemAdded',
      params: {
        storageId: {
          isLocalStorage: true,
          storageKey,
          securityOrigin: storageKey,
        },
        key,
        newValue: value,
      },
    };
    const eventMessage = {
      type: 'CDP_MESSAGE' as const,
      message: JSON.stringify(eventData),
    };
    targetWindow.postMessage(eventMessage, '*');
  });

  // Send sessionStorage items as domStorageItemAdded events / sessionStorage 항목을 domStorageItemAdded 이벤트로 전송
  storageItems.sessionStorage.forEach(([key, value]) => {
    const eventData = {
      method: 'DOMStorage.domStorageItemAdded',
      params: {
        storageId: {
          isLocalStorage: false,
          storageKey,
          securityOrigin: storageKey,
        },
        key,
        newValue: value,
      },
    };
    const eventMessage = {
      type: 'CDP_MESSAGE' as const,
      message: JSON.stringify(eventData),
    };
    targetWindow.postMessage(eventMessage, '*');
  });
}

// Storage key cache / Storage key 캐시
let cachedStorageKey: string | null = null;

/**
 * Handle Network.getResponseBody command / Network.getResponseBody 명령 처리
 */
function handleGetResponseBody(
  parsed: { method: string; id?: number; params?: { requestId?: string } },
  context: CommandHandlerContext
): boolean {
  if (parsed.method !== 'Network.getResponseBody' || parsed.id === undefined) {
    return false;
  }

  const requestId = parsed.params?.requestId;
  if (requestId) {
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
 */
function handleGetDocument(
  parsed: { method: string; id?: number },
  context: CommandHandlerContext
): boolean {
  if (parsed.method !== 'DOM.getDocument' || parsed.id === undefined) {
    return false;
  }

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
 */
function handleGetCookies(
  parsed: { method: string; id?: number },
  context: CommandHandlerContext
): boolean {
  if (parsed.method !== 'Network.getCookies' || parsed.id === undefined) {
    return false;
  }

  void extractCookies(context.file).then((cookies) => {
    sendFakeResponse(context.targetWindow, parsed.id!, {
      cookies,
    });
  });
  return true;
}

/**
 * Handle Page.getResourceTree command / Page.getResourceTree 명령 처리
 */
function handleGetResourceTree(
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
 */
function handleGetStorageKey(
  parsed: { method: string; id?: number },
  context: CommandHandlerContext
): boolean {
  if (parsed.method !== 'Storage.getStorageKey' || parsed.id === undefined) {
    return false;
  }

  const storageKey = window.location.origin;
  cachedStorageKey = storageKey; // Cache storage key / storage key 캐시
  sendFakeResponse(context.targetWindow, parsed.id, {
    storageKey,
  });
  return true;
}

/**
 * Handle DOMStorage.enable command / DOMStorage.enable 명령 처리
 */
function handleDOMStorageEnable(
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
 */
function handleGetDOMStorageItems(
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

  // If storageId is not provided, wait a bit and use cached/default storageId / storageId가 제공되지 않았으면 잠시 대기 후 캐시된/기본 storageId 사용
  if (!storageId) {
    // Wait for storageId to be set (Storage.getStorageKey or DOMStorage.enable) / storageId가 설정될 때까지 대기 (Storage.getStorageKey 또는 DOMStorage.enable)
    setTimeout(() => {
      // Use cached storageKey or default / 캐시된 storageKey 또는 기본값 사용
      const storageKey = cachedStorageKey || window.location.origin;
      const defaultStorageId = {
        isLocalStorage: true, // Default to localStorage / 기본값은 localStorage
        storageKey,
        securityOrigin: storageKey,
      };

      void extractDOMStorageItems(context.file, context.cdpMessages).then((storageItems) => {
        const entries = defaultStorageId.isLocalStorage
          ? storageItems.localStorage
          : storageItems.sessionStorage;
        sendFakeResponse(context.targetWindow, commandId, {
          entries,
        });
      });
    }, 300); // Wait 300ms for Storage.getStorageKey to be called / Storage.getStorageKey가 호출될 때까지 300ms 대기
    return true;
  }

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

/**
 * Handle Console.enable command / Console.enable 명령 처리
 * Prevents error when DevTools sends Console.enable / DevTools가 Console.enable을 보낼 때 에러 방지
 */
function handleConsoleEnable(
  parsed: { method: string; id?: number },
  context: CommandHandlerContext
): boolean {
  if (parsed.method !== 'Console.enable' || parsed.id === undefined) {
    return false;
  }

  // Just send fake response to prevent error / 에러 방지를 위해 가짜 응답만 전송
  sendFakeResponse(context.targetWindow, parsed.id, {});
  return true;
}

/**
 * Handle all CDP commands / 모든 CDP 명령 처리
 */
function handleCDPCommand(
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
    handleGetDOMStorageItems(parsed, context) ||
    handleConsoleEnable(parsed, context)
  );
}

/**
 * Default initialization commands / 기본 초기화 명령
 */
const DEFAULT_INIT_COMMANDS = [
  { id: 1, method: 'Runtime.enable', params: {} },
  { id: 2, method: 'DOM.enable', params: {} },
  { id: 3, method: 'Network.enable', params: {} },
  { id: 4, method: 'DOMStorage.enable', params: {} },
  { id: 5, method: 'SessionReplay.enable', params: {} },
] as const;

/**
 * Send default initialization commands / 기본 초기화 명령 전송
 */
async function sendDefaultInitCommands(targetWindow: Window): Promise<void> {
  for (const cmd of DEFAULT_INIT_COMMANDS) {
    const commandMessage = {
      type: 'CDP_MESSAGE' as const,
      message: JSON.stringify(cmd),
    };
    targetWindow.postMessage(commandMessage, '*');
    sendFakeResponse(targetWindow, cmd.id);
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

/**
 * Send CDP messages / CDP 메시지 전송
 * Extract and store response bodies before sending / 전송 전에 응답 본문 추출 및 저장
 */
async function sendCDPMessages(
  messages: PostMessageCDPMessage[],
  targetWindow: Window,
  responseBodyStore?: ResponseBodyStore
): Promise<void> {
  if (messages.length === 0) {
    return;
  }

  // Extract and store response bodies from responseReceived events before sending / 전송 전에 responseReceived 이벤트에서 응답 본문 추출 및 저장
  if (responseBodyStore) {
    for (const msg of messages) {
      try {
        const parsed = JSON.parse(msg.message);
        if (parsed.method === 'Network.responseReceived' && parsed.params?.response?.body) {
          const requestId = parsed.params.requestId;
          const body = parsed.params.response.body;
          responseBodyStore.store(requestId, body);
        }
      } catch {
        // Ignore parsing errors / 파싱 오류 무시
      }
    }
  }

  // Separate commands and events / 명령과 이벤트 분리
  const commands: PostMessageCDPMessage[] = [];
  const events: PostMessageCDPMessage[] = [];

  for (const msg of messages) {
    try {
      const parsed = JSON.parse(msg.message);
      if (parsed.id !== undefined) {
        commands.push(msg);
      } else {
        events.push(msg);
      }
    } catch {
      events.push(msg);
    }
  }

  // Send commands first / 먼저 명령 전송
  if (commands.length === 0) {
    await sendDefaultInitCommands(targetWindow);
  } else {
    for (const cmdMsg of commands) {
      try {
        const parsed = JSON.parse(cmdMsg.message);
        targetWindow.postMessage(cmdMsg, '*');
        if (parsed.id !== undefined) {
          sendFakeResponse(targetWindow, parsed.id);
        }
      } catch {
        // Failed to parse command / 명령 파싱 실패
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Send events in batches / 배치로 이벤트 전송
  const batchSize = 100;
  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);
    for (const message of batch) {
      try {
        targetWindow.postMessage(message, '*');
      } catch {
        // Failed to send message / 메시지 전송 실패
      }
    }
    if (i + batchSize < events.length) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
}

/**
 * Load client script dynamically / 동적으로 클라이언트 스크립트 로드
 * Same as popup example / 팝업 예제와 동일
 * Uses built client.js from document build / 문서 빌드의 빌드된 client.js 사용
 */
function loadClientScript(): void {
  // Check if script is already loaded / 스크립트가 이미 로드되었는지 확인
  if (document.querySelector('script[data-chrome-remote-devtools-client]')) {
    return;
  }

  // Use built client.js from document build / 문서 빌드의 빌드된 client.js 사용
  const script = document.createElement('script');
  script.src = '/chrome-remote-devtools/client.js';
  script.setAttribute('data-enable-rrweb', 'true');
  script.setAttribute('data-chrome-remote-devtools-client', 'true');
  // Popup mode uses postMessage (no data-server-url needed) / 팝업 모드는 postMessage 사용 (data-server-url 불필요)
  document.head.appendChild(script);
}

/**
 * DevTools Playground Component / DevTools 플레이그라운드 컴포넌트
 * Opens DevTools in a popup window / 팝업 창에서 DevTools를 엽니다
 */
export function DevToolsPlayground({
  buttonText,
  lang = 'en',
}: {
  buttonText?: string;
  lang?: 'ko' | 'en';
}) {
  // Button texts based on language / 언어에 따른 버튼 텍스트
  const texts = {
    ko: {
      openDevTools: buttonText || 'DevTools 열기',
      testConsole: '콘솔 테스트',
      testNetwork: '네트워크 테스트',
      testLocalStorage: '로컬스토리지 테스트',
      replayFile: '파일 재생',
      exportFile: '파일 다운로드',
      loading: '로딩 중...',
      consoleLog: '콘솔 로그 메시지',
      consoleError: '콘솔 에러 메시지',
      consoleWarn: '콘솔 경고 메시지',
      consoleInfo: '콘솔 정보 메시지',
      networkSuccess: '네트워크 요청 성공',
      networkFailed: '네트워크 요청 실패',
      testData: '테스트 데이터',
      localStorageTest: '로컬스토리지 테스트',
      exportSuccess: '파일 다운로드 성공',
      exportFailed: '파일 다운로드 실패',
      exportNotAvailable:
        '이벤트 내보내기 기능을 사용할 수 없습니다. 클라이언트 스크립트가 로드되었는지 확인하세요.',
      replayLoadFailed: '리플레이 파일 로드 실패',
      popupFailed: '팝업 창 열기 실패',
    },
    en: {
      openDevTools: buttonText || 'Open DevTools',
      testConsole: 'Test Console',
      testNetwork: 'Test Network',
      testLocalStorage: 'Test LocalStorage',
      replayFile: 'Replay File',
      exportFile: 'Export File',
      loading: 'Loading...',
      consoleLog: 'Console log message',
      consoleError: 'Console error message',
      consoleWarn: 'Console warning message',
      consoleInfo: 'Console info message',
      networkSuccess: 'Network request successful',
      networkFailed: 'Network request failed',
      testData: 'Test data',
      localStorageTest: 'LocalStorage test',
      exportSuccess: 'File download successful',
      exportFailed: 'File download failed',
      exportNotAvailable: 'Event export is not available. Make sure the client script is loaded.',
      replayLoadFailed: 'Failed to load replay file',
      popupFailed: 'Failed to open popup window',
    },
  };

  const t = texts[lang];
  const [popupWindow, setPopupWindow] = useState<Window | null>(null);
  const [_replayWindow, setReplayWindow] = useState<Window | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isReplayLoading, setIsReplayLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageHandlerRef = useRef<((event: MessageEvent) => void) | null>(null);
  const interceptorRef = useRef<((event: MessageEvent) => void) | null>(null);
  const cdpMessagesRef = useRef<PostMessageCDPMessage[]>([]);
  const messagesSentRef = useRef(false);

  // Load client script on mount / 마운트 시 클라이언트 스크립트 로드
  useEffect(() => {
    loadClientScript();
  }, []);

  // Cleanup message handler on unmount / 언마운트 시 메시지 핸들러 정리
  useEffect(() => {
    return () => {
      if (messageHandlerRef.current) {
        window.removeEventListener('message', messageHandlerRef.current);
      }
      if (interceptorRef.current) {
        window.removeEventListener('message', interceptorRef.current, true);
      }
    };
  }, []);

  /**
   * Test console messages / 콘솔 메시지 테스트
   */
  const testConsole = () => {
    console.log(t.consoleLog);
    console.error(t.consoleError);
    console.warn(t.consoleWarn);
    console.info(t.consoleInfo);
  };

  /**
   * Test network request / 네트워크 요청 테스트
   */
  const testNetwork = async () => {
    try {
      const response = await fetch('https://api.github.com/repos/octocat/Hello-World');
      const data = await response.json();
      console.log(t.networkSuccess, data);
    } catch (error) {
      console.error(t.networkFailed, error);
    }
  };

  /**
   * Test localStorage / 로컬스토리지 테스트
   * Simply sets localStorage item - the message handler will automatically send it to DevTools / localStorage 항목만 설정 - 메시지 핸들러가 자동으로 DevTools로 전송
   */
  const testLocalStorage = () => {
    if (!popupWindow || popupWindow.closed) {
      console.warn('DevTools is not open / DevTools가 열려있지 않습니다');
      return;
    }

    const testData = {
      timestamp: new Date().toISOString(),
      message: t.testData,
    };
    localStorage.setItem('devtools-test', JSON.stringify(testData));
    const retrieved = localStorage.getItem('devtools-test');
    console.log(t.localStorageTest, retrieved);

    // The message handler will automatically handle DOMStorage.enable and send storage items / 메시지 핸들러가 자동으로 DOMStorage.enable을 처리하고 storage 항목을 전송함
    // When DevTools sends DOMStorage.enable command, the handler will intercept it and send current localStorage / DevTools가 DOMStorage.enable 명령을 보내면 핸들러가 가로채서 현재 localStorage를 전송함
  };

  /**
   * Handle file selection for replay / 리플레이를 위한 파일 선택 처리
   */
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsReplayLoading(true);
    messagesSentRef.current = false;

    try {
      // Convert file to CDP messages / 파일을 CDP 메시지로 변환
      const messages = await fileToCDPMessages(file);
      cdpMessagesRef.current = messages;

      // Mark that we're in replay mode to prevent client from connecting / replay 모드임을 표시하여 클라이언트가 연결하지 않도록 함
      if (typeof window !== 'undefined') {
        (window as any).__CHROME_REMOTE_DEVTOOLS_REPLAY_MODE__ = true;
      }

      // Open DevTools in replay mode / replay 모드로 DevTools 열기
      const replayUrl = buildDevToolsReplayUrl();
      const newWindow = window.open(
        replayUrl,
        'devtools-replay',
        'width=1200,height=800,resizable=yes,scrollbars=yes'
      );

      if (!newWindow) {
        // Clear replay mode flag on error / 에러 시 replay 모드 플래그 제거
        if (typeof window !== 'undefined') {
          (window as any).__CHROME_REMOTE_DEVTOOLS_REPLAY_MODE__ = false;
        }
        throw new Error(t.popupFailed);
      }

      setReplayWindow(newWindow);

      // Clean up previous handler / 이전 핸들러 정리
      if (messageHandlerRef.current) {
        window.removeEventListener('message', messageHandlerRef.current);
      }
      // Clean up previous interceptor / 이전 인터셉터 정리
      if (interceptorRef.current) {
        window.removeEventListener('message', interceptorRef.current, true);
      }

      // Create response body store for replay mode / replay 모드를 위한 응답 본문 저장소 생성
      const responseBodyStore = createResponseBodyStore();

      // Set up message handler / 메시지 핸들러 설정
      const handleMessage = (event: MessageEvent) => {
        // Only handle messages from replay window / replay 창에서 온 메시지만 처리
        if (event.source !== newWindow) {
          return;
        }

        // Handle commands from DevTools (same as Inspector) / DevTools에서 명령 처리 (Inspector와 동일)
        if (event.data?.type === 'CDP_MESSAGE') {
          try {
            const parsed = JSON.parse(event.data.message);
            if (parsed.id === undefined) {
              return;
            }

            // Create handler context / 핸들러 컨텍스트 생성
            const handlerContext: CommandHandlerContext = {
              file,
              cdpMessages: cdpMessagesRef.current,
              responseBodyStore,
              targetWindow: newWindow,
            };

            // Try to handle command / 명령 처리 시도
            if (handleCDPCommand(parsed, handlerContext)) {
              // Command was handled, stop propagation / 명령이 처리되었으므로 전파 중지
              event.stopImmediatePropagation();
              if (event.stopPropagation) {
                event.stopPropagation();
              }
              event.preventDefault();
              return;
            }
          } catch {
            // Ignore parsing errors / 파싱 오류 무시
          }
        }

        // Handle DevTools ready message / DevTools 준비 메시지 처리
        if (event.data?.type === 'DEVTOOLS_READY') {
          if (!messagesSentRef.current && cdpMessagesRef.current.length > 0) {
            // Wait a bit for DevTools to fully initialize / DevTools가 완전히 초기화될 시간 제공
            setTimeout(() => {
              if (!messagesSentRef.current && cdpMessagesRef.current.length > 0 && newWindow) {
                void sendCDPMessages(cdpMessagesRef.current, newWindow, responseBodyStore);
                messagesSentRef.current = true;
                setIsReplayLoading(false);
              }
            }, 1000);
          }
        }
      };

      // Prevent client from connecting to replay window / 클라이언트가 replay 창에 연결하지 않도록 방지
      // Intercept DEVTOOLS_READY messages from replay window before client receives them / 클라이언트가 받기 전에 replay 창에서 온 DEVTOOLS_READY 메시지 가로채기
      const interceptReplayMessages = (event: MessageEvent) => {
        // Only intercept messages from replay window / replay 창에서 온 메시지만 가로채기
        if (event.source !== newWindow) {
          return;
        }

        // If this is DEVTOOLS_READY from replay window, prevent it from reaching the client / replay 창에서 온 DEVTOOLS_READY인 경우 클라이언트에 도달하지 않도록 방지
        if (event.data?.type === 'DEVTOOLS_READY') {
          // Stop propagation to prevent client from receiving this message / 클라이언트가 이 메시지를 받지 않도록 전파 중지
          event.stopImmediatePropagation();
          // Also stop the event from bubbling / 이벤트 버블링도 중지
          if (event.stopPropagation) {
            event.stopPropagation();
          }
          // Prevent default behavior / 기본 동작 방지
          event.preventDefault();
        }
      };

      // Add interceptor before other message handlers / 다른 메시지 핸들러보다 먼저 인터셉터 추가
      // Use capture phase to intercept before client's handler / 클라이언트의 핸들러보다 먼저 가로채기 위해 capture 단계 사용
      interceptorRef.current = interceptReplayMessages;
      window.addEventListener('message', interceptReplayMessages, true);

      messageHandlerRef.current = handleMessage;
      window.addEventListener('message', handleMessage);

      // Cleanup interceptor when window is closed / 창이 닫힐 때 인터셉터 정리
      const checkClosed = setInterval(() => {
        if (newWindow.closed) {
          // Clear replay mode flag / replay 모드 플래그 제거
          if (typeof window !== 'undefined') {
            (window as any).__CHROME_REMOTE_DEVTOOLS_REPLAY_MODE__ = false;
          }
          if (interceptorRef.current) {
            window.removeEventListener('message', interceptorRef.current, true);
            interceptorRef.current = null;
          }
          if (messageHandlerRef.current) {
            window.removeEventListener('message', messageHandlerRef.current);
            messageHandlerRef.current = null;
          }
          clearInterval(checkClosed);
          setReplayWindow(null);
        }
      }, 1000);

      // Fallback: send messages after 5 seconds if DEVTOOLS_READY not received / 폴백: DEVTOOLS_READY를 받지 못한 경우 5초 후 메시지 전송
      setTimeout(() => {
        if (!messagesSentRef.current && cdpMessagesRef.current.length > 0 && newWindow) {
          void sendCDPMessages(cdpMessagesRef.current, newWindow, responseBodyStore);
          messagesSentRef.current = true;
          setIsReplayLoading(false);
        }
      }, 5000);
    } catch (error) {
      // Clear replay mode flag on error / 에러 시 replay 모드 플래그 제거
      if (typeof window !== 'undefined') {
        (window as any).__CHROME_REMOTE_DEVTOOLS_REPLAY_MODE__ = false;
      }
      console.error(t.replayLoadFailed, error);
      setIsReplayLoading(false);
      alert(error instanceof Error ? error.message : t.replayLoadFailed);
    }
  };

  /**
   * Handle open DevTools / DevTools 열기 처리
   */
  const handleOpenDevTools = () => {
    const devToolsUrl = buildDevToolsUrl();

    if (popupWindow && !popupWindow.closed) {
      popupWindow.focus();
    } else {
      const newWindow = window.open(
        devToolsUrl,
        'devtools',
        'width=1200,height=800,resizable=yes,scrollbars=yes'
      );
      if (newWindow) {
        setPopupWindow(newWindow);

        // Set up message handler to ensure stored events are replayed / 저장된 이벤트가 재생되도록 메시지 핸들러 설정
        // Also handle DOMStorage.enable command like Inspector / Inspector처럼 DOMStorage.enable 명령도 처리
        const handleDevToolsMessage = (event: MessageEvent) => {
          // Only handle messages from DevTools window / DevTools 창에서 온 메시지만 처리
          if (event.source !== newWindow) {
            return;
          }

          // Handle commands from DevTools (same as Inspector) / DevTools에서 명령 처리 (Inspector와 동일)
          if (event.data?.type === 'CDP_MESSAGE') {
            try {
              const parsed = JSON.parse(event.data.message);
              if (parsed.id === undefined) {
                return;
              }

              // Handle DOMStorage.enable command (same as Inspector's handleDOMStorageEnable) / DOMStorage.enable 명령 처리 (Inspector의 handleDOMStorageEnable과 동일)
              if (parsed.method === 'DOMStorage.enable') {
                // Send fake response first / 먼저 가짜 응답 전송
                sendFakeResponse(newWindow, parsed.id, {});

                // Wait a bit for storage to be created by StorageKeyManager / StorageKeyManager가 storage를 생성할 시간 대기
                setTimeout(() => {
                  // Extract localStorage items from current page / 현재 페이지에서 localStorage 항목 추출
                  const storageKey = window.location.origin;
                  const localStorageItems: Array<[string, string]> = [];
                  for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key !== null) {
                      const value = localStorage.getItem(key);
                      if (value !== null) {
                        localStorageItems.push([key, value]);
                      }
                    }
                  }

                  // Extract sessionStorage items / sessionStorage 항목 추출
                  const sessionStorageItems: Array<[string, string]> = [];
                  for (let i = 0; i < sessionStorage.length; i++) {
                    const key = sessionStorage.key(i);
                    if (key !== null) {
                      const value = sessionStorage.getItem(key);
                      if (value !== null) {
                        sessionStorageItems.push([key, value]);
                      }
                    }
                  }

                  // Send storage items as events (same as Inspector's sendStorageItemsAsEvents) / storage 항목을 이벤트로 전송 (Inspector의 sendStorageItemsAsEvents와 동일)
                  const storageItems = {
                    localStorage: localStorageItems,
                    sessionStorage: sessionStorageItems,
                  };

                  // Send localStorage items as domStorageItemAdded events / localStorage 항목을 domStorageItemAdded 이벤트로 전송
                  storageItems.localStorage.forEach(([key, value]) => {
                    const eventData = {
                      method: 'DOMStorage.domStorageItemAdded',
                      params: {
                        storageId: {
                          isLocalStorage: true,
                          storageKey,
                          securityOrigin: storageKey,
                        },
                        key,
                        newValue: value,
                      },
                    };
                    const eventMessage = {
                      type: 'CDP_MESSAGE' as const,
                      message: JSON.stringify(eventData),
                    };
                    newWindow.postMessage(eventMessage, '*');
                  });

                  // Send sessionStorage items as domStorageItemAdded events / sessionStorage 항목을 domStorageItemAdded 이벤트로 전송
                  storageItems.sessionStorage.forEach(([key, value]) => {
                    const eventData = {
                      method: 'DOMStorage.domStorageItemAdded',
                      params: {
                        storageId: {
                          isLocalStorage: false,
                          storageKey,
                          securityOrigin: storageKey,
                        },
                        key,
                        newValue: value,
                      },
                    };
                    const eventMessage = {
                      type: 'CDP_MESSAGE' as const,
                      message: JSON.stringify(eventData),
                    };
                    newWindow.postMessage(eventMessage, '*');
                  });
                }, 200); // Wait 200ms for storage to be created (same as Inspector) / storage가 생성될 시간을 위해 200ms 대기 (Inspector와 동일)

                // Stop event propagation to prevent client script from handling it / 클라이언트 스크립트가 처리하지 않도록 이벤트 전파 중지
                event.stopImmediatePropagation();
                if (event.stopPropagation) {
                  event.stopPropagation();
                }
                event.preventDefault();
                return;
              }
            } catch {
              // Ignore parsing errors / 파싱 오류 무시
            }
          }

          // Handle DevTools ready message / DevTools 준비 메시지 처리
          // The client script will automatically replay stored events when it receives DEVTOOLS_READY / 클라이언트 스크립트는 DEVTOOLS_READY를 받으면 자동으로 저장된 이벤트를 재생함
          if (event.data?.type === 'DEVTOOLS_READY') {
            // Client script should handle this automatically, but we can also trigger it manually if needed / 클라이언트 스크립트가 자동으로 처리해야 하지만 필요시 수동으로 트리거할 수도 있음
            // The PostMessageHandler in the client will receive this and call setDevToolsWindow / 클라이언트의 PostMessageHandler가 이를 받아서 setDevToolsWindow를 호출함
            // This will trigger sendStoredEventsFromIndexedDB() which replays console, network, etc. / 이것은 sendStoredEventsFromIndexedDB()를 트리거하여 console, network 등을 재생함
            // SessionReplay events are handled separately by SessionReplay domain / SessionReplay 이벤트는 SessionReplay 도메인에서 별도로 처리됨
          }
        };

        // Listen for messages from DevTools / DevTools에서 온 메시지 수신
        window.addEventListener('message', handleDevToolsMessage);

        // Cleanup when window is closed / 창이 닫힐 때 정리
        const checkClosed = setInterval(() => {
          if (newWindow.closed) {
            window.removeEventListener('message', handleDevToolsMessage);
            clearInterval(checkClosed);
            setPopupWindow(null);
          }
        }, 1000);
      }
    }
  };

  /**
   * Handle open replay file / 리플레이 파일 열기 처리
   */
  const handleOpenReplayFile = () => {
    fileInputRef.current?.click();
  };

  /**
   * Handle export events to file / 이벤트를 파일로 내보내기 처리
   */
  const handleExportFile = async () => {
    try {
      if (typeof window !== 'undefined' && (window as any).chromeRemoteDevTools) {
        await (window as any).chromeRemoteDevTools.exportEvents();
        console.log(t.exportSuccess);
      } else {
        alert(t.exportNotAvailable);
      }
    } catch (error) {
      console.error(t.exportFailed, error);
      alert(t.exportFailed);
    }
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
        marginTop: '16px',
      }}
    >
      <button
        onClick={handleOpenDevTools}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          padding: '12px 24px',
          background: isHovered ? '#2563eb' : '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: 500,
          transition: 'background-color 0.2s',
        }}
      >
        {t.openDevTools}
      </button>

      <button
        onClick={testConsole}
        style={{
          padding: '12px 24px',
          background: '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: 500,
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#059669';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#10b981';
        }}
      >
        {t.testConsole}
      </button>

      <button
        onClick={testNetwork}
        style={{
          padding: '12px 24px',
          background: '#8b5cf6',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: 500,
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#7c3aed';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#8b5cf6';
        }}
      >
        {t.testNetwork}
      </button>

      <button
        onClick={testLocalStorage}
        style={{
          padding: '12px 24px',
          background: '#f59e0b',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: 500,
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#d97706';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#f59e0b';
        }}
      >
        {t.testLocalStorage}
      </button>

      <input
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        ref={fileInputRef}
        style={{ display: 'none' }}
      />

      <button
        onClick={handleOpenReplayFile}
        disabled={isReplayLoading}
        style={{
          padding: '12px 24px',
          background: isReplayLoading ? '#6b7280' : '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: isReplayLoading ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          fontWeight: 500,
          transition: 'background-color 0.2s',
          opacity: isReplayLoading ? 0.6 : 1,
        }}
        onMouseEnter={(e) => {
          if (!isReplayLoading) {
            e.currentTarget.style.background = '#dc2626';
          }
        }}
        onMouseLeave={(e) => {
          if (!isReplayLoading) {
            e.currentTarget.style.background = '#ef4444';
          }
        }}
      >
        {isReplayLoading ? t.loading : t.replayFile}
      </button>

      <button
        onClick={handleExportFile}
        style={{
          padding: '12px 24px',
          background: '#06b6d4',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: 500,
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#0891b2';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#06b6d4';
        }}
      >
        {t.exportFile}
      </button>
    </div>
  );
}
