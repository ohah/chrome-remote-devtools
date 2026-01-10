// Redux DevTools Runtime for React Native / React Native용 Redux DevTools 런타임
// Uses @redux-devtools/remote to connect to DevTools server / DevTools 서버에 연결하기 위해 @redux-devtools/remote 사용
// Gets server info from our library instead of React Native core / React Native 코어 대신 우리 라이브러리에서 서버 정보 가져오기

import { Platform } from 'react-native';
import type { devToolsEnhancer, composeWithDevTools } from '@redux-devtools/remote';
import { getServerInfo } from './server-info';

// @ts-expect-error - Symbol.asyncIterator is not defined in the global scope, but required by the redux-devtools/remote package.
Symbol.asyncIterator ??= Symbol.for('Symbol.asyncIterator');

type StoreEnhancer = ReturnType<typeof devToolsEnhancer>;
type ComposeWithDevTools = ReturnType<typeof composeWithDevTools>;

/**
 * Options for configuring Redux DevTools / Redux DevTools 설정 옵션
 */
export interface ReduxDevToolsOptions {
  /**
   * Maximum number of actions to be stored in the history tree.
   * The oldest actions are removed once maxAge is reached.
   * This is critical for performance.
   *
   * @default 50
   */
  maxAge?: number;
  /**
   * Store name / 스토어 이름
   * @default Device ID
   */
  name?: string;
}

const getDeviceId = (): string => {
  if (Platform.OS === 'android') {
    return `${Platform.constants.Manufacturer} ${Platform.constants.Model}`;
  }

  if (Platform.OS === 'ios') {
    return `${Platform.constants.systemName} ${Platform.constants.osVersion}`;
  }

  throw new Error('Unsupported platform');
};

const getHostname = (): string => {
  const serverInfo = getServerInfo();
  if (serverInfo) {
    return serverInfo.host;
  }

  // Fallback to localhost if server info is not set / 서버 정보가 설정되지 않았으면 localhost로 폴백
  return 'localhost';
};

const getPort = (): number => {
  const serverInfo = getServerInfo();
  if (serverInfo) {
    return serverInfo.port;
  }

  // Default port / 기본 포트
  return 8080;
};

/**
 * Compose Redux store with DevTools / DevTools와 함께 Redux store 합성
 * @param options Configuration options / 설정 옵션
 * @returns Composed enhancer / 합성된 enhancer
 */
export const composeWithReduxDevTools = (
  options: ReduxDevToolsOptions = {}
): ComposeWithDevTools => {
  const hostname = getHostname();
  const port = getPort();

  return require('@redux-devtools/remote').composeWithDevTools({
    name: options.name || getDeviceId(),
    hostname,
    port,
    secure: false,
    realtime: true,
    maxAge: options.maxAge ?? 50,
  });
};

/**
 * Create Redux DevTools store enhancer / Redux DevTools store enhancer 생성
 * @param options Configuration options / 설정 옵션
 * @returns Store enhancer / Store enhancer
 */
export const reduxDevToolsEnhancer = (options: ReduxDevToolsOptions = {}): StoreEnhancer => {
  return require('@redux-devtools/remote').devToolsEnhancer({
    name: options.name || getDeviceId(),
    hostname: getHostname(),
    port: getPort(),
    secure: false,
    realtime: true,
    maxAge: options.maxAge ?? 50,
  });
};
