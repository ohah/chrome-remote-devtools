// Zustand DevTools integration tests / Zustand DevTools 통합 테스트
// Tests Zustand integration with Redux DevTools Extension polyfill / Redux DevTools Extension polyfill과의 Zustand 통합 테스트
// Note: Zustand devtools uses Redux DevTools Extension internally, which may not work in test environment
// 참고: Zustand devtools는 내부적으로 Redux DevTools Extension을 사용하므로 테스트 환경에서 작동하지 않을 수 있습니다
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  setCDPMessageSender,
  setServerConnection,
  installReduxDevToolsPolyfill,
} from '../redux-devtools-extension';
import { getGlobalObj } from '../utils';

describe('Zustand DevTools Integration', () => {
  let mockCDPSender: (host: string, port: number, message: string) => void;
  let globalObj: any;
  let sentMessages: Array<{ host: string; port: number; message: string }>;

  beforeEach(() => {
    globalObj = getGlobalObj();
    sentMessages = [];
    mockCDPSender = (host, port, message) => {
      sentMessages.push({ host, port, message });
    };

    // Install polyfill / polyfill 설치
    installReduxDevToolsPolyfill();
    setCDPMessageSender(mockCDPSender);
    setServerConnection('localhost', 8080);
  });

  afterEach(() => {
    // Cleanup / 정리
    if (globalObj.__REDUX_DEVTOOLS_EXTENSION__) {
      delete globalObj.__REDUX_DEVTOOLS_EXTENSION__;
    }
    if (globalObj.__REDUX_DEVTOOLS_EXTENSION_JS_POLYFILL__) {
      delete globalObj.__REDUX_DEVTOOLS_EXTENSION_JS_POLYFILL__;
    }
  });

  test('should have Redux DevTools Extension available for Zustand / Zustand에서 사용할 수 있는 Redux DevTools Extension 확인', () => {
    // Verify extension is installed / extension이 설치되었는지 확인
    expect(globalObj.__REDUX_DEVTOOLS_EXTENSION__).toBeDefined();
    expect(typeof globalObj.__REDUX_DEVTOOLS_EXTENSION__.connect).toBe('function');
  });

  test('should create Zustand store with devtools middleware / devtools middleware로 Zustand 스토어 생성', () => {
    const useStore = create(
      devtools(
        (set) => ({
          count: 0,
          increment: () =>
            set((state) => ({ count: state.count + 1 }), undefined, 'counter/increment'),
        }),
        { name: 'TestStore', enabled: true }
      )
    );

    // Verify store works / 스토어가 작동하는지 확인
    expect(useStore.getState().count).toBe(0);
    useStore.getState().increment();
    expect(useStore.getState().count).toBe(1);
  });
});
