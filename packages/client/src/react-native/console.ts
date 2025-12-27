// Console domain for React Native / React Native용 Console 도메인

/**
 * Console domain for sending console messages to DevTools / DevTools로 콘솔 메시지 전송을 위한 Console 도메인
 */
export class ConsoleDomain {
  private isEnabled = false;
  private sendMessage: (message: unknown) => void;
  private originalConsole: {
    log?: typeof console.log;
    error?: typeof console.error;
    warn?: typeof console.warn;
    info?: typeof console.info;
    debug?: typeof console.debug;
  } = {};

  constructor(sendMessage: (message: unknown) => void) {
    this.sendMessage = sendMessage;
  }

  /**
   * Enable Console domain / Console 도메인 활성화
   */
  enable(): void {
    if (this.isEnabled) {
      return;
    }

    this.isEnabled = true;
    this.hookConsole();
  }

  /**
   * Disable Console domain / Console 도메인 비활성화
   */
  disable(): void {
    if (!this.isEnabled) {
      return;
    }

    this.isEnabled = false;
    this.unhookConsole();
  }

  /**
   * Hook console methods / 콘솔 메서드 훅
   */
  private hookConsole(): void {
    // Save original console methods / 원본 console 메서드 저장
    this.originalConsole.log = console.log;
    this.originalConsole.error = console.error;
    this.originalConsole.warn = console.warn;
    this.originalConsole.info = console.info;
    this.originalConsole.debug = console.debug;

    // Override console.log / console.log 오버라이드
    console.log = (...args: unknown[]) => {
      this.originalConsole.log?.(...args);
      this.sendConsoleMessage('log', args);
    };

    // Override console.error / console.error 오버라이드
    console.error = (...args: unknown[]) => {
      this.originalConsole.error?.(...args);
      this.sendConsoleMessage('error', args);
    };

    // Override console.warn / console.warn 오버라이드
    console.warn = (...args: unknown[]) => {
      this.originalConsole.warn?.(...args);
      this.sendConsoleMessage('warning', args);
    };

    // Override console.info / console.info 오버라이드
    console.info = (...args: unknown[]) => {
      this.originalConsole.info?.(...args);
      this.sendConsoleMessage('info', args);
    };

    // Override console.debug / console.debug 오버라이드
    console.debug = (...args: unknown[]) => {
      this.originalConsole.debug?.(...args);
      this.sendConsoleMessage('debug', args);
    };
  }

  /**
   * Unhook console methods / 콘솔 메서드 언훅
   */
  private unhookConsole(): void {
    // Restore original console methods / 원본 console 메서드 복원
    if (this.originalConsole.log) {
      console.log = this.originalConsole.log;
    }
    if (this.originalConsole.error) {
      console.error = this.originalConsole.error;
    }
    if (this.originalConsole.warn) {
      console.warn = this.originalConsole.warn;
    }
    if (this.originalConsole.info) {
      console.info = this.originalConsole.info;
    }
    if (this.originalConsole.debug) {
      console.debug = this.originalConsole.debug;
    }
  }

  /**
   * Send console message to DevTools / DevTools로 콘솔 메시지 전송
   */
  private sendConsoleMessage(type: string, args: unknown[]): void {
    if (!this.isEnabled) {
      return;
    }

    // Format arguments using objectFormat-like function / objectFormat과 유사한 함수로 인자 포맷팅
    const formattedArgs = args.map((arg) => this.formatArgument(arg));

    // Get call frames for error/warn types / error/warn 타입에 대한 호출 프레임 가져오기
    const stackTrace = ['error', 'warning', 'warn'].includes(type)
      ? { callFrames: this.getCallFrames() }
      : undefined;

    // Create CDP message matching web client format / 웹 클라이언트 형식과 일치하는 CDP 메시지 생성
    // Web client always includes stackTrace (even if empty) / 웹 클라이언트는 항상 stackTrace를 포함 (비어있어도)
    const cdpMessage = {
      method: 'Runtime.consoleAPICalled',
      params: {
        type,
        args: formattedArgs,
        executionContextId: 1,
        timestamp: Date.now(), // Use milliseconds like web client / 웹 클라이언트처럼 밀리초 사용
        stackTrace: stackTrace || { callFrames: [] }, // Always include stackTrace / 항상 stackTrace 포함
      },
    };

    // Send CDP message / CDP 메시지 전송
    this.sendMessage(cdpMessage);
  }

  /**
   * Format argument for CDP (similar to objectFormat) / CDP용 인자 포맷팅 (objectFormat과 유사)
   */
  private formatArgument(arg: unknown): {
    type: string;
    subtype?: string;
    value?: unknown;
    description?: string;
    objectId?: string;
    className?: string;
    preview?: unknown;
  } {
    if (arg === null) {
      return { type: 'object', subtype: 'null', value: null };
    }

    if (arg === undefined) {
      return { type: 'undefined' };
    }

    const argType = typeof arg;

    // Number / 숫자
    if (argType === 'number') {
      return { type: 'number', value: arg, description: String(arg) };
    }

    // String or Boolean / 문자열 또는 불린
    if (argType === 'string' || argType === 'boolean') {
      return { type: argType, value: arg };
    }

    // Object / 객체
    if (argType === 'object') {
      // Array / 배열
      if (Array.isArray(arg)) {
        const preview = {
          type: 'object',
          subtype: 'array',
          description: `Array(${arg.length})`,
          properties: arg.slice(0, 100).map((item, index) => ({
            name: String(index),
            type: typeof item,
            value: String(item),
          })),
          overflow: arg.length > 100,
        };
        return {
          type: 'object',
          subtype: 'array',
          objectId: `array_${Date.now()}_${Math.random()}`,
          className: 'Array',
          description: `Array(${arg.length})`,
          preview,
        };
      }

      // Error / 에러
      if (arg instanceof Error) {
        const preview = {
          type: 'object',
          subtype: 'error',
          description: arg.stack || arg.message,
          properties: [
            { name: 'message', type: 'string', value: arg.message },
            ...(arg.stack ? [{ name: 'stack', type: 'string', value: arg.stack }] : []),
          ],
        };
        return {
          type: 'object',
          subtype: 'error',
          objectId: `error_${Date.now()}_${Math.random()}`,
          className: 'Error',
          description: arg.stack || arg.message,
          preview,
        };
      }

      // Plain object / 일반 객체
      try {
        const keys = Object.keys(arg);
        const preview = {
          type: 'object',
          description: 'Object',
          properties: keys.slice(0, 100).map((key) => {
            const val = (arg as Record<string, unknown>)[key];
            return {
              name: key,
              type: typeof val,
              value: String(val),
            };
          }),
          overflow: keys.length > 100,
        };
        return {
          type: 'object',
          objectId: `object_${Date.now()}_${Math.random()}`,
          className: 'Object',
          description: 'Object',
          preview,
        };
      } catch {
        return { type: 'object', description: '[Object]' };
      }
    }

    // Function / 함수
    if (argType === 'function') {
      return {
        type: 'function',
        objectId: `function_${Date.now()}_${Math.random()}`,
        className: 'Function',
        description: String(arg),
      };
    }

    // Default / 기본값
    return { type: argType, value: String(arg) };
  }

  /**
   * Get call frames from stack trace / 스택 트레이스에서 호출 프레임 가져오기
   */
  private getCallFrames(): Array<{
    functionName?: string;
    url?: string;
    lineNumber?: number;
    columnNumber?: number;
  }> {
    try {
      const error = new Error();
      if (error.stack) {
        const lines = error.stack.split('\n');
        // Filter out internal calls from this module / 이 모듈의 내부 호출 필터링
        const filteredLines = lines.filter(
          (line) =>
            !line.includes('console.ts') &&
            !line.includes('websocket-client.ts') &&
            !line.includes('index.ts')
        );

        return filteredLines.slice(2).map((line) => {
          // Example line: "    at App (App.tsx:100:25)" or "    at anonymous (App.tsx:100:25)"
          const match = line.match(/at\s+(?:(.+?)\s+\()?(?:(.+?):(\d+):(\d+)|(.+?))?\)?/);
          if (match) {
            const functionName = match[1] || 'anonymous';
            const url = match[2] || match[5] || '';
            const lineNumber = match[3] ? parseInt(match[3], 10) : undefined;
            const columnNumber = match[4] ? parseInt(match[4], 10) : undefined;
            return { functionName, url, lineNumber, columnNumber };
          }
          return {};
        });
      }
    } catch {
      // Ignore errors
    }
    return [];
  }

  /**
   * Check if Console is enabled / Console 활성화 여부 확인
   */
  isConsoleEnabled(): boolean {
    return this.isEnabled;
  }
}
