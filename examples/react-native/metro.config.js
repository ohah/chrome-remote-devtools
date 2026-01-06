const { getMetroConfig } = require('@craby/devkit');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = getMetroConfig(__dirname);

// Merge with default config and add polyfills / 기본 config와 병합하고 polyfills 추가
const mergedConfig = mergeConfig(getDefaultConfig(__dirname), config);

// Store original getPolyfills to avoid infinite recursion / 무한 재귀를 피하기 위해 원본 getPolyfills 저장
const originalGetPolyfills = mergedConfig.serializer?.getPolyfills;

// Add Redux DevTools Extension polyfill / Redux DevTools Extension polyfill 추가
// This ensures __REDUX_DEVTOOLS_EXTENSION__ is available before any store is created / 이것은 store가 생성되기 전에 __REDUX_DEVTOOLS_EXTENSION__가 사용 가능하도록 보장합니다
mergedConfig.serializer = {
  ...mergedConfig.serializer,
  getPolyfills() {
    // Call original getPolyfills if it exists, otherwise return empty array / 원본 getPolyfills가 있으면 호출, 없으면 빈 배열 반환
    const defaultPolyfills = originalGetPolyfills ? originalGetPolyfills() : [];
    return [
      // Redux DevTools Extension polyfill (must be first) / Redux DevTools Extension polyfill (가장 먼저 실행되어야 함)
      path.resolve(
        __dirname,
        '../../packages/react-native-inspector/polyfills/redux-devtools-extension.js'
      ),
      ...defaultPolyfills,
    ];
  },
};

module.exports = mergedConfig;
