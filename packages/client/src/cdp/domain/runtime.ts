// Runtime domain implementation / Runtime 도메인 구현
import {
  objectFormat,
  objectRelease,
  getObjectProperties,
  getObjectById,
} from '../common/remoteObject';
import BaseDomain from './base';
import { Event } from './protocol';
import type { DomainOptions } from '../types';

interface ConsoleCache {
  method: string;
  params: unknown;
}

export default class Runtime extends BaseDomain {
  override namespace = 'Runtime';

  constructor(options: DomainOptions) {
    super(options);
    this.hookConsole();
  }

  // Enable Runtime domain / Runtime 도메인 활성화
  override enable(): void {
    this.send({
      method: Event.executionContextCreated,
      params: {
        context: {
          id: 1,
          name: 'top',
          origin: location.origin,
        },
      },
    });
  }

  // Evaluate JavaScript expression / JavaScript 표현식 실행
  evaluate({ expression, generatePreview }: { expression: string; generatePreview?: boolean }): {
    result: unknown;
  } {
    try {
      const res = window.eval(expression);
      // chrome-api: store last result
      (window as any).$_ = res;
      return {
        result: objectFormat(res, { preview: generatePreview }),
      };
    } catch (error) {
      return {
        result: objectFormat(error, { preview: generatePreview }),
      };
    }
  }

  // Get object properties / 객체 속성 가져오기
  getProperties(params: {
    objectId: string;
    ownProperties?: boolean;
    accessorPropertiesOnly?: boolean;
    generatePreview?: boolean;
  }): { result: unknown[] } {
    return {
      result: getObjectProperties(params),
    };
  }

  // Release object / 객체 해제
  releaseObject(params: { objectId: string }): void {
    objectRelease(params);
  }

  // Call function on object (e.g. toStringForClipboard for Copy object) / 객체에서 함수 호출 (예: Copy object용 toStringForClipboard)
  callFunctionOn({
    functionDeclaration,
    objectId,
    arguments: args,
    silent,
    returnByValue,
  }: {
    functionDeclaration: string;
    objectId?: string;
    arguments?: Array<{ value?: unknown; objectId?: string; unserializableValue?: string }>;
    silent?: boolean;
    returnByValue?: boolean;
  }): { result: unknown } | void {
    try {
      // Use indirect eval to avoid bundler/minifier warnings and strict-mode issues / 번들러·미니파이어 경고 및 strict 모드 이슈 방지를 위해 indirect eval 사용
      const fun = (0, eval)(`(${functionDeclaration})`) as (
        this: unknown,
        ...a: unknown[]
      ) => unknown;
      const resolvedArgs = (args || []).map((v) => {
        if (v && 'value' in v) return v.value;
        if (v && 'objectId' in v && v.objectId) return getObjectById(v.objectId);
        if (v && 'unserializableValue' in v && v.unserializableValue) {
          switch (v.unserializableValue) {
            case 'undefined':
              return undefined;
            case 'NaN':
              return NaN;
            case 'Infinity':
              return Infinity;
            case '-Infinity':
              return -Infinity;
            default:
              return undefined;
          }
        }
        return undefined;
      });

      const thisArg = objectId ? getObjectById(objectId) : undefined;
      const result = fun.apply(thisArg ?? null, resolvedArgs);

      // When returnByValue is true (e.g. Copy object), always return result so DevTools gets the string / returnByValue가 true일 때(예: Copy object) 항상 결과 반환해 DevTools가 문자열 수신
      if (silent && !returnByValue) {
        return;
      }

      return {
        result: objectFormat(result),
      };
    } catch (error) {
      if (silent && !returnByValue) {
        return;
      }
      return {
        result: objectFormat(error),
      };
    }
  }

  // Send console/error message / 콘솔/에러 메시지 전송
  private socketSend(type: 'console' | 'error', data: ConsoleCache): void {
    // Always send event (will be stored in IndexedDB if WebSocket is not connected) / 항상 이벤트 전송 (WebSocket이 연결되지 않았으면 IndexedDB에 저장됨)
    this.send(data);
  }

  // Hook console methods / 콘솔 메서드 훅
  private hookConsole(): void {
    // Type-safe console access / 타입 안전한 console 접근
    const consoleObj = console as unknown as Record<string, (...args: unknown[]) => void>;

    const methods: Record<string, string> = {
      log: 'log',
      debug: 'debug',
      info: 'info',
      error: 'error',
      warn: 'warning',
      dir: 'dir',
      dirxml: 'dirxml',
      table: 'table',
      trace: 'trace',
      clear: 'clear',
      group: 'startGroup',
      groupCollapsed: 'startGroupCollapsed',
      groupEnd: 'endGroup',
    };

    Object.keys(methods).forEach((key) => {
      const nativeConsoleFunc = consoleObj[key];
      (console as any)[key] = (...args: unknown[]) => {
        nativeConsoleFunc?.(...args);
        const data: ConsoleCache = {
          method: Event.consoleAPICalled,
          params: {
            type: methods[key],
            args: args.map((arg) => objectFormat(arg, { preview: true })),
            executionContextId: 1,
            timestamp: Date.now(),
            stackTrace: {
              callFrames: ['error', 'warn', 'trace'].includes(key) ? this.getCallFrames() : [],
            },
          },
        };
        this.socketSend('console', data);
      };
    });
  }

  // Get call frames from error / 에러에서 호출 프레임 가져오기
  private getCallFrames(error?: Error): Array<{
    functionName?: string;
    url?: string;
    lineNumber?: number;
    columnNumber?: number;
  }> {
    if (error && error.stack) {
      const lines = error.stack.split('\n');
      return lines.slice(1).map((line) => {
        const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
        if (match && match[2] && match[3] && match[4]) {
          return {
            functionName: match[1],
            url: match[2],
            lineNumber: parseInt(match[3], 10),
            columnNumber: parseInt(match[4], 10),
          };
        }
        return {};
      });
    }
    return [];
  }
}
