// Metro config tests / Metro config 테스트
import { describe, test, expect } from 'bun:test';
import { withReduxDevTools } from '../metro-config.cjs';
import * as path from 'path';
import * as fs from 'fs';

describe('Metro Config', () => {
  test('should add polyfill to getModulesRunBeforeMainModule / getModulesRunBeforeMainModule에 polyfill 추가', () => {
    const mockConfig = {
      serializer: {
        getModulesRunBeforeMainModule: () => [],
      },
    };

    const result = withReduxDevTools(mockConfig);

    expect(result.serializer).toBeDefined();
    expect(result.serializer.getModulesRunBeforeMainModule).toBeDefined();

    const modules = result.serializer.getModulesRunBeforeMainModule();
    expect(modules.length).toBeGreaterThan(0);
    expect(modules[0]).toContain('redux-devtools-extension-polyfill');
  });

  test('should preserve existing modules / 기존 모듈 보존', () => {
    const existingModule = 'existing-module.js';
    const mockConfig = {
      serializer: {
        getModulesRunBeforeMainModule: () => [existingModule],
      },
    };

    const result = withReduxDevTools(mockConfig);
    const modules = result.serializer.getModulesRunBeforeMainModule();

    expect(modules).toContain(existingModule);
    expect(modules[0]).toContain('redux-devtools-extension-polyfill');
    expect(modules.length).toBe(2);
  });

  test('should handle missing serializer config / serializer config가 없을 때 처리', () => {
    const mockConfig = {};

    const result = withReduxDevTools(mockConfig);

    expect(result.serializer).toBeDefined();
    expect(result.serializer.getModulesRunBeforeMainModule).toBeDefined();

    const modules = result.serializer.getModulesRunBeforeMainModule();
    expect(modules.length).toBeGreaterThan(0);
  });

  test('should handle missing getModulesRunBeforeMainModule / getModulesRunBeforeMainModule이 없을 때 처리', () => {
    const mockConfig = {
      serializer: {},
    };

    const result = withReduxDevTools(mockConfig);

    expect(result.serializer).toBeDefined();
    expect(result.serializer.getModulesRunBeforeMainModule).toBeDefined();

    const modules = result.serializer.getModulesRunBeforeMainModule();
    expect(modules.length).toBeGreaterThan(0);
  });

  test('should return polyfill path that exists / 존재하는 polyfill 경로 반환', () => {
    const mockConfig = {
      serializer: {
        getModulesRunBeforeMainModule: () => [],
      },
    };

    const result = withReduxDevTools(mockConfig);
    const modules = result.serializer.getModulesRunBeforeMainModule();

    expect(modules.length).toBeGreaterThan(0);
    const polyfillPath = modules[0];

    // Verify path exists / 경로가 존재하는지 확인
    expect(fs.existsSync(polyfillPath)).toBe(true);
    expect(polyfillPath).toContain('redux-devtools-extension-polyfill.js');
  });

  test('should export withChromeRemoteDevToolsRedux alias / withChromeRemoteDevToolsRedux 별칭 export', () => {
    // Verify both exports are available / 두 export가 모두 사용 가능한지 확인
    const { withChromeRemoteDevToolsRedux } = require('../metro-config.cjs');
    expect(typeof withChromeRemoteDevToolsRedux).toBe('function');
    expect(withChromeRemoteDevToolsRedux).toBe(withReduxDevTools);
  });
});
