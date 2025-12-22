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
