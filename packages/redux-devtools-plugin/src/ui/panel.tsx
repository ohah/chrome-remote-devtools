// Redux DevTools panel component / Redux DevTools 패널 컴포넌트
// Uses @redux-devtools/app to display Redux DevTools UI / Redux DevTools UI를 표시하기 위해 @redux-devtools/app 사용
// Receives CDP messages from ReduxExtensionBridge and converts them to app format / ReduxExtensionBridge에서 CDP 메시지를 받아서 앱 형식으로 변환

import { Component } from 'react';
import { Provider } from 'react-redux';
import { Store } from 'redux';
import { Persistor } from 'redux-persist';
import { PersistGate } from 'redux-persist/integration/react';
import { App, StoreState, StoreAction } from '@redux-devtools/app';
import configureStore from './store';
import { createCDPMessageHandler, type CDPMessageHandler } from './cdp-message-handler';

/**
 * Options for Redux DevTools panel / Redux DevTools 패널 옵션
 */
export interface ReduxDevToolsPanelOptions {
  /** Server hostname (deprecated, not used with CDP) / 서버 호스트명 (사용되지 않음, CDP와 함께 사용하지 않음) */
  hostname?: string;
  /** Server port (deprecated, not used with CDP) / 서버 포트 (사용되지 않음, CDP와 함께 사용하지 않음) */
  port?: number;
  /** Use secure connection (deprecated, not used with CDP) / 보안 연결 사용 (사용되지 않음, CDP와 함께 사용하지 않음) */
  secure?: boolean;
}

/**
 * Redux DevTools panel component / Redux DevTools 패널 컴포넌트
 * Receives CDP messages from parent window (ReduxExtensionBridge) / 부모 윈도우(ReduxExtensionBridge)에서 CDP 메시지 수신
 */
export class ReduxDevToolsPanel extends Component<ReduxDevToolsPanelOptions> {
  store?: Store<StoreState, StoreAction>;
  persistor?: Persistor;
  private cdpMessageHandler?: CDPMessageHandler;

  UNSAFE_componentWillMount() {
    // Initialize store without WebSocket settings / WebSocket 설정 없이 store 초기화
    // CDP messages will be received via postMessage / CDP 메시지는 postMessage를 통해 수신됨
    const { store, persistor } = configureStore((store: Store<StoreState, StoreAction>) => {
      // Setup CDP message handler instead of WebSocket / WebSocket 대신 CDP 메시지 핸들러 설정
      this.cdpMessageHandler = createCDPMessageHandler(store);
    });
    this.store = store;
    this.persistor = persistor;
  }

  componentWillUnmount() {
    // Cleanup CDP message handler / CDP 메시지 핸들러 정리
    if (this.cdpMessageHandler) {
      this.cdpMessageHandler.cleanup();
      this.cdpMessageHandler = undefined;
    }
  }

  render() {
    if (!this.store || !this.persistor) {
      return null;
    }

    return (
      <Provider store={this.store}>
        <PersistGate loading={null} persistor={this.persistor}>
          <App />
        </PersistGate>
      </Provider>
    );
  }
}
