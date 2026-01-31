// Universal CDP message handler system / 범용 CDP 메시지 핸들러 시스템
// Allows any domain to register handlers for CDP commands / 모든 도메인이 CDP 명령에 대한 핸들러를 등록할 수 있음

import { sendCDPResponse } from './cdp/domain/base';
import { sendExecutionContextCreated } from './cdp/domain/runtime';
import { getObjectProperties } from './cdp/common/get-object-properties';
import { releaseObject } from './cdp/common/object-store';
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

  // Runtime.getProperties: DevTools calls when user expands object in Console (same as web client) / 콘솔에서 객체 펼칠 때 DevTools가 호출 (웹과 동일)
  if (message.method === 'Runtime.getProperties' && typeof message.id === 'number') {
    const params = message.params as { objectId?: string } | undefined;
    const objectId = params?.objectId;
    if (objectId && getServerInfo()) {
      const result = getObjectProperties(objectId);
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
