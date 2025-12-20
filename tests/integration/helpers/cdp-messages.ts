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
