const { getMetroConfig } = require('@craby/devkit');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const {
  withChromeRemoteDevToolsRedux,
} = require('@ohah/chrome-remote-devtools-react-native/metro');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = getMetroConfig(__dirname);

// Merge with default config / 기본 config와 병합
const mergedConfig = mergeConfig(getDefaultConfig(__dirname), config);

// Apply Chrome Remote DevTools Redux DevTools Extension polyfill / Chrome Remote DevTools Redux DevTools Extension polyfill 적용
// This injects __REDUX_DEVTOOLS_EXTENSION__ before index.js runs / 이것은 index.js가 실행되기 전에 __REDUX_DEVTOOLS_EXTENSION__을 주입합니다
module.exports = withChromeRemoteDevToolsRedux(mergedConfig);
