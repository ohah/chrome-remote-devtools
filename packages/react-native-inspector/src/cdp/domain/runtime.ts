// Runtime domain (console hook, aligned with web client domain/runtime.ts) / Runtime 도메인 (콘솔 훅, 웹 domain/runtime.ts와 동일 구조)

import { Event } from './protocol';
import { sendCDPEvent } from './base';
import { valueToRemoteObject, type RemoteObject } from '../common/value-to-remote-object';

let isHooked = false;

/** Console methods that accept message args and are hooked / 메시지 인자를 받아 훅하는 console 메서드 */
const CONSOLE_METHODS = [
  'log',
  'info',
  'warn',
  'error',
  'debug',
  'trace',
  'dir',
  'dirxml',
  'table',
  'group',
  'groupCollapsed',
  'groupEnd',
  'count',
  'countReset',
  'assert',
  'clear',
  'profile',
  'profileEnd',
  'timeStamp',
  'time',
  'timeEnd',
  'timeLog',
] as const;

type ConsoleMethodName = (typeof CONSOLE_METHODS)[number];

const CDP_TYPE_MAP: Record<string, string> = {
  log: 'log',
  info: 'log',
  warn: 'warning',
  error: 'error',
  debug: 'debug',
  trace: 'log',
  dir: 'log',
  dirxml: 'log',
  table: 'log',
  group: 'log',
  groupCollapsed: 'log',
  groupEnd: 'log',
  clear: 'log',
  count: 'log',
  countReset: 'log',
  assert: 'assert',
  profile: 'log',
  profileEnd: 'log',
  timeStamp: 'log',
  time: 'log',
  timeEnd: 'log',
  timeLog: 'log',
};

/** Original console methods backup (for wrapper to call) / 원본 console 메서드 백업 (래퍼에서 호출용) */
const originalConsole: Record<string, (...args: unknown[]) => void> = {};

/** Original property descriptors for restore via defineProperties / defineProperties로 복원할 원본 프로퍼티 설명자 */
const originalDescriptors: Record<string, PropertyDescriptor> = {};

/**
 * Send Runtime.consoleAPICalled event (same shape as CDP / Reactotron: timestamp in milliseconds) / Runtime.consoleAPICalled 이벤트 전송 (CDP·Reactotron과 동일: timestamp 밀리초)
 * DevTools Console expects timestamp in milliseconds; seconds can cause messages not to show / DevTools 콘솔은 밀리초 단위 timestamp 기대, 초 단위면 메시지가 안 보일 수 있음
 */
function sendConsoleAPICalled(type: string, args: RemoteObject[]): void {
  const timestamp = Date.now();
  sendCDPEvent({
    method: Event.consoleAPICalled,
    params: {
      type,
      args,
      executionContextId: 1,
      timestamp,
      stackTrace: { callFrames: [] },
    },
  });
}

/**
 * Create wrapped console method / 래핑된 console 메서드 생성
 */
function createWrappedMethod(methodName: ConsoleMethodName): (...args: unknown[]) => void {
  const original = originalConsole[methodName];
  const cdpType = CDP_TYPE_MAP[methodName] ?? 'log';
  return function (this: unknown, ...args: unknown[]) {
    try {
      if (typeof original === 'function') {
        original.apply(this, args);
      }
    } finally {
      try {
        const remoteArgs = args.map(valueToRemoteObject);
        sendConsoleAPICalled(cdpType, remoteArgs);
      } catch (_e) {
        // Ignore CDP send errors / CDP 전송 오류 무시
      }
    }
  };
}

/**
 * Install console hooks via Object.defineProperties / Object.defineProperties로 콘솔 훅 설치
 * Idempotent: if already hooked, skip so original is not overwritten / 이미 훅이 설치되어 있으면 건너뜀 (원본 덮어쓰기 방지)
 */
function installHooks(): boolean {
  if (isHooked) return true;
  if (typeof global === 'undefined') return false;
  const g = global as typeof globalThis & { console?: Console };
  if (!g.console) return false;
  const c = g.console;
  const descriptors: PropertyDescriptorMap = {};
  for (const methodName of CONSOLE_METHODS) {
    const fn = c[methodName as keyof Console];
    if (typeof fn === 'function') {
      const desc = Object.getOwnPropertyDescriptor(c, methodName);
      if (desc) {
        originalDescriptors[methodName] = desc;
      }
      originalConsole[methodName] = fn as (...args: unknown[]) => void;
      descriptors[methodName] = {
        value: createWrappedMethod(methodName),
        writable: true,
        enumerable: true,
        configurable: true,
      };
    }
  }
  try {
    Object.defineProperties(c, descriptors);
  } catch (_e) {
    // Reset backups on failure so next installHooks does not use inconsistent state / 실패 시 백업 초기화하여 다음 설치 시 일관된 상태 유지
    for (const methodName of CONSOLE_METHODS) {
      delete originalDescriptors[methodName];
      delete originalConsole[methodName];
    }
    return false;
  }
  isHooked = true;
  return true;
}

/**
 * Restore original console methods via Object.defineProperties / Object.defineProperties로 원본 console 메서드 복원
 */
function uninstallHooks(): boolean {
  if (typeof global === 'undefined' || !isHooked) return false;
  const g = global as typeof globalThis & { console?: Console };
  if (!g.console) return false;
  const c = g.console;
  const toRestore: PropertyDescriptorMap = {};
  for (const methodName of CONSOLE_METHODS) {
    const desc = originalDescriptors[methodName];
    if (desc) {
      toRestore[methodName] = desc;
    }
  }
  try {
    Object.defineProperties(c, toRestore);
  } catch (_e) {
    return false;
  }
  // Only clear backups after successful restoration / 복원 성공 후에만 백업 클리어
  for (const methodName of CONSOLE_METHODS) {
    delete originalDescriptors[methodName];
    delete originalConsole[methodName];
  }
  isHooked = false;
  return true;
}

/**
 * Enable console hook (install wrappers) / 콘솔 훅 활성화 (래퍼 설치)
 */
export function enableConsoleHook(): boolean {
  return installHooks();
}

/**
 * Disable console hook (restore originals) / 콘솔 훅 비활성화 (원본 복원)
 */
export function disableConsoleHook(): boolean {
  return uninstallHooks();
}

/**
 * Check if console hook is enabled / 콘솔 훅이 활성화되어 있는지 확인
 */
export function isConsoleHookEnabled(): boolean {
  return isHooked;
}

/**
 * Send Runtime.executionContextCreated so DevTools registers context before console messages
 * / DevTools가 콘솔 메시지 전에 실행 컨텍스트를 등록하도록 Runtime.executionContextCreated 전송
 * Called by client after WebSocket connect (aligned with C++/iOS: 100ms after connect)
 * / WebSocket 연결 후 클라이언트에서 호출 (C++/iOS와 동일: 연결 후 100ms)
 */
export function sendExecutionContextCreated(): void {
  // Do not log here: it would go through console hook and send Runtime.consoleAPICalled before executionContextCreated, so DevTools might drop it / 여기서 로그하면 훅을 타 executionContextCreated보다 먼저 consoleAPICalled가 전송되어 DevTools가 무시할 수 있음
  sendCDPEvent({
    method: Event.executionContextCreated,
    params: {
      context: {
        id: 1,
        uniqueId: '1',
        origin: 'react-native://',
        name: 'React Native',
        auxData: { isDefault: true },
      },
    },
  });
}
