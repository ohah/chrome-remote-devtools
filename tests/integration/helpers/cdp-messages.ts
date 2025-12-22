// CDP message helpers / CDP 메시지 헬퍼
let messageId = 1;

export function createCDPMessage(
  method: string,
  params?: unknown
): {
  id: number;
  method: string;
  params?: unknown;
} {
  return {
    id: messageId++,
    method,
    params,
  };
}

export function createRuntimeEvaluateMessage(
  expression: string,
  generatePreview?: boolean
): {
  id: number;
  method: string;
  params: { expression: string; generatePreview?: boolean };
} {
  return createCDPMessage('Runtime.evaluate', {
    expression,
    generatePreview,
  }) as {
    id: number;
    method: string;
    params: { expression: string; generatePreview?: boolean };
  };
}

export function createRuntimeEnableMessage(): {
  id: number;
  method: string;
} {
  return createCDPMessage('Runtime.enable');
}

export function createPageEnableMessage(): {
  id: number;
  method: string;
} {
  return createCDPMessage('Page.enable');
}

export function createPageGetResourceTreeMessage(): {
  id: number;
  method: string;
} {
  return createCDPMessage('Page.getResourceTree');
}

export function createDOMEnableMessage(): {
  id: number;
  method: string;
} {
  return createCDPMessage('DOM.enable');
}

export function createDOMGetDocumentMessage(): {
  id: number;
  method: string;
} {
  return createCDPMessage('DOM.getDocument');
}

export function createNetworkEnableMessage(): {
  id: number;
  method: string;
} {
  return createCDPMessage('Network.enable');
}

export function createConsoleEnableMessage(): {
  id: number;
  method: string;
} {
  return createCDPMessage('Console.enable');
}

export function createStorageGetStorageKeyMessage(frameId?: string): {
  id: number;
  method: string;
  params?: { frameId?: string };
} {
  return createCDPMessage('Storage.getStorageKey', frameId ? { frameId } : undefined) as {
    id: number;
    method: string;
    params?: { frameId?: string };
  };
}

export function createDOMStorageEnableMessage(): {
  id: number;
  method: string;
} {
  return createCDPMessage('DOMStorage.enable');
}

export function createDOMStorageGetItemsMessage(storageId: {
  isLocalStorage: boolean;
  storageKey?: string;
  securityOrigin?: string;
}): {
  id: number;
  method: string;
  params: { storageId: typeof storageId };
} {
  return createCDPMessage('DOMStorage.getDOMStorageItems', { storageId }) as {
    id: number;
    method: string;
    params: { storageId: typeof storageId };
  };
}

export function createDOMStorageSetItemMessage(
  storageId: {
    isLocalStorage: boolean;
    storageKey?: string;
    securityOrigin?: string;
  },
  key: string,
  value: string
): {
  id: number;
  method: string;
  params: { storageId: typeof storageId; key: string; value: string };
} {
  return createCDPMessage('DOMStorage.setDOMStorageItem', {
    storageId,
    key,
    value,
  }) as {
    id: number;
    method: string;
    params: { storageId: typeof storageId; key: string; value: string };
  };
}

export function createDOMStorageRemoveItemMessage(
  storageId: {
    isLocalStorage: boolean;
    storageKey?: string;
    securityOrigin?: string;
  },
  key: string
): {
  id: number;
  method: string;
  params: { storageId: typeof storageId; key: string };
} {
  return createCDPMessage('DOMStorage.removeDOMStorageItem', {
    storageId,
    key,
  }) as {
    id: number;
    method: string;
    params: { storageId: typeof storageId; key: string };
  };
}

export function createDOMStorageClearMessage(storageId: {
  isLocalStorage: boolean;
  storageKey?: string;
  securityOrigin?: string;
}): {
  id: number;
  method: string;
  params: { storageId: typeof storageId };
} {
  return createCDPMessage('DOMStorage.clear', { storageId }) as {
    id: number;
    method: string;
    params: { storageId: typeof storageId };
  };
}

export function isCDPResponse(message: unknown): message is {
  id: number;
  result?: unknown;
  error?: unknown;
} {
  return (
    typeof message === 'object' &&
    message !== null &&
    'id' in message &&
    typeof (message as { id: unknown }).id === 'number'
  );
}

export function isCDPEvent(message: unknown): message is {
  method: string;
  params?: unknown;
} {
  return (
    typeof message === 'object' &&
    message !== null &&
    'method' in message &&
    !('id' in message) &&
    typeof (message as { method: unknown }).method === 'string'
  );
}

// Wait for specific CDP response by message ID / 특정 메시지 ID의 CDP 응답 대기
// Skips events and only returns responses with matching ID / 이벤트를 건너뛰고 일치하는 ID의 응답만 반환
export async function waitForCDPResponse(
  receive: () => Promise<unknown>,
  expectedId: number,
  timeout: number = 5000
): Promise<{ id: number; result?: unknown; error?: unknown } | null> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const message = await receive();

    // If it's a response with matching ID, return it / 일치하는 ID의 응답이면 반환
    if (isCDPResponse(message) && message.id === expectedId) {
      return message;
    }
    // If it's an event or different response, continue waiting / 이벤트나 다른 응답이면 계속 대기
  }

  // If timeout, return null / 타임아웃 시 null 반환
  return null;
}

// Wait for specific CDP event by method name / 특정 메서드 이름의 CDP 이벤트 대기
export async function waitForCDPEvent(
  receive: () => Promise<unknown>,
  expectedMethod: string,
  timeout: number = 5000
): Promise<{ method: string; params?: unknown } | null> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const message = await receive();

    // If it's an event with matching method, return it / 일치하는 메서드의 이벤트이면 반환
    if (isCDPEvent(message) && message.method === expectedMethod) {
      return message;
    }
    // If it's a response or different event, continue waiting / 응답이나 다른 이벤트이면 계속 대기
  }

  // If timeout, return null / 타임아웃 시 null 반환
  return null;
}

// Wait for both CDP response and event simultaneously / CDP 응답과 이벤트를 동시에 대기
export async function waitForCDPResponseAndEvent(
  receive: () => Promise<unknown>,
  expectedResponseId: number,
  expectedEventMethod: string,
  timeout: number = 5000,
  eventFilter?: (event: { method: string; params?: unknown }) => boolean
): Promise<{
  response: { id: number; result?: unknown; error?: unknown } | null;
  event: { method: string; params?: unknown } | null;
}> {
  const startTime = Date.now();
  let response: { id: number; result?: unknown; error?: unknown } | null = null;
  let event: { method: string; params?: unknown } | null = null;

  while (Date.now() - startTime < timeout && (!response || !event)) {
    const message = await receive();

    // Check if it's the expected response / 예상한 응답인지 확인
    if (!response && isCDPResponse(message) && message.id === expectedResponseId) {
      response = message;
    }

    // Check if it's the expected event / 예상한 이벤트인지 확인
    if (!event && isCDPEvent(message) && message.method === expectedEventMethod) {
      // Apply filter if provided / 필터가 제공되면 적용
      if (!eventFilter || eventFilter(message)) {
        event = message;
      }
    }
  }

  return { response, event };
}
