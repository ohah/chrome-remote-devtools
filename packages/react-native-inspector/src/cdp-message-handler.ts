// Universal CDP message handler system / 범용 CDP 메시지 핸들러 시스템
// Allows any domain to register handlers for CDP commands / 모든 도메인이 CDP 명령에 대한 핸들러를 등록할 수 있음

import { sendCDPResponse } from './cdp/domain/base';
import { handleRuntimeAddBinding, handleRuntimeEvaluate } from './cdp/domain/runtime-evaluate';
import { sendExecutionContextCreated } from './cdp/domain/runtime';
import { getObjectProperties } from './cdp/common/get-object-properties';
import { getObject, releaseObject } from './cdp/common/object-store';
import { getServerInfo } from './server-info';

type CDPMessageHandler = (message: {
  method: string;
  params?: unknown;
  id?: number;
}) => void | Promise<void>;

/** Minimal frame tree for React Native (no real page); DevTools uses this to fire CachedResourcesLoaded and init Console / React Native용 최소 프레임 트리, DevTools가 CachedResourcesLoaded 발생·Console 초기화에 사용 */
const PAGE_GET_RESOURCE_TREE_RESULT = {
  frameTree: {
    frame: {
      id: '1',
      mimeType: 'application/javascript',
      securityOrigin: 'react-native://',
      url: 'react-native://',
    },
    resources: [] as unknown[],
  },
};

/**
 * Cached sourcemap from Metro: sources + sourcesContent so Sources tab can show original files / Metro에서 가져온 소스맵 캐시: Sources 탭에서 원본 파일 표시용
 */
let sourceMapCache: {
  sources: string[];
  sourcesContent: (string | null)[];
} | null = null;

/**
 * Normalize source URL for matching (strip file://, collapse slashes) / 소스 URL 정규화 (file:// 제거, 슬래시 정리)
 */
function normalizeSourceUrl(url: string): string {
  let s = url.replace(/^file:\/\//, '').replace(/\/+/g, '/');
  if (s.startsWith('/') === false && !/^[a-z]+:\/\//i.test(url)) s = '/' + s;
  return s;
}

/**
 * Set sourcemap cache (call when Metro source map is available; e.g. from bundle load) / 소스맵 캐시 설정 (Metro 소스맵 사용 가능 시 호출, 예: 번들 로드 시)
 */
export function setSourceMapCache(sources: string[], sourcesContent: (string | null)[]): void {
  sourceMapCache = { sources, sourcesContent };
}

/**
 * Get source content by URL from cached sourcemap (for Page.getResourceContent) / 캐시된 소스맵에서 URL로 소스 내용 반환
 */
function getSourceContentByUrl(url: string): string | null {
  if (!sourceMapCache) return null;
  const normalized = normalizeSourceUrl(url);
  const idx = sourceMapCache.sources.findIndex(
    (s) => s === url || normalizeSourceUrl(s) === normalized
  );
  if (idx < 0) return null;
  return sourceMapCache.sourcesContent[idx] ?? null;
}

/** Base64 alphabet for inline encoding (RN may not have btoa) / 인라인 base64 인코딩용 (RN에 btoa 없을 수 있음) */
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Encode UTF-8 string to base64 without btoa/Buffer (works in React Native) / btoa/Buffer 없이 UTF-8 문자열을 base64로 인코딩 (RN에서 동작)
 */
function base64EncodeUtf8(str: string): string {
  if (typeof btoa !== 'undefined') {
    try {
      return btoa(unescape(encodeURIComponent(str)));
    } catch {
      // fall through to manual encode
    }
  }
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c < 0x80) bytes.push(c);
    else if (c < 0x800) {
      bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else if (c < 0xd800 || c >= 0xe000) {
      bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    } else {
      const low = str.charCodeAt(++i);
      const u = ((c & 0x3ff) << 10) | (low & 0x3ff);
      bytes.push(
        0xf0 | (u >> 18),
        0x80 | ((u >> 12) & 0x3f),
        0x80 | ((u >> 6) & 0x3f),
        0x80 | (u & 0x3f)
      );
    }
  }
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0;
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    out += BASE64_CHARS[a >> 2];
    out += BASE64_CHARS[((a & 3) << 4) | ((b ?? 0) >> 4)];
    out += b === undefined ? '=' : BASE64_CHARS[((b & 15) << 2) | ((c ?? 0) >> 6)];
    out += c === undefined ? '=' : BASE64_CHARS[c & 63];
  }
  return out;
}

/**
 * Map CDP CallArgument[] to JS values (value / objectId lookup / unserializableValue) / CDP CallArgument[]를 JS 값으로 변환
 */
function callArgumentsToValues(
  args: Array<{ value?: unknown; objectId?: string; unserializableValue?: string }> | undefined
): unknown[] {
  if (!args || args.length === 0) return [];
  return args.map((arg) => {
    if (arg.value !== undefined) return arg.value;
    if (arg.objectId !== undefined) return getObject(arg.objectId);
    if (arg.unserializableValue !== undefined) {
      switch (arg.unserializableValue) {
        case 'undefined':
          return undefined;
        case 'NaN':
          return NaN;
        case 'Infinity':
          return Infinity;
        case '-Infinity':
          return -Infinity;
        default:
          return undefined;
      }
    }
    return undefined;
  });
}

/**
 * Handle Runtime.callFunctionOn: run function on stored object (e.g. toStringForClipboard for Copy object), send CDP result / Runtime.callFunctionOn 처리: 저장된 객체에 함수 실행 후 CDP 결과 전송
 */
function handleRuntimeCallFunctionOn(message: {
  id: number;
  params?: {
    objectId?: string;
    functionDeclaration?: string;
    arguments?: Array<{ value?: unknown; objectId?: string; unserializableValue?: string }>;
    returnByValue?: boolean;
  };
}): void {
  const id = typeof message.id === 'number' ? message.id : Number(message.id);
  if (!Number.isFinite(id)) return;
  const params = message.params ?? {};
  const { functionDeclaration, returnByValue } = params;
  const objectId = params.objectId != null ? String(params.objectId) : undefined;

  if (!objectId || !functionDeclaration) {
    sendCDPResponse(id, {
      exceptionDetails: {
        text: 'Runtime.callFunctionOn requires objectId and functionDeclaration',
      },
    });
    return;
  }

  const obj = getObject(objectId);
  if (obj === undefined) {
    console.warn(
      `[ChromeRemoteDevTools] Runtime.callFunctionOn: objectId "${objectId}" not found in object store (Copy object may fail) / objectId가 객체 저장소에 없음`
    );
    sendCDPResponse(id, {
      exceptionDetails: { text: `Runtime.callFunctionOn: objectId ${objectId} not found` },
    });
    return;
  }

  try {
    // oxlint-disable-next-line no-eval -- intentional: run CDP functionDeclaration in app context (Copy object) / CDP functionDeclaration 앱 컨텍스트에서 실행 (Copy object)
    const fn = eval(`(${functionDeclaration})`) as (this: unknown, ...args: unknown[]) => unknown;
    const args = callArgumentsToValues(params.arguments);
    const returnValue = fn.apply(obj, args);

    if (returnByValue) {
      if (returnValue === undefined) {
        sendCDPResponse(id, { result: { type: 'undefined' } });
      } else if (typeof returnValue === 'string') {
        console.log(
          '[ChromeRemoteDevTools] Sending Runtime.callFunctionOn response (Copy object): id=',
          id,
          ', valueLength=',
          returnValue.length
        );
        sendCDPResponse(id, { result: { type: 'string', value: returnValue } });
      } else if (typeof returnValue === 'number') {
        sendCDPResponse(id, { result: { type: 'number', value: returnValue } });
      } else if (typeof returnValue === 'boolean') {
        sendCDPResponse(id, { result: { type: 'boolean', value: returnValue } });
      } else {
        sendCDPResponse(id, { result: { type: 'object', value: returnValue } });
      }
    } else {
      sendCDPResponse(id, { result: { type: 'object', value: returnValue } });
    }
  } catch (e) {
    const text = e instanceof Error ? e.message : String(e);
    sendCDPResponse(id, { exceptionDetails: { text } });
  }
}

// Store registered handlers / 등록된 핸들러 저장
// Key format: "Domain.method" (e.g., "MMKVStorage.getMMKVItems") / 키 형식: "Domain.method" (예: "MMKVStorage.getMMKVItems")
const handlers: Map<string, CDPMessageHandler> = new Map();

/**
 * No-op; kept for API compatibility. executionContextCreated is sent on every Runtime.enable. / API 호환용 no-op. Runtime.enable마다 executionContextCreated 전송함.
 */
export function resetExecutionContextSentForReconnect(): void {}

/**
 * Register CDP message handler / CDP 메시지 핸들러 등록
 * @param method CDP method name (e.g., "MMKVStorage.getMMKVItems") / CDP 메서드 이름 (예: "MMKVStorage.getMMKVItems")
 * @param handler Handler function / 핸들러 함수
 * @returns Unregister function / 등록 해제 함수
 */
export function registerCDPMessageHandler(method: string, handler: CDPMessageHandler): () => void {
  handlers.set(method, handler);
  console.log(
    `[CDPMessageHandler] Registered handler for ${method} / ${method}에 대한 핸들러 등록됨`
  );

  // Update global handler / 전역 핸들러 업데이트
  updateGlobalHandler();

  // Return unregister function / 등록 해제 함수 반환
  return () => {
    handlers.delete(method);
    console.log(
      `[CDPMessageHandler] Unregistered handler for ${method} / ${method}에 대한 핸들러 등록 해제됨`
    );
    updateGlobalHandler();
  };
}

/**
 * Handle CDP message from native / 네이티브로부터 CDP 메시지 처리
 * This is called by native code when WebSocket message is received / WebSocket 메시지를 받을 때 네이티브 코드에서 호출됨
 * Routes to appropriate handler based on method name / 메서드 이름에 따라 적절한 핸들러로 라우팅
 * @param message CDP message / CDP 메시지
 */
export function handleCDPMessage(message: {
  method?: string;
  params?: unknown;
  id?: number;
}): void {
  if (!message.method) {
    console.warn('[CDPMessageHandler] Message has no method field / 메시지에 method 필드 없음');
    return;
  }

  // When DevTools sends Runtime.enable (DevTools connected to this client), send Runtime.executionContextCreated immediately, same as web client / DevTools가 Runtime.enable 보낼 때마다 executionContextCreated 즉시 전송 (웹 클라이언트와 동일)
  if (message.method === 'Runtime.enable') {
    sendExecutionContextCreated();
  }

  // Page.getResourceTree: DevTools sends this once when ResourceTreeModel is created; responding lets CachedResourcesLoaded fire so ConsoleModel inits without 2s fallback / ResourceTreeModel 생성 시 DevTools가 한 번 보냄, 응답 시 CachedResourcesLoaded 발생해 ConsoleModel이 2초 폴백 없이 초기화됨
  if (message.method === 'Page.getResourceTree' && typeof message.id === 'number') {
    if (getServerInfo()) {
      sendCDPResponse(message.id, PAGE_GET_RESOURCE_TREE_RESULT);
    }
    return;
  }

  // Page.getResourceContent: DevTools requests source content by URL; respond from cached sourcemap (base64) when available / DevTools가 URL로 소스 내용 요청; 캐시된 소스맵에서 base64로 응답
  if (message.method === 'Page.getResourceContent' && typeof message.id === 'number') {
    const params = message.params as { url?: string } | undefined;
    const url = params?.url ?? '';
    if (getServerInfo()) {
      const content = getSourceContentByUrl(url);
      if (content != null) {
        sendCDPResponse(message.id, {
          content: base64EncodeUtf8(content),
          base64Encoded: true,
        });
      } else {
        sendCDPResponse(message.id, { content: '', base64Encoded: false });
      }
    }
    return;
  }

  // Runtime.getProperties: DevTools calls when user expands object in Console (same as web client) / 콘솔에서 객체 펼칠 때 DevTools가 호출 (웹과 동일)
  if (message.method === 'Runtime.getProperties' && typeof message.id === 'number') {
    const params = message.params as { objectId?: string } | undefined;
    const objectId = params?.objectId;
    if (getServerInfo()) {
      const result = objectId ? getObjectProperties(objectId) : [];
      sendCDPResponse(message.id, { result });
    }
    return;
  }

  // Runtime.releaseObject: DevTools calls when object is no longer needed (same as web client) / 객체 해제 시 DevTools가 호출 (웹과 동일)
  if (message.method === 'Runtime.releaseObject' && typeof message.id === 'number') {
    const params = message.params as { objectId?: string } | undefined;
    const objectId = params?.objectId;
    if (objectId) {
      releaseObject(objectId);
    }
    if (getServerInfo()) {
      sendCDPResponse(message.id, {});
    }
    return;
  }

  // Runtime.evaluate: run expression in app JS context for React DevTools (Fusebox) / React DevTools(Fusebox)용 앱 JS 컨텍스트에서 표현식 실행
  if (message.method === 'Runtime.evaluate' && typeof message.id === 'number') {
    if (getServerInfo()) {
      handleRuntimeEvaluate(
        message as { id: number; params?: { expression?: string; returnByValue?: boolean } }
      );
    }
    return;
  }

  // Runtime.addBinding: register binding so app can send Runtime.bindingCalled (React DevTools Fusebox) / 앱이 bindingCalled 전송할 수 있도록 바인딩 등록
  if (message.method === 'Runtime.addBinding' && typeof message.id === 'number') {
    if (getServerInfo()) {
      handleRuntimeAddBinding(message as { id: number; params?: { name?: string } });
    }
    return;
  }

  // Runtime.callFunctionOn: run function on object (e.g. toStringForClipboard for Copy object) / 객체에 함수 실행 (예: Copy object용 toStringForClipboard)
  if (
    message.method === 'Runtime.callFunctionOn' &&
    message.id !== undefined &&
    message.id !== null
  ) {
    const id = typeof message.id === 'number' ? message.id : Number(message.id);
    if (Number.isFinite(id) && getServerInfo()) {
      handleRuntimeCallFunctionOn(
        message as {
          id: number;
          params?: {
            objectId?: string;
            functionDeclaration?: string;
            arguments?: Array<{ value?: unknown; objectId?: string; unserializableValue?: string }>;
            returnByValue?: boolean;
          };
        }
      );
    }
    return;
  }

  // Find handler for this method / 이 메서드에 대한 핸들러 찾기
  // Route based on method name / 메서드 이름을 기준으로 라우팅
  const handler = handlers.get(message.method);
  if (!handler) {
    // No handler registered - normal for DevTools commands we don't implement (e.g. Inspector.enable, Target.setAutoAttach). Do not log to avoid flooding console. / 핸들러 없음 - 구현하지 않는 DevTools 명령(Inspector.enable, Target.setAutoAttach 등)은 정상. 콘솔 플러딩 방지를 위해 로그하지 않음
    return;
  }

  try {
    // Call handler / 핸들러 호출 (method already checked above / 위에서 method 검사됨)
    const result = handler(message as { method: string; params?: unknown; id?: number });
    // Handle async handlers / 비동기 핸들러 처리
    if (result && typeof result.then === 'function') {
      result.catch((error: unknown) => {
        console.error(`[CDPMessageHandler] Error in handler for ${message.method}:`, error);
      });
    }
  } catch (error) {
    console.error(`[CDPMessageHandler] Error in handler for ${message.method}:`, error);
  }
}

/**
 * Handle CDP message from native as JSON string / 네이티브로부터 JSON 문자열로 CDP 메시지 처리
 * This is called by native code with JSON string / 네이티브 코드에서 JSON 문자열로 호출됨
 * @param messageJson CDP message as JSON string / JSON 문자열로 된 CDP 메시지
 */
function handleCDPMessageFromNative(messageJson: string): void {
  try {
    const message = JSON.parse(messageJson);
    handleCDPMessage(message);
  } catch (error) {
    console.error('[CDPMessageHandler] Failed to parse message from native:', error);
  }
}

/**
 * Update global handler function / 전역 핸들러 함수 업데이트
 * This allows native code to call a single function / 네이티브 코드가 단일 함수를 호출할 수 있게 함
 */
function updateGlobalHandler(): void {
  const globalObj =
    typeof globalThis !== 'undefined' ? globalThis : typeof global !== 'undefined' ? global : {};
  // Native code calls this with JSON string / 네이티브 코드가 JSON 문자열로 호출
  (globalObj as Record<string, unknown>).__CDP_MESSAGE_HANDLER__ = handleCDPMessageFromNative;
}

// Initialize global handler on module load / 모듈 로드 시 전역 핸들러 초기화
updateGlobalHandler();
