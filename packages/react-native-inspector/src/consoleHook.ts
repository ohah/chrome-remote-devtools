// JavaScript layer console hook / JavaScript 레이어 console 훅
// This hooks console methods at JavaScript level to capture stack traces with source map support / 소스맵 지원과 함께 스택 트레이스를 캡처하기 위해 JavaScript 레벨에서 console 메서드를 훅합니다

import { NativeModules, TurboModuleRegistry } from 'react-native';
import type { Spec } from './NativeChromeRemoteDevToolsInspector';

// Get native module / 네이티브 모듈 가져오기
const TurboModule = TurboModuleRegistry.get<Spec>('ChromeRemoteDevToolsInspector');
const LegacyModule = NativeModules.ChromeRemoteDevToolsInspector;
const ChromeRemoteDevToolsInspector = TurboModule || LegacyModule;

// Store original console methods / 원본 console 메서드 저장
const originalConsole: Record<string, (...args: unknown[]) => void> = {};

// Flag to prevent infinite recursion / 무한 재귀 방지 플래그
let isProcessingLog = false;

// Check if hook is enabled / 훅이 활성화되었는지 확인
let isHookEnabled = false;

// Global counter for objectId generation / objectId 생성을 위한 전역 카운터
let objectIdCounter = 1;

/**
 * Convert JavaScript value to CDP RemoteObject format / JavaScript 값을 CDP RemoteObject 형식으로 변환
 * @param value JavaScript value / JavaScript 값
 * @returns CDP RemoteObject / CDP RemoteObject
 */
function valueToRemoteObject(value: unknown): {
  type: string;
  subtype?: string;
  value?: unknown;
  description?: string;
  objectId?: string;
  preview?: {
    type: string;
    subtype: string;
    description: string;
    properties: Array<{
      name: string;
      type: string;
      subtype?: string;
      value: string;
    }>;
    overflow?: boolean;
  };
} {
  if (value === null) {
    return { type: 'object', subtype: 'null', value: null };
  }

  if (value === undefined) {
    return { type: 'undefined' };
  }

  const type = typeof value;

  switch (type) {
    case 'boolean':
      return { type: 'boolean', value };
    case 'number':
      return { type: 'number', value };
    case 'string':
      return { type: 'string', value };
    case 'function':
      return {
        type: 'object',
        subtype: 'function',
        description: `Function ${(value as Function).name || ''}`,
      };
    case 'object':
      if (Array.isArray(value)) {
        // Generate unique objectId / 고유한 objectId 생성
        const objectId = String(objectIdCounter++);

        // Create preview with array elements / 배열 요소를 포함한 preview 생성
        const preview: {
          type: string;
          subtype: string;
          description: string;
          properties: Array<{
            name: string;
            type: string;
            subtype?: string;
            value: string;
          }>;
          overflow?: boolean;
        } = {
          type: 'object',
          subtype: 'array',
          description: `Array(${value.length})`,
          properties: [],
        };

        // Extract array elements / 배열 요소 추출
        const maxElements = 100; // Limit elements for preview / preview를 위한 요소 제한
        const elementCount = Math.min(value.length, maxElements);

        for (let i = 0; i < elementCount; i++) {
          const element = value[i];
          let propType = 'object';
          let propSubtype: string | undefined;
          let propValueStr = 'Object';

          if (element === null) {
            propType = 'object';
            propSubtype = 'null';
            propValueStr = 'null';
          } else if (element === undefined) {
            propType = 'undefined';
            propValueStr = 'undefined';
          } else {
            const elementType = typeof element;
            switch (elementType) {
              case 'boolean':
                propType = 'boolean';
                propValueStr = String(element);
                break;
              case 'number':
                propType = 'number';
                propValueStr = String(element);
                break;
              case 'string':
                propType = 'string';
                propValueStr = String(element);
                break;
              case 'object':
                if (Array.isArray(element)) {
                  propType = 'object';
                  propSubtype = 'array';
                  propValueStr = `Array(${element.length})`;
                } else if (element instanceof Date) {
                  propType = 'object';
                  propSubtype = 'date';
                  propValueStr = element.toString();
                } else if (element instanceof RegExp) {
                  propType = 'object';
                  propSubtype = 'regexp';
                  propValueStr = element.toString();
                } else {
                  propType = 'object';
                  propValueStr = 'Object';
                }
                break;
              default:
                propType = 'string';
                propValueStr = String(element);
            }
          }

          const prop: {
            name: string;
            type: string;
            subtype?: string;
            value: string;
          } = {
            name: String(i),
            type: propType,
            value: propValueStr,
          };

          if (propSubtype !== undefined) {
            prop.subtype = propSubtype;
          }

          preview.properties.push(prop);
        }

        // Set overflow flag if there are more elements / 더 많은 요소가 있으면 overflow 플래그 설정
        if (value.length > maxElements) {
          preview.overflow = true;
        }

        return {
          type: 'object',
          subtype: 'array',
          description: `Array(${value.length})`,
          objectId,
          preview,
        };
      }
      if (value instanceof Error) {
        return {
          type: 'object',
          subtype: 'error',
          description: value.toString(),
        };
      }
      if (value instanceof Date) {
        return {
          type: 'object',
          subtype: 'date',
          description: value.toString(),
        };
      }
      if (value instanceof RegExp) {
        // Return as string for simple display / 간단한 표시를 위해 문자열로 반환
        return {
          type: 'string',
          value: value.toString(),
        };
      }
      // Generic object / 일반 객체
      try {
        // Generate unique objectId / 고유한 objectId 생성
        const objectId = String(objectIdCounter++);

        // Create preview with object properties / 객체 속성을 포함한 preview 생성
        const preview: {
          type: string;
          subtype: string;
          description: string;
          properties: Array<{
            name: string;
            type: string;
            subtype?: string;
            value: string;
          }>;
          overflow?: boolean;
        } = {
          type: 'object',
          subtype: '',
          description: 'Object',
          properties: [],
        };

        // Extract properties from object / 객체에서 속성 추출
        const obj = value as Record<string, unknown>;
        const keys = Object.keys(obj);
        const maxProperties = 100; // Limit properties for preview / preview를 위한 속성 제한
        const propertyCount = Math.min(keys.length, maxProperties);

        for (let i = 0; i < propertyCount; i++) {
          const key = keys[i];
          if (!key) continue;
          const propValue = obj[key];

          let propType = 'object';
          let propSubtype: string | undefined;
          let propValueStr = 'Object';

          if (propValue === null) {
            propType = 'object';
            propSubtype = 'null';
            propValueStr = 'null';
          } else if (propValue === undefined) {
            propType = 'undefined';
            propValueStr = 'undefined';
          } else {
            const propTypeOf = typeof propValue;
            switch (propTypeOf) {
              case 'boolean':
                propType = 'boolean';
                propValueStr = String(propValue);
                break;
              case 'number':
                propType = 'number';
                propValueStr = String(propValue);
                break;
              case 'string':
                propType = 'string';
                propValueStr = String(propValue);
                break;
              case 'function':
                propType = 'object';
                propSubtype = 'function';
                propValueStr = `Function ${(propValue as Function).name || ''}`;
                break;
              case 'object':
                if (Array.isArray(propValue)) {
                  propType = 'object';
                  propSubtype = 'array';
                  propValueStr = `Array(${propValue.length})`;
                } else if (propValue instanceof Date) {
                  propType = 'object';
                  propSubtype = 'date';
                  propValueStr = propValue.toString();
                } else if (propValue instanceof RegExp) {
                  propType = 'object';
                  propSubtype = 'regexp';
                  propValueStr = propValue.toString();
                } else {
                  propType = 'object';
                  propValueStr = 'Object';
                }
                break;
              default:
                propType = 'string';
                propValueStr = String(propValue);
            }
          }

          const prop: {
            name: string;
            type: string;
            subtype?: string;
            value: string;
          } = {
            name: key,
            type: propType,
            value: propValueStr,
          };

          if (propSubtype !== undefined) {
            prop.subtype = propSubtype;
          }

          preview.properties.push(prop);
        }

        // Set overflow flag if there are more properties / 더 많은 속성이 있으면 overflow 플래그 설정
        if (keys.length > maxProperties) {
          preview.overflow = true;
        }

        return {
          type: 'object',
          description: 'Object',
          objectId,
          preview,
        };
      } catch {
        return {
          type: 'object',
          description: String(value),
        };
      }
    default:
      return { type: 'string', value: String(value) };
  }
}

/**
 * Send CDP message / CDP 메시지 전송
 * @param type Console type (log, warn, error, info) / 콘솔 타입 (log, warn, error, info)
 * @param args Console arguments / 콘솔 인자
 */
async function sendCDPMessage(
  type: 'log' | 'warn' | 'error' | 'info' | 'debug',
  args: unknown[]
): Promise<void> {
  // Check if hook is enabled / 훅이 활성화되었는지 확인
  if (!isHookEnabled) {
    return;
  }

  // Get server info from global / 전역에서 서버 정보 가져오기
  const serverHost = (global as any).__ChromeRemoteDevToolsServerHost;
  const serverPort = (global as any).__ChromeRemoteDevToolsServerPort;

  if (!serverHost || !serverPort) {
    return;
  }

  // Convert args to RemoteObjects / args를 RemoteObject로 변환
  const remoteObjects = args.map(valueToRemoteObject);

  // Create CDP message / CDP 메시지 생성
  const cdpMessage = {
    method: 'Runtime.consoleAPICalled',
    params: {
      type: type === 'warn' ? 'warning' : type === 'error' ? 'error' : type,
      args: remoteObjects,
      executionContextId: 1,
      timestamp: Date.now(),
      // Do not include stackTrace to prevent DevTools from showing stack traces / DevTools가 스택 트레이스를 표시하지 않도록 stackTrace 제외
    },
  };

  // Send via native module / 네이티브 모듈을 통해 전송
  try {
    if (ChromeRemoteDevToolsInspector && serverHost && serverPort) {
      const messageStr = JSON.stringify(cdpMessage);
      await ChromeRemoteDevToolsInspector.sendCDPMessage(serverHost, serverPort, messageStr);
    }
  } catch {
    // Silently fail to prevent recursion / 재귀 방지를 위해 조용히 실패
  }
}

/**
 * Hook console methods / console 메서드 훅
 */
export function hookConsole(): void {
  if (isHookEnabled) {
    return; // Already hooked / 이미 훅됨
  }

  const methods: Array<'log' | 'warn' | 'error' | 'info' | 'debug'> = [
    'log',
    'warn',
    'error',
    'info',
    'debug',
  ];

  methods.forEach((method) => {
    // Backup original method / 원본 메서드 백업
    const original = console[method] as (...args: unknown[]) => void;
    if (original) {
      originalConsole[method] = original;
    }

    // Create wrapped method / 래핑된 메서드 생성
    const wrappedMethod = function (...args: unknown[]) {
      // Prevent infinite recursion / 무한 재귀 방지
      if (isProcessingLog) {
        if (original) {
          return original.apply(console, args);
        }
        return;
      }

      isProcessingLog = true;

      try {
        // Call original method / 원본 메서드 호출
        if (original) {
          original.apply(console, args);
        }

        // Send CDP message asynchronously / 비동기로 CDP 메시지 전송
        if (isHookEnabled) {
          sendCDPMessage(method, args).catch(function () {
            // Silently fail / 조용히 실패
          });
        }
      } catch {
        // If hook fails, call original / 훅 실패 시 원본 호출
        if (original) {
          original.apply(console, args);
        }
      } finally {
        isProcessingLog = false;
      }
    };

    // Assign wrapped method to console / 래핑된 메서드를 console에 할당
    (console as any)[method] = wrappedMethod;
  });

  isHookEnabled = true;
}

/**
 * Unhook console methods / console 메서드 언훅
 */
export function unhookConsole(): void {
  if (!isHookEnabled) {
    return; // Not hooked / 훅되지 않음
  }

  const methods: Array<'log' | 'warn' | 'error' | 'info' | 'debug'> = [
    'log',
    'warn',
    'error',
    'info',
    'debug',
  ];

  methods.forEach((method) => {
    const original = originalConsole[method];
    if (original) {
      (console as any)[method] = original;
    }
  });

  isHookEnabled = false;
}
