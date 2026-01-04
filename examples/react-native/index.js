/**
 * @format
 */

// Setup Redux DevTools Extension FIRST, before any stores are imported / store import 전에 먼저 Redux DevTools Extension 설정
// This is critical because Zustand/Redux stores check for extension during module initialization / 이것은 중요합니다. Zustand/Redux store가 모듈 초기화 중에 extension을 확인하기 때문입니다
import { setupReduxDevToolsExtension } from '@ohah/chrome-remote-devtools-react-native';
console.log('[index.js] Setting up Redux DevTools Extension at entry point...');
setupReduxDevToolsExtension('localhost', 8080);

import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
