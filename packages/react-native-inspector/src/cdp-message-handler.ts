// Universal CDP message handler system / 범용 CDP 메시지 핸들러 시스템
// Allows any domain to register handlers for CDP commands / 모든 도메인이 CDP 명령에 대한 핸들러를 등록할 수 있음

type CDPMessageHandler = (message: {
  method: string;
  params?: unknown;
  id?: number;
}) => void | Promise<void>;

// Store registered handlers / 등록된 핸들러 저장
// Key format: "Domain.method" (e.g., "MMKVStorage.getMMKVItems") / 키 형식: "Domain.method" (예: "MMKVStorage.getMMKVItems")
const handlers: Map<string, CDPMessageHandler> = new Map();

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

  // Find handler for this method / 이 메서드에 대한 핸들러 찾기
  // Route based on method name / 메서드 이름을 기준으로 라우팅
  const handler = handlers.get(message.method);
  if (!handler) {
    // No handler registered - this is normal for commands we don't handle / 핸들러가 등록되지 않음 - 처리하지 않는 명령의 경우 정상
    console.log(
      `[CDPMessageHandler] No handler registered for ${message.method} / ${message.method}에 대한 핸들러가 등록되지 않음`
    );
    return;
  }

  try {
    // Call handler / 핸들러 호출
    const result = handler(message);
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
    typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : {};
  // Native code calls this with JSON string / 네이티브 코드가 JSON 문자열로 호출
  (globalObj as any).__CDP_MESSAGE_HANDLER__ = handleCDPMessageFromNative;
}

// Initialize global handler on module load / 모듈 로드 시 전역 핸들러 초기화
updateGlobalHandler();
