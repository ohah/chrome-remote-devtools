// Runtime.getProperties response (aligned with web client: PropertyDescriptor[] with value as RemoteObject) / Runtime.getProperties 응답 (웹과 동일: value를 RemoteObject로)

import { getObject } from './object-store';
import { valueToRemoteObject, type RemoteObject } from './value-to-remote-object';

/**
 * CDP PropertyDescriptor shape for getProperties result / getProperties 결과용 CDP PropertyDescriptor 형태
 */
export interface PropertyDescriptor {
  name: string;
  value?: RemoteObject;
  configurable?: boolean;
  enumerable?: boolean;
  writable?: boolean;
}

/**
 * Get object properties for Runtime.getProperties (same as web client) / Runtime.getProperties용 객체 속성 반환
 * @param objectId CDP objectId / CDP objectId
 * @returns PropertyDescriptor[] for CDP result / CDP result용 PropertyDescriptor[]
 */
export function getObjectProperties(objectId: string): PropertyDescriptor[] {
  const obj = getObject(objectId);
  if (obj === undefined || typeof obj !== 'object' || obj === null) {
    return [];
  }
  const result: PropertyDescriptor[] = [];
  let keys: string[];
  try {
    keys = Object.getOwnPropertyNames(obj);
  } catch {
    return [];
  }
  for (const key of keys) {
    if (key === '__proto__') continue;
    let propVal: unknown;
    try {
      propVal = (obj as Record<string, unknown>)[key];
    } catch {
      continue;
    }
    let descriptor:
      | { configurable?: boolean; enumerable?: boolean; writable?: boolean }
      | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(obj, key);
    } catch {
      descriptor = undefined;
    }
    const value = valueToRemoteObject(propVal);
    result.push({
      name: key,
      value,
      configurable: descriptor?.configurable,
      enumerable: descriptor?.enumerable,
      writable: descriptor?.writable,
    });
  }
  return result;
}
