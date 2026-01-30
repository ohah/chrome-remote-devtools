/**
 * Utils tests / 유틸리티 테스트
 * Covers getGlobalObj, getExtensionStatus / 전역 객체·extension 상태
 */
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { getGlobalObj, getExtensionStatus } from '../utils';

describe('utils', () => {
  beforeEach(() => {
    (global as any).__REDUX_DEVTOOLS_EXTENSION__ = undefined;
    (global as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ = undefined;
    if (typeof (global as any).window !== 'undefined') {
      (global as any).window.__REDUX_DEVTOOLS_EXTENSION__ = undefined;
    }
  });

  afterEach(() => {
    (global as any).__REDUX_DEVTOOLS_EXTENSION__ = undefined;
    (global as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ = undefined;
  });

  test('getGlobalObj returns global when defined / global 정의 시 global 반환', () => {
    const obj = getGlobalObj();
    expect(obj).toBeDefined();
    expect(typeof obj).toBe('object');
  });

  test('getExtensionStatus returns extensionExists false when no extension / extension 없을 때 false', () => {
    const status = getExtensionStatus();
    expect(status.extensionExists).toBe(false);
    expect(status.hasConnect).toBe(false);
    expect(status.isFunction).toBe(false);
    expect(status.hasGlobal).toBe(true);
  });

  test('getExtensionStatus returns true when extension with connect is set / connect 있는 extension 설정 시 true', () => {
    const connect = () => () => {};
    (global as any).__REDUX_DEVTOOLS_EXTENSION__ = connect;
    const status = getExtensionStatus();
    expect(status.extensionExists).toBe(true);
    expect(status.hasConnect).toBe(true);
    expect(status.isFunction).toBe(true);
  });

  test('getExtensionStatus hasCompose when COMPOSE__ is set / COMPOSE__ 설정 시 hasCompose true', () => {
    (global as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ = () => () => {};
    const status = getExtensionStatus();
    expect(status.hasCompose).toBe(true);
  });

  test('getExtensionStatus accepts optional storeName / storeName 선택 인자 허용', () => {
    const status = getExtensionStatus('MyStore');
    expect(status).toHaveProperty('extensionExists');
    expect(status).toHaveProperty('zustandCanDetect');
  });
});
