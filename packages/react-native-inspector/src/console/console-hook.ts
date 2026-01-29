// Console hook (JavaScript layer) / 콘솔 훅 (JavaScript 레이어)
// Wraps console methods and sends Runtime.consoleAPICalled to DevTools / console 메서드를 래핑하고 Runtime.consoleAPICalled를 DevTools로 전송

import { getServerInfo } from '../server-info';
import { valueToRemoteObject, type RemoteObject } from './value-to-remote-object';

type CDPSender = (host: string, port: number, message: string) => void;

let cdpSender: CDPSender | null = null;
let isConnectionReady = false;
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
  'count',
  'assert',
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

/** Original console methods backup / 원본 console 메서드 백업 */
const originalConsole: Record<string, (...args: unknown[]) => void> = {};

/**
 * Send Runtime.consoleAPICalled event / Runtime.consoleAPICalled 이벤트 전송
 */
function sendConsoleAPICalled(type: string, args: RemoteObject[]): void {
  if (!cdpSender || !isConnectionReady) return;
  const serverInfo = getServerInfo();
  if (!serverInfo) return;
  const timestamp = Date.now() / 1000;
  const message = {
    method: 'Runtime.consoleAPICalled',
    params: {
      type,
      args,
      executionContextId: 1,
      timestamp,
      stackTrace: { callFrames: [] },
    },
  };
  cdpSender(serverInfo.host, serverInfo.port, JSON.stringify(message));
}

/**
 * Create wrapped console method / 래핑된 console 메서드 생성
 */
function createWrappedMethod(methodName: ConsoleMethodName): (...args: unknown[]) => void {
  const original = originalConsole[methodName];
  const cdpType = CDP_TYPE_MAP[methodName] ?? 'log';
  return function (this: unknown, ...args: unknown[]) {
    try {
      original.apply(this, args);
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
 * Install console hooks / 콘솔 훅 설치
 */
function installHooks(): boolean {
  if (typeof global === 'undefined') return false;
  const g = global as typeof globalThis & { console?: Console };
  if (!g.console) return false;
  const c = g.console;
  for (const methodName of CONSOLE_METHODS) {
    const fn = c[methodName as keyof Console];
    if (typeof fn === 'function') {
      originalConsole[methodName] = fn as (...args: unknown[]) => void;
      (c as Record<string, (...args: unknown[]) => void>)[methodName] =
        createWrappedMethod(methodName);
    }
  }
  isHooked = true;
  return true;
}

/**
 * Restore original console methods / 원본 console 메서드 복원
 */
function uninstallHooks(): boolean {
  if (typeof global === 'undefined' || !isHooked) return false;
  const g = global as typeof globalThis & { console?: Console };
  if (!g.console) return false;
  const c = g.console;
  for (const methodName of CONSOLE_METHODS) {
    const original = originalConsole[methodName];
    if (original) {
      (c as Record<string, (...args: unknown[]) => void>)[methodName] = original;
    }
  }
  isHooked = false;
  return true;
}

/**
 * Set CDP message sender for console hook / 콘솔 훅용 CDP 메시지 전송자 설정
 */
export function setConsoleCDPSender(sender: CDPSender): void {
  cdpSender = sender;
}

/**
 * Mark connection as ready for console hook / 콘솔 훅 연결 준비 완료 표시
 */
export function setConsoleConnectionReady(): void {
  isConnectionReady = true;
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
