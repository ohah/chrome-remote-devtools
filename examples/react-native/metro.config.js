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

// Merge with default config / 기본 config와 병합
// Note: Redux DevTools Extension is now injected via JSI, so Metro polyfill is not needed / 참고: Redux DevTools Extension은 이제 JSI를 통해 주입되므로 Metro polyfill이 필요하지 않습니다
const mergedConfig = mergeConfig(getDefaultConfig(__dirname), config);

module.exports = mergedConfig;
