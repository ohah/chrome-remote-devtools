// Runtime domain tests / Runtime 도메인 테스트
// happy-dom is registered via bunfig.toml preload / happy-dom은 bunfig.toml preload를 통해 등록됨
import { describe, test, expect, beforeEach, beforeAll, afterAll, afterEach, mock } from 'bun:test';
import Runtime from '../runtime';
import {
  createWebSocketTestServer,
  createWebSocketConnection,
  type WebSocketTestServer,
} from '../../../__tests__/helpers/websocket-server';

describe('Runtime Domain', () => {
  let socket: WebSocket;
  let sendCallCount: number;
  let originalSend: typeof WebSocket.prototype.send;
  let runtime: Runtime;
  let testServer: WebSocketTestServer;

  beforeAll(() => {
    // Create WebSocket server for testing / 테스트를 위한 WebSocket 서버 생성
    testServer = createWebSocketTestServer();
  });

  afterAll(() => {
    // Close server after all tests / 모든 테스트 후 서버 종료
    testServer.server.stop();
  });

  beforeEach(async () => {
    // happy-dom이 window, document, location, navigator를 자동으로 제공
    // happy-dom automatically provides window, document, location, navigator

    // Use Bun's WebSocket with actual connection / 실제 연결을 사용하는 Bun의 WebSocket
    // Create actual WebSocket instance and wait for connection / 실제 WebSocket 인스턴스 생성 및 연결 대기
    socket = await createWebSocketConnection(testServer.url);

    // Wrap actual send method to track calls / 실제 send 메서드를 래핑하여 호출 추적
    sendCallCount = 0;
    originalSend = socket.send.bind(socket);
    socket.send = ((data: string | ArrayBuffer | Blob) => {
      sendCallCount++;
      // Call actual send / 실제 send 호출
      originalSend(data);
    }) as typeof WebSocket.prototype.send;

    // Mock console for Runtime.hookConsole() / Runtime.hookConsole()를 위한 console 모킹
    // Create mock console / console 모킹 생성
    // Runtime 클래스가 console 메서드를 수정하므로 모킹 필요
    // Runtime class modifies console methods, so mocking is needed
    const mockConsole = {
      log: mock(() => {}),
      debug: mock(() => {}),
      info: mock(() => {}),
      error: mock(() => {}),
      warn: mock(() => {}),
      dir: mock(() => {}),
      dirxml: mock(() => {}),
      table: mock(() => {}),
      trace: mock(() => {}),
      clear: mock(() => {}),
      group: mock(() => {}),
      groupCollapsed: mock(() => {}),
      groupEnd: mock(() => {}),
    };
    globalThis.console = mockConsole as any;

    // Override window.eval for Runtime.evaluate / Runtime.evaluate를 위한 window.eval 오버라이드
    // happy-dom의 window를 사용하되 eval만 커스텀
    // Use happy-dom's window but customize eval
    if (globalThis.window) {
      (globalThis.window as any).eval = mock((expression: string) => {
        // Simple eval mock / 간단한 eval 모킹
        try {
          return Function(`"use strict"; return (${expression})`)();
        } catch {
          return Function(`"use strict"; return ${expression}`)();
        }
      });
    }

    runtime = new Runtime({ socket });
  });

  afterEach(() => {
    // Close socket after each test / 각 테스트 후 소켓 닫기
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
  });

  test('should create instance / 인스턴스 생성', () => {
    expect(runtime).toBeDefined();
    expect(runtime.namespace).toBe('Runtime');
  });

  test('should enable Runtime domain / Runtime 도메인 활성화', () => {
    const initialCallCount = sendCallCount;
    runtime.enable();
    // Should send executionContextCreated event / executionContextCreated 이벤트 전송해야 함
    expect(sendCallCount).toBeGreaterThan(initialCallCount);
  });

  test('should evaluate JavaScript expression / JavaScript 표현식 실행', () => {
    const result = runtime.evaluate({ expression: '1 + 1' });
    expect(result).toHaveProperty('result');
    expect(result.result).toHaveProperty('type');
  });

  test('should evaluate string expression / 문자열 표현식 실행', () => {
    const result = runtime.evaluate({ expression: '"hello"' });
    expect(result).toHaveProperty('result');
    expect(result.result).toHaveProperty('type', 'string');
  });

  test('should handle evaluation error / 평가 에러 처리', () => {
    const result = runtime.evaluate({ expression: 'throw new Error("test")' });
    expect(result).toHaveProperty('result');
    // Error should be formatted / 에러가 포맷되어야 함
    expect(result.result).toHaveProperty('type');
  });

  test('should get object properties / 객체 속성 가져오기', () => {
    // First create an object by evaluating / 먼저 평가로 객체 생성
    const evalResult = runtime.evaluate({ expression: '({a: 1, b: 2})' });
    expect(evalResult.result).toHaveProperty('objectId');

    if (
      evalResult.result &&
      typeof evalResult.result === 'object' &&
      'objectId' in evalResult.result
    ) {
      const objectId = evalResult.result.objectId as string;
      const propsResult = runtime.getProperties({ objectId });
      expect(propsResult).toHaveProperty('result');
      expect(Array.isArray(propsResult.result)).toBe(true);
    }
  });

  test('should release object / 객체 해제', () => {
    // First create an object / 먼저 객체 생성
    const evalResult = runtime.evaluate({ expression: '({a: 1})' });
    expect(evalResult.result).toHaveProperty('objectId');

    if (
      evalResult.result &&
      typeof evalResult.result === 'object' &&
      'objectId' in evalResult.result
    ) {
      const objectId = evalResult.result.objectId as string;
      // Should not throw / 에러가 발생하지 않아야 함
      expect(() => runtime.releaseObject({ objectId })).not.toThrow();
    }
  });

  test('should call function on object / 객체에서 함수 호출', () => {
    // First create an object with method / 먼저 메서드가 있는 객체 생성
    const evalResult = runtime.evaluate({
      expression: '({add: function(a, b) { return a + b; }})',
    });
    expect(evalResult.result).toHaveProperty('objectId');

    if (
      evalResult.result &&
      typeof evalResult.result === 'object' &&
      'objectId' in evalResult.result
    ) {
      const objectId = evalResult.result.objectId as string;
      const callResult = runtime.callFunctionOn({
        functionDeclaration: 'function(a, b) { return a + b; }',
        objectId,
        arguments: [{ value: 1 }, { value: 2 }],
      });
      expect(callResult).toHaveProperty('result');
    }
  });

  test('should handle silent function call / 조용한 함수 호출 처리', () => {
    const callResult = runtime.callFunctionOn({
      functionDeclaration: 'function() { return 1; }',
      silent: true,
    });
    expect(callResult).toBeUndefined();
  });
});
