// Runtime.evaluate and Runtime.addBinding for React DevTools (Fusebox) / React DevTools(Fusebox)용 Runtime.evaluate·Runtime.addBinding
// Executes expressions in app JS context and exposes CDP binding so __FUSEBOX_REACT_DEVTOOLS_DISPATCHER__ can talk to the frontend / 앱 JS 컨텍스트에서 표현식 실행 및 CDP 바인딩 노출

import { sendCDPEvent, sendCDPResponse } from './base';
import { Event } from './protocol';

const EXECUTION_CONTEXT_ID = 1;

/** CDP RemoteObject shape for evaluate result / evaluate 결과용 CDP RemoteObject 형태 */
type RemoteObject = { type: string; value?: unknown; subtype?: string; description?: string };

/** CDP ExceptionDetails shape / CDP ExceptionDetails 형태 */
type ExceptionDetails = { text: string; exception?: RemoteObject };

/**
 * Convert JS value to CDP RemoteObject (primitives and simple values only) / JS 값을 CDP RemoteObject로 변환 (원시값·단순값만)
 */
function valueToRemoteObject(value: unknown): RemoteObject {
  if (value === undefined) {
    return { type: 'undefined' };
  }
  if (value === null) {
    return { type: 'object', subtype: 'null', value: null };
  }
  if (typeof value === 'string') {
    return { type: 'string', value };
  }
  if (typeof value === 'number') {
    return { type: 'number', value };
  }
  if (typeof value === 'boolean') {
    return { type: 'boolean', value };
  }
  if (typeof value === 'bigint') {
    return { type: 'bigint', value: String(value) };
  }
  if (typeof value === 'object' || typeof value === 'function') {
    return {
      type: typeof value,
      subtype: typeof value === 'function' ? 'function' : undefined,
      description: Object.prototype.toString.call(value),
    };
  }
  return { type: 'undefined' };
}

/**
 * Execute expression in global scope and return CDP result or exceptionDetails / 전역 스코프에서 표현식 실행 후 CDP result 또는 exceptionDetails 반환
 * Uses eval so the expression's value is returned (e.g. globalThis.x != undefined → true). / 표현식의 값이 반환되도록 eval 사용 (예: globalThis.x != undefined → true)
 */
function executeExpression(expression: string): {
  result?: RemoteObject;
  exceptionDetails?: ExceptionDetails;
} {
  try {
    // Pass expression as variable to avoid injection; eval returns the expression value / 주입 방지를 위해 표현식을 변수로 전달, eval은 표현식 값을 반환
    // eslint-disable-next-line no-new-func -- intentional: run DevTools expression in app context / 앱 컨텍스트에서 DevTools 표현식 실행
    const fn = new Function('expr', 'return (0, eval)(expr)');
    const value = fn.call(globalThis, expression);
    return { result: valueToRemoteObject(value) };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      exceptionDetails: {
        text: message,
        exception: {
          type: 'object',
          subtype: 'error',
          description: message,
        },
      },
    };
  }
}

/** Registered binding name -> whether we installed the global / 등록된 바인딩 이름 -> 전역 설치 여부 */
const bindingNames = new Set<string>();

/**
 * Get global object for binding injection (globalThis or global) / 바인딩 주입용 전역 객체 (globalThis 또는 global)
 */
function getGlobal(): Record<string, unknown> {
  if (typeof globalThis !== 'undefined') {
    return globalThis as Record<string, unknown>;
  }
  if (typeof global !== 'undefined') {
    return global as Record<string, unknown>;
  }
  return {};
}

/**
 * Handle Runtime.evaluate CDP command: run expression in app JS context, send CDP response / Runtime.evaluate CDP 명령 처리: 앱 JS 컨텍스트에서 표현식 실행 후 CDP 응답 전송
 */
export function handleRuntimeEvaluate(message: {
  id?: number;
  params?: { expression?: string; returnByValue?: boolean };
}): void {
  const id = message.id;
  if (typeof id !== 'number') {
    return;
  }
  const expression = message.params?.expression;
  if (typeof expression !== 'string') {
    sendCDPResponse(id, { exceptionDetails: { text: 'Runtime.evaluate requires expression' } });
    return;
  }
  const out = executeExpression(expression);
  sendCDPResponse(id, out);
}

/**
 * Handle Runtime.addBinding CDP command: register binding name and expose global function that sends Runtime.bindingCalled / Runtime.addBinding CDP 명령 처리: 바인딩 이름 등록 및 bindingCalled 전송용 전역 함수 노출
 */
export function handleRuntimeAddBinding(message: {
  id?: number;
  params?: { name?: string };
}): void {
  const id = message.id;
  if (typeof id !== 'number') {
    return;
  }
  const name = message.params?.name;
  if (typeof name !== 'string' || name === '') {
    sendCDPResponse(id, {});
    return;
  }
  const g = getGlobal();
  if (!bindingNames.has(name)) {
    bindingNames.add(name);
    g[name] = function (payload: unknown): void {
      const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
      sendCDPEvent({
        method: Event.bindingCalled,
        params: {
          name,
          payload: payloadStr,
          executionContextId: EXECUTION_CONTEXT_ID,
        },
      });
    };
  }
  sendCDPResponse(id, {});
}
