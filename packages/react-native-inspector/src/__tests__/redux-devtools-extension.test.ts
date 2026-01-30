// Redux DevTools Extension polyfill tests / Redux DevTools Extension polyfill 테스트
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  setCDPMessageSender,
  setServerConnection,
  installReduxDevToolsPolyfill,
  getPendingActions,
  clearPendingActions,
  resetConnectionState,
  replaceWithJSIVersion,
  composeWithDevTools,
} from '../redux-devtools-extension';
import { getGlobalObj } from '../utils';

describe('Redux DevTools Extension Polyfill', () => {
  let mockCDPSender: (host: string, port: number, message: string) => void;
  let globalObj: any;
  let sentMessages: Array<{ host: string; port: number; message: string }>;

  beforeEach(() => {
    globalObj = getGlobalObj();
    sentMessages = [];
    mockCDPSender = (host, port, message) => {
      sentMessages.push({ host, port, message });
    };
    setCDPMessageSender(mockCDPSender);
    clearPendingActions();
  });

  afterEach(() => {
    // Cleanup / 정리
    if (globalObj.__REDUX_DEVTOOLS_EXTENSION__) {
      delete globalObj.__REDUX_DEVTOOLS_EXTENSION__;
    }
    if (globalObj.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) {
      delete globalObj.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__;
    }
    if (globalObj.__REDUX_DEVTOOLS_EXTENSION_JS_POLYFILL__) {
      delete globalObj.__REDUX_DEVTOOLS_EXTENSION_JS_POLYFILL__;
    }
    if (globalObj.__REDUX_DEVTOOLS_EXTENSION_JSI_INJECTED__) {
      delete globalObj.__REDUX_DEVTOOLS_EXTENSION_JSI_INJECTED__;
    }
    clearPendingActions();
  });

  describe('installReduxDevToolsPolyfill', () => {
    test('should install extension on global object / global 객체에 extension 설치', () => {
      installReduxDevToolsPolyfill();

      expect(globalObj.__REDUX_DEVTOOLS_EXTENSION__).toBeDefined();
      expect(typeof globalObj.__REDUX_DEVTOOLS_EXTENSION__.connect).toBe('function');
    });

    test('should not install if already installed / 이미 설치되어 있으면 설치하지 않음', () => {
      installReduxDevToolsPolyfill();
      const firstInstall = globalObj.__REDUX_DEVTOOLS_EXTENSION__;

      installReduxDevToolsPolyfill();
      const secondInstall = globalObj.__REDUX_DEVTOOLS_EXTENSION__;

      expect(firstInstall).toBe(secondInstall);
    });
  });

  describe('createConnection', () => {
    test('should create connection with default name / 기본 이름으로 연결 생성', () => {
      installReduxDevToolsPolyfill();
      const extension = globalObj.__REDUX_DEVTOOLS_EXTENSION__;
      const connection = extension.connect();

      expect(connection).toBeDefined();
      expect(typeof connection.init).toBe('function');
      expect(typeof connection.send).toBe('function');
      expect(typeof connection.subscribe).toBe('function');
      expect(typeof connection.unsubscribe).toBe('function');
      expect(typeof connection.error).toBe('function');
    });

    test('should create connection with custom name / 사용자 정의 이름으로 연결 생성', () => {
      installReduxDevToolsPolyfill();
      const extension = globalObj.__REDUX_DEVTOOLS_EXTENSION__;
      const connection = extension.connect({ name: 'TestStore' });

      expect(connection).toBeDefined();
    });

    test('should queue actions before connection is ready / 연결 준비 전에 액션 대기열에 추가', () => {
      installReduxDevToolsPolyfill();
      // Reset connection state to ensure connection is not ready / 연결 상태를 리셋하여 연결이 준비되지 않았음을 보장
      resetConnectionState();
      setCDPMessageSender(() => {});

      const extension = globalObj.__REDUX_DEVTOOLS_EXTENSION__;
      const connection = extension.connect({ name: 'TestStore' });

      // Clear any existing pending actions / 기존 pending actions 제거
      clearPendingActions();

      // Send action before connection is ready / 연결 준비 전에 액션 전송
      connection.send({ type: 'TEST_ACTION' }, { count: 1 });

      const pending = getPendingActions();
      expect(pending.length).toBeGreaterThan(0);
      expect(pending[0].type).toBe('action');
      expect(pending[0].name).toBe('TestStore');
    });

    test('should flush pending actions when connection is ready / 연결 준비되면 대기 중인 액션 전송', () => {
      installReduxDevToolsPolyfill();
      const extension = globalObj.__REDUX_DEVTOOLS_EXTENSION__;
      const connection = extension.connect({ name: 'TestStore' });

      // Send action before connection / 연결 전에 액션 전송
      connection.send({ type: 'TEST_ACTION' }, { count: 1 });

      // Set connection ready / 연결 준비 설정
      setServerConnection('localhost', 8080);

      // Verify CDP message was sent / CDP 메시지가 전송되었는지 확인
      expect(sentMessages.length).toBeGreaterThan(0);
      const actionMessage = sentMessages.find((msg) => {
        const parsed = JSON.parse(msg.message);
        return parsed.params?.type === 'ACTION';
      });
      expect(actionMessage).toBeDefined();
    });
  });

  describe('action normalization', () => {
    test('should normalize null action to @@ZUSTAND/SET / null 액션을 @@ZUSTAND/SET로 정규화', () => {
      installReduxDevToolsPolyfill();
      setServerConnection('localhost', 8080);

      const extension = globalObj.__REDUX_DEVTOOLS_EXTENSION__;
      const connection = extension.connect({ name: 'TestStore' });

      connection.init({ count: 0 });
      connection.send(null, { count: 1 });

      // Verify action was normalized / 액션이 정규화되었는지 확인
      const actionMessage = sentMessages.find((msg) => {
        const parsed = JSON.parse(msg.message);
        return parsed.params?.type === 'ACTION';
      });

      expect(actionMessage).toBeDefined();
      if (actionMessage) {
        const parsed = JSON.parse(actionMessage.message);
        const action = parsed.params.action ? JSON.parse(parsed.params.action) : null;
        expect(action).toBeDefined();
        expect(action.type).toBe('@@ZUSTAND/SET');
      }
    });

    test('should normalize string action to object / 문자열 액션을 객체로 정규화', () => {
      installReduxDevToolsPolyfill();
      setServerConnection('localhost', 8080);

      const extension = globalObj.__REDUX_DEVTOOLS_EXTENSION__;
      const connection = extension.connect({ name: 'TestStore' });

      connection.init({ count: 0 });
      connection.send('INCREMENT' as any, { count: 1 });

      const actionMessage = sentMessages.find((msg) => {
        const parsed = JSON.parse(msg.message);
        return parsed.params?.type === 'ACTION';
      });

      expect(actionMessage).toBeDefined();
      if (actionMessage) {
        const parsed = JSON.parse(actionMessage.message);
        const action = parsed.params.action ? JSON.parse(parsed.params.action) : null;
        expect(action).toBeDefined();
        expect(action.type).toBe('INCREMENT');
      }
    });

    test('should preserve action object with type / type이 있는 액션 객체 보존', () => {
      installReduxDevToolsPolyfill();
      setServerConnection('localhost', 8080);

      const extension = globalObj.__REDUX_DEVTOOLS_EXTENSION__;
      const connection = extension.connect({ name: 'TestStore' });

      connection.init({ count: 0 });
      connection.send({ type: 'INCREMENT', payload: 1 }, { count: 1 });

      const actionMessage = sentMessages.find((msg) => {
        const parsed = JSON.parse(msg.message);
        return parsed.params?.type === 'ACTION';
      });

      expect(actionMessage).toBeDefined();
      if (actionMessage) {
        const parsed = JSON.parse(actionMessage.message);
        const action = parsed.params.action ? JSON.parse(parsed.params.action) : null;
        expect(action).toBeDefined();
        expect(action.type).toBe('INCREMENT');
        expect(action.payload).toBe(1);
      }
    });
  });

  describe('init', () => {
    test('should send INIT messages when connection is ready / 연결 준비되면 INIT 메시지 전송', () => {
      installReduxDevToolsPolyfill();
      setServerConnection('localhost', 8080);

      const extension = globalObj.__REDUX_DEVTOOLS_EXTENSION__;
      const connection = extension.connect({ name: 'TestStore' });

      connection.init({ count: 0 });

      // Verify INIT_INSTANCE and INIT messages were sent / INIT_INSTANCE와 INIT 메시지가 전송되었는지 확인
      const initInstanceMessage = sentMessages.find((msg) => {
        const parsed = JSON.parse(msg.message);
        return parsed.params?.type === 'INIT_INSTANCE';
      });
      const initMessage = sentMessages.find((msg) => {
        const parsed = JSON.parse(msg.message);
        return parsed.params?.type === 'INIT';
      });

      expect(initInstanceMessage).toBeDefined();
      expect(initMessage).toBeDefined();
    });

    test('should queue INIT when connection is not ready / 연결 준비되지 않았을 때 INIT 대기열에 추가', () => {
      installReduxDevToolsPolyfill();
      // Reset connection state to simulate not ready / 연결 상태를 리셋하여 준비되지 않은 상태 시뮬레이션
      resetConnectionState();
      setCDPMessageSender(() => {});

      const extension = globalObj.__REDUX_DEVTOOLS_EXTENSION__;
      const connection = extension.connect({ name: 'TestStore' });

      // Clear any existing pending actions / 기존 pending actions 제거
      clearPendingActions();

      // Set connection to not ready by not calling setServerConnection / setServerConnection을 호출하지 않아 연결 준비되지 않음
      connection.init({ count: 0 });

      const pending = getPendingActions();
      expect(pending.length).toBeGreaterThan(0);
      expect(pending[0].type).toBe('init');
    });
  });

  describe('instanceId', () => {
    test('should support string instanceId / string instanceId 지원', () => {
      installReduxDevToolsPolyfill();
      setServerConnection('localhost', 8080);

      const extension = globalObj.__REDUX_DEVTOOLS_EXTENSION__;
      const connection = extension.connect({ name: 'TestStore', instanceId: 'custom-id' });

      connection.init({ count: 0 });

      const initMessage = sentMessages.find((msg) => {
        const parsed = JSON.parse(msg.message);
        return parsed.params?.type === 'INIT';
      });

      expect(initMessage).toBeDefined();
      if (initMessage) {
        const parsed = JSON.parse(initMessage.message);
        expect(parsed.params.instanceId).toBe('custom-id');
      }
    });

    test('should support number instanceId / number instanceId 지원', () => {
      installReduxDevToolsPolyfill();
      setServerConnection('localhost', 8080);

      const extension = globalObj.__REDUX_DEVTOOLS_EXTENSION__;
      const connection = extension.connect({ name: 'TestStore', instanceId: 123 });

      connection.init({ count: 0 });

      const initMessage = sentMessages.find((msg) => {
        const parsed = JSON.parse(msg.message);
        return parsed.params?.type === 'INIT';
      });

      expect(initMessage).toBeDefined();
      if (initMessage) {
        const parsed = JSON.parse(initMessage.message);
        expect(parsed.params.instanceId).toBe(123);
      }
    });
  });

  describe('getPendingActions', () => {
    test('should return a copy of pending actions / pending actions의 복사본 반환', () => {
      installReduxDevToolsPolyfill();
      resetConnectionState();
      setCDPMessageSender(() => {});

      const extension = globalObj.__REDUX_DEVTOOLS_EXTENSION__;
      const connection = extension.connect({ name: 'TestStore' });
      connection.send({ type: 'TEST' }, {});

      const pending = getPendingActions();
      expect(pending.length).toBe(1);
      pending.length = 0;
      expect(getPendingActions().length).toBe(1);
    });
  });

  describe('connection.subscribe and connection.error', () => {
    test('subscribe should return unsubscribe function / subscribe는 unsubscribe 함수 반환', () => {
      installReduxDevToolsPolyfill();
      const extension = globalObj.__REDUX_DEVTOOLS_EXTENSION__;
      const connection = extension.connect({ name: 'TestStore' });

      const unsubscribe = connection.subscribe(() => {});
      expect(typeof unsubscribe).toBe('function');
      expect(() => unsubscribe()).not.toThrow();
    });

    test('error should send ERROR message when connected / 연결 시 error는 ERROR 메시지 전송', () => {
      installReduxDevToolsPolyfill();
      setServerConnection('localhost', 8080);

      const extension = globalObj.__REDUX_DEVTOOLS_EXTENSION__;
      const connection = extension.connect({ name: 'TestStore' });
      connection.init({});
      connection.error('Test error');

      const errorMessage = sentMessages.find((msg) => {
        const parsed = JSON.parse(msg.message);
        return parsed.params?.type === 'ERROR';
      });
      expect(errorMessage).toBeDefined();
      if (errorMessage) {
        const parsed = JSON.parse(errorMessage.message);
        expect(parsed.params.error).toBe('Test error');
      }
    });
  });

  describe('notifyExtensionReady', () => {
    test('should re-send INIT for all active connections when connected / 연결 시 활성 연결에 INIT 재전송', () => {
      installReduxDevToolsPolyfill();
      setServerConnection('localhost', 8080);

      const extension = globalObj.__REDUX_DEVTOOLS_EXTENSION__;
      const connection = extension.connect({ name: 'NotifyTest' });
      connection.init({ count: 42 });

      sentMessages.length = 0;
      extension.notifyExtensionReady();

      const initMessages = sentMessages.filter((msg) => {
        const parsed = JSON.parse(msg.message);
        return parsed.params?.type === 'INIT' && parsed.params?.payload === '{"count":42}';
      });
      expect(initMessages.length).toBeGreaterThan(0);
    });

    test('should do nothing when not connected / 미연결 시 아무 작업 안 함', () => {
      installReduxDevToolsPolyfill();
      resetConnectionState();
      setCDPMessageSender(() => {});

      const extension = globalObj.__REDUX_DEVTOOLS_EXTENSION__;
      const connection = extension.connect({ name: 'NotifyTest' });
      connection.init({ count: 0 });

      sentMessages.length = 0;
      extension.notifyExtensionReady();
      expect(sentMessages.length).toBe(0);
    });
  });

  describe('replaceWithJSIVersion', () => {
    test('should replace global extension with JSI extension / global extension을 JSI extension으로 교체', () => {
      installReduxDevToolsPolyfill();
      const jsiExtension = {
        connect: () => ({}),
        __REDUX_DEVTOOLS_EXTENSION_COMPOSE__: () => () => {},
      };

      replaceWithJSIVersion(jsiExtension);

      expect(globalObj.__REDUX_DEVTOOLS_EXTENSION__).toBe(jsiExtension);
      expect(globalObj.__REDUX_DEVTOOLS_EXTENSION_JSI_INJECTED__).toBe(true);
      expect(globalObj.__REDUX_DEVTOOLS_EXTENSION_JS_POLYFILL__).toBeUndefined();
    });

    test('should replace compose when JSI provides it / JSI가 compose 제공 시 교체', () => {
      installReduxDevToolsPolyfill();
      const jsiCompose = () => () => () => {};
      const jsiExtension = {
        connect: () => ({}),
        __REDUX_DEVTOOLS_EXTENSION_COMPOSE__: jsiCompose,
      };

      replaceWithJSIVersion(jsiExtension);

      expect(globalObj.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__).toBe(jsiCompose);
    });
  });

  describe('installReduxDevToolsPolyfill skip paths', () => {
    test('should skip install when JSI version already injected / JSI 버전 이미 주입 시 설치 건너뜀', () => {
      installReduxDevToolsPolyfill();
      globalObj.__REDUX_DEVTOOLS_EXTENSION_JSI_INJECTED__ = true;
      globalObj.__REDUX_DEVTOOLS_EXTENSION__ = null;

      installReduxDevToolsPolyfill();

      expect(globalObj.__REDUX_DEVTOOLS_EXTENSION__).toBeNull();
    });
  });

  describe('composeWithDevTools', () => {
    test('should return enhancer when called with options / 옵션으로 호출 시 enhancer 반환', () => {
      installReduxDevToolsPolyfill();
      const compose = globalObj.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ ?? composeWithDevTools;
      const enhancer = compose({ name: 'ComposedStore' })();

      expect(typeof enhancer).toBe('function');
    });

    test('should compose enhancers and connect store to DevTools / enhancer 합성 및 store DevTools 연결', () => {
      installReduxDevToolsPolyfill();
      setServerConnection('localhost', 8080);

      const compose = globalObj.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ ?? composeWithDevTools;
      const reducer = (state: number = 0, action: { type: string }) =>
        action.type === 'INC' ? state + 1 : state;
      const createStore = (r: typeof reducer, preloaded: number) => {
        let state = preloaded ?? 0;
        const listeners: Array<() => void> = [];
        return {
          getState: () => state,
          dispatch: (action: { type: string }) => {
            state = r(state, action);
            listeners.forEach((l) => l());
            return action;
          },
          subscribe: (l: () => void) => {
            listeners.push(l);
            return () => {
              const i = listeners.indexOf(l);
              if (i >= 0) listeners.splice(i, 1);
            };
          },
          replaceReducer: () => {},
        };
      };

      const storeFactory = compose({ name: 'ComposedStore' })()(createStore);
      const store = storeFactory(reducer, 0);

      expect(store).toBeDefined();
      expect(store.getState()).toBe(0);

      store.dispatch({ type: 'INC' });

      const actionMessage = sentMessages.find((msg) => {
        const parsed = JSON.parse(msg.message);
        return parsed.params?.type === 'ACTION';
      });
      expect(actionMessage).toBeDefined();
    });

    test('should work when called with enhancers only / enhancer만으로 호출 시 동작', () => {
      installReduxDevToolsPolyfill();
      const compose = globalObj.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ ?? composeWithDevTools;
      const enhancer = compose()();

      expect(typeof enhancer).toBe('function');
    });
  });

  describe('Redux Toolkit enhancer (function form)', () => {
    test('should create store and connect to DevTools when extension called as function / extension을 함수로 호출 시 store 생성 및 DevTools 연결', () => {
      installReduxDevToolsPolyfill();
      setServerConnection('localhost', 8080);

      const extension = globalObj.__REDUX_DEVTOOLS_EXTENSION__;
      const reducer = (state: number = 0) => state;
      const createStore = (r: typeof reducer, preloaded: number) => ({
        getState: () => preloaded ?? 0,
        dispatch: () => ({}),
        subscribe: () => () => {},
        replaceReducer: () => {},
      });

      const enhancer = extension({ name: 'RTKStore' });
      const createStoreWithDevTools = enhancer(createStore);
      const store = createStoreWithDevTools(reducer, 0);

      expect(store).toBeDefined();
      const initMessage = sentMessages.find((msg) => {
        const parsed = JSON.parse(msg.message);
        return parsed.params?.type === 'INIT';
      });
      expect(initMessage).toBeDefined();
    });
  });

  describe('flush pending action normalization', () => {
    test('should normalize pending action with null to @@ZUSTAND/SET when flushed / flush 시 null pending 액션을 @@ZUSTAND/SET로 정규화', () => {
      installReduxDevToolsPolyfill();
      resetConnectionState();
      setCDPMessageSender(mockCDPSender);

      const extension = globalObj.__REDUX_DEVTOOLS_EXTENSION__;
      const connection = extension.connect({ name: 'FlushTest' });
      connection.send(null, { x: 1 });
      expect(getPendingActions().length).toBe(1);

      setServerConnection('localhost', 8080);

      const actionMessage = sentMessages.find((msg) => {
        const parsed = JSON.parse(msg.message);
        return parsed.params?.type === 'ACTION';
      });
      expect(actionMessage).toBeDefined();
      if (actionMessage) {
        const parsed = JSON.parse(actionMessage.message);
        const action = parsed.params.action ? JSON.parse(parsed.params.action) : null;
        expect(action?.type).toBe('@@ZUSTAND/SET');
      }
    });

    test('should normalize pending action object without type when flushed / flush 시 type 없는 액션 객체 정규화', () => {
      installReduxDevToolsPolyfill();
      resetConnectionState();
      setCDPMessageSender(mockCDPSender);

      const extension = globalObj.__REDUX_DEVTOOLS_EXTENSION__;
      const connection = extension.connect({ name: 'FlushTest' });
      connection.send({ payload: 1 } as any, { x: 1 });
      setServerConnection('localhost', 8080);

      const actionMessage = sentMessages.find((msg) => {
        const parsed = JSON.parse(msg.message);
        return parsed.params?.type === 'ACTION';
      });
      expect(actionMessage).toBeDefined();
      if (actionMessage) {
        const parsed = JSON.parse(actionMessage.message);
        const action = parsed.params.action ? JSON.parse(parsed.params.action) : null;
        expect(action?.type).toBe('@@ZUSTAND/SET');
        expect(action?.payload).toBe(1);
      }
    });
  });
});
