// Runtime domain implementation / Runtime 도메인 구현
import {
  objectFormat,
  objectRelease,
  getObjectProperties,
  getObjectById,
} from '../common/remoteObject';
import { isSafari } from '../common/utils';
import BaseDomain from './base';
import { Event } from './protocol';

interface ConsoleCache {
  method: string;
  params: unknown;
}

export default class Runtime extends BaseDomain {
  override namespace = 'Runtime';

  private cacheConsole: ConsoleCache[] = [];
  private cacheError: ConsoleCache[] = [];
  private isEnable = false;

  constructor(options: { socket: WebSocket }) {
    super(options);
    this.hookConsole();
    this.listenError();
  }

  // Enable Runtime domain / Runtime 도메인 활성화
  override enable(): void {
    this.isEnable = true;
    this.cacheConsole.forEach((data) => this.send(data));
    this.cacheError.forEach((data) => this.send(data));

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
    Runtime.setCommandLineApi();
  }

  // Evaluate JavaScript expression / JavaScript 표현식 실행
  evaluate({ expression, generatePreview }: { expression: string; generatePreview?: boolean }): {
    result: unknown;
  } {
    try {
      // eslint-disable-next-line no-eval
      const res = window.eval(expression);
      // chrome-api: store last result
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // Call function on object / 객체에서 함수 호출
  callFunctionOn({
    functionDeclaration,
    objectId,
    arguments: args,
    silent,
  }: {
    functionDeclaration: string;
    objectId?: string;
    arguments?: Array<{ value?: unknown; objectId?: string }>;
    silent?: boolean;
  }): { result: unknown } | void {
    try {
      // eslint-disable-next-line no-eval
      const fun = eval(`(() => ${functionDeclaration})()`);
      const resolvedArgs = (args || []).map((v) => {
        if ('value' in v) return v.value;
        if ('objectId' in v && v.objectId) return getObjectById(v.objectId);
        return undefined;
      });

      const thisArg = objectId ? getObjectById(objectId) : null;
      const result = fun.apply(thisArg, resolvedArgs);

      if (silent) {
        return;
      }

      return {
        result: objectFormat(result),
      };
    } catch (error) {
      if (silent) {
        return;
      }
      return {
        result: objectFormat(error),
      };
    }
  }

  // Send console/error message / 콘솔/에러 메시지 전송
  private socketSend(type: 'console' | 'error', data: ConsoleCache): void {
    if (type === 'console') {
      this.cacheConsole.push(data);
    } else if (type === 'error') {
      this.cacheError.push(data);
    }
    if (this.isEnable) {
      this.send(data);
    }
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // Listen for global errors / 전역 에러 리스닝
  private listenError(): void {
    const exceptionThrown = (error: Error | unknown): void => {
      let desc = 'Script error.';
      if (error instanceof Error) {
        desc = error.stack || error.message;
        if (isSafari()) {
          const err = error as Error & { sourceURL?: string; line?: number; column?: number };
          desc = `${error.name}: ${error.message}\n    at (${err.sourceURL || ''}:${err.line || ''}:${err.column || ''})`;
        }
      }

      const data: ConsoleCache = {
        method: Event.exceptionThrown,
        params: {
          timestamp: Date.now(),
          exceptionDetails: {
            text: 'Uncaught',
            exception: {
              type: 'object',
              subtype: 'error',
              className: error instanceof Error ? error.name : 'Error',
              description: desc,
            },
            stackTrace: {
              callFrames: error instanceof Error ? this.getCallFrames(error) : [],
            },
          },
        },
      };
      this.socketSend('error', data);
    };

    window.addEventListener('error', (e) => exceptionThrown(e.error));
    window.addEventListener('unhandledrejection', (e) => exceptionThrown(e.reason));
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

  // Set Chrome Command Line API / Chrome Command Line API 설정
  static setCommandLineApi(): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).$_ = undefined;

    if (typeof (window as any).clear !== 'function') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).clear = () => console.clear();
    }

    if (typeof (window as any).copy !== 'function') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).copy = (object: unknown) => {
        const str = String(object);
        if ('clipboard' in navigator) {
          navigator.clipboard.writeText(str).catch(() => {
            // Fallback
          });
        }
      };
    }

    if (typeof (window as any).dir !== 'function') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).dir = (object: unknown) => console.dir(object);
    }

    if (typeof (window as any).dirxml !== 'function') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).dirxml = (object: unknown) => console.dirxml(object);
    }

    if (typeof (window as any).keys !== 'function') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).keys = (object: unknown) => Object.keys(object as Record<string, unknown>);
    }

    if (typeof (window as any).values !== 'function') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).values = (object: unknown) =>
        Object.values(object as Record<string, unknown>);
    }

    if (typeof (window as any).table !== 'function') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).table = (object: unknown) => console.table(object);
    }
  }
}
