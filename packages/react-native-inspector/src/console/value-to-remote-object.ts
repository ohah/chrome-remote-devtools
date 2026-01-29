// Convert JS value to CDP RemoteObject / JS 값을 CDP RemoteObject로 변환
// Used for Runtime.consoleAPICalled args / Runtime.consoleAPICalled args에 사용

/**
 * CDP RemoteObject shape for console args / 콘솔 args용 CDP RemoteObject 형태
 */
export interface RemoteObject {
  type: string;
  subtype?: string;
  value?: unknown;
  description?: string;
  objectId?: string;
}

/**
 * Convert a single JS value to CDP RemoteObject / 단일 JS 값을 CDP RemoteObject로 변환
 * @param value Any JS value / 임의의 JS 값
 * @returns CDP RemoteObject / CDP RemoteObject
 */
export function valueToRemoteObject(value: unknown): RemoteObject {
  if (value === null) {
    return { type: 'object', subtype: 'null', value: null };
  }
  if (value === undefined) {
    return { type: 'undefined' };
  }
  const t = typeof value;
  if (t === 'boolean') {
    return { type: 'boolean', value: value as boolean };
  }
  if (t === 'number') {
    return { type: 'number', value: value as number };
  }
  if (t === 'string') {
    return { type: 'string', value: value as string };
  }
  if (t === 'symbol') {
    return { type: 'symbol', description: String(value) };
  }
  if (t === 'function') {
    return { type: 'function', description: `function ${(value as Function).name || ''}()` };
  }
  if (t === 'object') {
    const obj = value as object;
    if (Array.isArray(obj)) {
      return {
        type: 'object',
        subtype: 'array',
        description: 'Array',
        value: undefined,
      };
    }
    if (obj instanceof Error) {
      return {
        type: 'object',
        subtype: 'error',
        description: obj.message || 'Error',
      };
    }
    try {
      const desc = JSON.stringify(obj);
      return {
        type: 'object',
        description: desc.length > 100 ? desc.slice(0, 100) + '...' : desc,
      };
    } catch {
      return { type: 'object', description: 'Object' };
    }
  }
  return { type: 'string', value: String(value) };
}
