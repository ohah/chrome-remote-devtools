// Remote Object management for CDP / CDP용 Remote Object 관리

const objectIds = new Map<unknown, string>();
const objects = new Map<string, unknown>();
const origins = new Map<string, unknown>();
let currentId = 1;

const getIdByObject = (object: unknown, origin: unknown): string => {
  let id = objectIds.get(object);
  if (id) return id;

  id = `${currentId++}`;
  objects.set(id, object);
  objectIds.set(object, id);
  origins.set(id, origin);
  return id;
};

const getRealType = (val: unknown): string => {
  const reg = /\[object\s+(.*)\]/;
  const res = reg.exec(Object.prototype.toString.call(val));
  return res ? res[1] || '' : '';
};

const getSubType = (val: unknown): string => {
  // DOM node type / DOM 노드 타입
  try {
    if (val && typeof val === 'object' && 'nodeType' in val) {
      const node = val as { nodeType: number };
      if ([1, 8, 9].includes(node.nodeType)) return 'node';
    }
  } catch {
    // Ignore
  }

  const realType = getRealType(val).toLowerCase();
  return [
    'array',
    'null',
    'regexp',
    'date',
    'map',
    'set',
    'weakmap',
    'weakset',
    'error',
    'proxy',
    'promise',
    'arraybuffer',
    'iterator',
    'generator',
  ].includes(realType)
    ? realType
    : '';
};

const getType = (val: unknown): { type: string; subtype: string } => ({
  type: typeof val,
  subtype: getSubType(val),
});

interface PreviewOptions {
  length?: number;
  origin?: unknown;
}

const getPreview = (
  val: unknown,
  others: PreviewOptions = {}
): {
  overflow: boolean;
  properties: Array<{
    name: string;
    type: string;
    subtype: string;
    value: string;
  }>;
} => {
  const { length = 5, origin = val } = others;

  if (typeof val !== 'object' || val === null) {
    return { overflow: false, properties: [] };
  }

  const keys = Object.keys(val);
  const properties: Array<{
    name: string;
    type: string;
    subtype: string;
    value: string;
  }> = [];

  keys.slice(0, length).forEach((key) => {
    let subVal: unknown;
    try {
      subVal = (origin as Record<string, unknown>)[key];
    } catch {
      // Ignore
    }

    const { type, subtype } = getType(subVal);
    let valueStr: string;

    if (type === 'object') {
      if (subtype === 'array') {
        valueStr = `Array(${(subVal as unknown[]).length})`;
      } else if (subtype === 'null') {
        valueStr = 'null';
      } else if (['date', 'regexp'].includes(subtype)) {
        valueStr = String(subVal);
      } else if (subtype === 'node') {
        const node = subVal as { nodeName: string };
        valueStr = `#${node.nodeName}`;
      } else {
        try {
          valueStr = (subVal as { constructor: { name: string } }).constructor.name;
        } catch {
          valueStr = 'Object';
        }
      }
    } else {
      valueStr = subVal === undefined ? 'undefined' : String(subVal);
    }

    properties.push({
      name: key,
      type,
      subtype,
      value: valueStr,
    });
  });

  return {
    overflow: keys.length > length,
    properties,
  };
};

interface ObjectFormatOptions {
  origin?: unknown;
  preview?: boolean;
}

export function objectFormat(
  val: unknown,
  others: ObjectFormatOptions = {}
): {
  type: string;
  subtype?: string;
  value?: unknown;
  description?: string;
  objectId?: string;
  className?: string;
  preview?: unknown;
} {
  const { origin = val, preview = false } = others;
  const { type, subtype } = getType(val);

  if (type === 'undefined') return { type };

  if (type === 'number') {
    return { type, value: val, description: String(val) };
  }

  if (type === 'string' || type === 'boolean') {
    return { type, value: val };
  }

  if (type === 'symbol') {
    return {
      type,
      objectId: getIdByObject(val, origin),
      description: String(val),
    };
  }

  if (subtype === 'null') {
    return { type, subtype, value: val };
  }

  const res: {
    type: string;
    subtype?: string;
    objectId?: string;
    className?: string;
    description?: string;
    preview?: unknown;
  } = {
    type,
    subtype,
    objectId: getIdByObject(val, origin),
  };

  // Function / 함수
  if (type === 'function') {
    res.className = 'Function';
    res.description = String(val);
    if (preview) {
      res.preview = {
        type,
        subtype,
        description: String(val),
        ...getPreview(val, { origin }),
      };
    }
  }
  // Array / 배열
  else if (subtype === 'array') {
    res.className = 'Array';
    const arr = val as unknown[];
    res.description = `Array(${arr.length})`;
    if (preview) {
      res.preview = {
        type,
        subtype,
        description: `Array(${arr.length})`,
        ...getPreview(val, { length: 100, origin }),
      };
    }
  }
  // Error / 에러
  else if (subtype === 'error') {
    res.className = 'Error';
    const err = val as Error;
    res.description = err.stack || err.message;
    if (preview) {
      res.preview = {
        type,
        subtype,
        description: err.stack || err.message,
        ...getPreview(val, { origin }),
      };
    }
  }
  // HTML Element / HTML 요소
  else if (subtype === 'node') {
    try {
      const node = val as { constructor: { name: string } };
      res.className = res.description = node.constructor.name;
    } catch {
      res.className = res.description = '';
    }
  }
  // Others / 기타
  else {
    try {
      const obj = val as { constructor: { name: string } };
      res.className = res.description = obj.constructor.name;
    } catch {
      res.className = res.description = '';
    }
    if (preview) {
      res.preview = {
        type,
        subtype,
        description: res.description,
        ...getPreview(val, { origin }),
      };
    }
  }

  return res;
}

interface GetObjectPropertiesParams {
  accessorPropertiesOnly?: boolean;
  generatePreview?: boolean;
  objectId: string;
  ownProperties?: boolean;
}

export function getObjectProperties(params: GetObjectPropertiesParams): Array<{
  name: string;
  configurable?: boolean;
  enumerable?: boolean;
  writable?: boolean;
  isOwn?: boolean;
  value: unknown;
}> {
  const { accessorPropertiesOnly, generatePreview, objectId, ownProperties } = params;
  const curObject = objects.get(objectId);
  if (!curObject) {
    return [];
  }

  const origin = origins.get(objectId);
  const result: Array<{
    name: string;
    configurable?: boolean;
    enumerable?: boolean;
    writable?: boolean;
    isOwn?: boolean;
    value: unknown;
  }> = [];

  const proto = (curObject as any).__proto__;

  // If the current object has a __proto__ prototype and needs to obtain non-self attributes
  // otherwise the current object
  const nextObject = proto && !ownProperties ? proto : curObject;

  const keys = Object.getOwnPropertyNames(nextObject);

  for (const key of keys) {
    // Skip key is an attribute of __proto__
    if (key === '__proto__') continue;

    const property: {
      name: string;
      configurable?: boolean;
      enumerable?: boolean;
      writable?: boolean;
      isOwn?: boolean;
      value: unknown;
    } = { name: key, value: undefined };

    let propVal: unknown;
    try {
      propVal = (origin as Record<string, unknown>)[key];
    } catch {
      // Ignore
    }

    const descriptor = Object.getOwnPropertyDescriptor(nextObject, key);
    if (!descriptor) continue;

    if (accessorPropertiesOnly && !descriptor.get && !descriptor.set) continue;

    property.configurable = descriptor.configurable;
    property.enumerable = descriptor.enumerable;
    property.writable = descriptor.writable;
    property.isOwn = ownProperties
      ? true
      : proto
        ? Object.prototype.hasOwnProperty.call(proto, key)
        : true;
    property.value = objectFormat(propVal, { preview: generatePreview });

    result.push(property);
  }

  // Append __proto__ prototype
  if (proto) {
    result.push({
      name: '__proto__',
      configurable: true,
      enumerable: false,
      isOwn: !!ownProperties,
      value: objectFormat(proto, { origin }),
    });
  }

  return result;
}

// Release object / 객체 해제
export function objectRelease({ objectId }: { objectId: string }): void {
  const object = objects.get(objectId);
  if (object) {
    objects.delete(objectId);
    objectIds.delete(object);
    origins.delete(objectId);
  }
}

export function getObjectById(objectId: string): unknown {
  return objects.get(objectId);
}
