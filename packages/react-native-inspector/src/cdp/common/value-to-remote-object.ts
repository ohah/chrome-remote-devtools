// Convert JS value to CDP RemoteObject / JS 값을 CDP RemoteObject로 변환
// Used for Runtime.consoleAPICalled args (aligned with web client: objectId + preview for expandable display) / Runtime.consoleAPICalled args에 사용 (웹과 동일: objectId + preview로 펼쳐 보기)

import { getOrCreateObjectId } from './object-store';

/**
 * CDP PropertyPreview shape (for ObjectPreview.properties) / ObjectPreview.properties용 CDP PropertyPreview 형태
 */
export interface PropertyPreview {
  name: string;
  type:
    | 'object'
    | 'function'
    | 'undefined'
    | 'string'
    | 'number'
    | 'boolean'
    | 'symbol'
    | 'accessor'
    | 'bigint';
  value?: string;
  subtype?: string;
  valuePreview?: ObjectPreview;
}

/**
 * CDP ObjectPreview shape (abbreviated object for console; DevTools shows this like web) / 콘솔용 축약 객체, DevTools가 웹처럼 표시
 */
export interface ObjectPreview {
  type: string;
  subtype?: string;
  description?: string;
  overflow: boolean;
  properties: PropertyPreview[];
}

/**
 * CDP RemoteObject shape for console args / 콘솔 args용 CDP RemoteObject 형태
 */
export interface RemoteObject {
  type: string;
  subtype?: string;
  value?: unknown;
  description?: string;
  objectId?: string;
  preview?: ObjectPreview;
}

const MAX_PREVIEW_PROPERTIES = 20;

function getPropertyPreview(name: string, v: unknown): PropertyPreview {
  if (v === null) {
    return { name, type: 'object', subtype: 'null', value: 'null' };
  }
  if (v === undefined) {
    return { name, type: 'undefined' };
  }
  const t = typeof v;
  if (t === 'string') {
    return { name, type: 'string', value: v.length > 100 ? v.slice(0, 100) + '…' : v };
  }
  if (t === 'number' || t === 'boolean') {
    return { name, type: t as 'number' | 'boolean', value: String(v) };
  }
  if (t === 'symbol') {
    return { name, type: 'symbol', value: String(v) };
  }
  if (t === 'function') {
    return { name, type: 'function', value: `function ${(v as Function).name || ''}()` };
  }
  if (t === 'object') {
    if (Array.isArray(v)) {
      return { name, type: 'object', subtype: 'array', value: `Array(${v.length})` };
    }
    if (v instanceof Error) {
      return { name, type: 'object', subtype: 'error', value: v.message || 'Error' };
    }
    try {
      const desc = (v as { constructor?: { name?: string } }).constructor?.name || 'Object';
      return { name, type: 'object', value: desc };
    } catch {
      return { name, type: 'object', value: 'Object' };
    }
  }
  return { name, type: 'string', value: String(v) };
}

function buildObjectPreview(obj: object, subtype: 'array' | undefined): ObjectPreview {
  const keys = Array.isArray(obj)
    ? Array.from({ length: Math.min((obj as unknown[]).length, MAX_PREVIEW_PROPERTIES) }, (_, i) =>
        String(i)
      )
    : Object.keys(obj);
  const overflow = Array.isArray(obj)
    ? (obj as unknown[]).length > MAX_PREVIEW_PROPERTIES
    : keys.length > MAX_PREVIEW_PROPERTIES;
  const limitedKeys = keys.slice(0, MAX_PREVIEW_PROPERTIES);
  const properties: PropertyPreview[] = limitedKeys.map((key) => {
    let v: unknown;
    try {
      v = (obj as Record<string, unknown>)[key];
    } catch {
      v = undefined;
    }
    return getPropertyPreview(key, v);
  });
  const description = Array.isArray(obj)
    ? `Array(${(obj as unknown[]).length})`
    : (obj as { constructor?: { name?: string } }).constructor?.name || 'Object';
  return {
    type: 'object',
    subtype,
    description,
    overflow,
    properties,
  };
}

/**
 * Convert a single JS value to CDP RemoteObject / 단일 JS 값을 CDP RemoteObject로 변환
 * Objects and arrays include preview so DevTools shows them like web (expandable-style) / 객체·배열은 preview 포함해 DevTools가 웹처럼 표시
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
      const objectId = getOrCreateObjectId(obj);
      const preview = buildObjectPreview(obj, 'array');
      let description = preview.description;
      try {
        const json = JSON.stringify(obj);
        if (json.length <= 120) description = json;
        else description = json.slice(0, 117) + '…';
      } catch {
        // Keep "Array(n)" / "Array(n)" 유지
      }
      return {
        type: 'object',
        subtype: 'array',
        objectId,
        description,
        preview,
      };
    }
    if (obj instanceof Error) {
      const objectId = getOrCreateObjectId(obj);
      const preview = buildObjectPreview(obj, undefined);
      return {
        type: 'object',
        subtype: 'error',
        objectId,
        description: obj.message || 'Error',
        preview,
      };
    }
    const objectId = getOrCreateObjectId(obj);
    const preview = buildObjectPreview(obj, undefined);
    let description = preview.description;
    try {
      const json = JSON.stringify(obj);
      if (json.length <= 120) description = json;
      else description = json.slice(0, 117) + '…';
    } catch {
      // Circular etc. / 순환 등
    }
    return {
      type: 'object',
      objectId,
      description,
      preview,
    };
  }
  return { type: 'string', value: String(value) };
}
