const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const {
  withChromeRemoteDevToolsRedux,
} = require('@ohah/chrome-remote-devtools-inspector-react-native/metro');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = getDefaultConfig(__dirname);

// Merge with default config / 기본 config와 병합
const mergedConfig = mergeConfig(getDefaultConfig(__dirname), config);

// Apply Chrome Remote DevTools Redux DevTools Extension polyfill / Chrome Remote DevTools Redux DevTools Extension polyfill 적용
// This injects __REDUX_DEVTOOLS_EXTENSION__ before index.js runs / 이것은 index.js가 실행되기 전에 __REDUX_DEVTOOLS_EXTENSION__을 주입합니다
// Also adds resolver.blockList for target/ (Rust cargo output) to avoid Metro ENOENT watch errors / target/(Rust cargo 출력)용 resolver.blockList 추가로 Metro ENOENT watch 오류 방지
module.exports = withChromeRemoteDevToolsRedux(mergedConfig);
